/**
 * @requirement REQ-066 — Inventory invariant via orders-page completion (#277)
 *
 * AC7b — Orders-page path. Same shape as AC7a but advances the order
 * through the `/dashboard/orders` admin UI instead of the kitchen-display.
 * Both routes share the same `updateOrderStatusAction` chokepoint at the
 * action layer; this spec proves the UI surface doesn't introduce its
 * own bug shortcutting the chokepoint.
 *
 * Negative invariants on intermediate transitions (preparing, ready)
 * remain the load-bearing assertion: inventory must NOT decrement until
 * `OrderService.completeOrder` fires.
 *
 * @requirement REQ-066
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { superAdminTest, isAuthenticated } from './kitchen/helpers';
import { evidenceShot } from './helpers/evidence';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

interface SeedHandle {
  orderId: string;
  orderNumber: string;
  menuItemId: string;
  inventoryId: string;
  /**
   * True stock at seed time — for trackByLocation rows this is the sum
   * of `locations[*].currentStock`, since the post-save hook recomputes
   * the aggregate `currentStock` from that array.
   */
  baselineStock: number;
  trackByLocation: boolean;
}

function computeStockFromInventory(
  inv: {
    currentStock?: number;
    trackByLocation?: boolean;
    locations?: Array<{ currentStock: number }>;
  } | null
): number {
  if (!inv) return 0;
  if (inv.trackByLocation && inv.locations && inv.locations.length > 0) {
    return inv.locations.reduce((sum, l) => sum + (l.currentStock || 0), 0);
  }
  return inv.currentStock || 0;
}

async function seedOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const menuItem = await db
      .collection('menuitems')
      .findOne({ trackInventory: true });
    if (!menuItem)
      throw new Error('REQ-066 spec setup: no trackInventory menu item');
    const sourceInventory = await db
      .collection('inventories')
      .findOne({ menuItemId: menuItem._id });
    if (!sourceInventory)
      throw new Error('REQ-066 spec setup: linked inventory missing');

    const orderNumber = `WGE2O${Date.now()}`.slice(0, 12);
    const now = new Date();
    const { _id: _sourceMenuItemId, ...menuItemSeed } = menuItem;
    const isolatedMenuItem = await db.collection('menuitems').insertOne({
      ...menuItemSeed,
      name: `E2E inventory order ${orderNumber}`,
      createdAt: now,
      updatedAt: now,
    });
    const { _id: _sourceInventoryId, ...inventorySeed } = sourceInventory;
    const isolatedInventory = await db.collection('inventories').insertOne({
      ...inventorySeed,
      menuItemId: isolatedMenuItem.insertedId,
      createdAt: now,
      updatedAt: now,
    });
    const subtotal = menuItem.price;
    const seedResult = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
      items: [
        {
          menuItemId: isolatedMenuItem.insertedId,
          name: `E2E inventory order ${orderNumber}`,
          price: menuItem.price,
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          subtotal,
          costPerUnit: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
          customizations: [],
        },
      ],
      subtotal,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: subtotal,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: `E2E-CASH-${Date.now()}`,
      paidAt: now,
      // Mongoose-required on Order — see AC7a spec for context.
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'confirmed', timestamp: now, note: 'E2E seed' },
      ],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });

    return {
      orderId: String(seedResult.insertedId),
      orderNumber,
      menuItemId: String(isolatedMenuItem.insertedId),
      inventoryId: String(isolatedInventory.insertedId),
      baselineStock: computeStockFromInventory(sourceInventory as any),
      trackByLocation: Boolean(
        (sourceInventory as { trackByLocation?: boolean }).trackByLocation
      ),
    };
  } finally {
    await client.close();
  }
}

async function readInventoryStock(inventoryId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const inv = await client
      .db(dbName)
      .collection('inventories')
      .findOne({ _id: new ObjectId(inventoryId) });
    return computeStockFromInventory(inv as any);
  } finally {
    await client.close();
  }
}

async function readOrderStatus(orderId: string): Promise<string | null> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const o = await client
      .db(dbName)
      .collection('orders')
      .findOne({ _id: new ObjectId(orderId) }, { projection: { status: 1 } });
    return (o?.status as string) ?? null;
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle): Promise<void> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('orders')
      .deleteOne({ _id: new ObjectId(handle.orderId) });
    await db
      .collection('stockmovements')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
    await db
      .collection('inventories')
      .deleteOne({ _id: new ObjectId(handle.inventoryId) });
    await db
      .collection('menuitems')
      .deleteOne({ _id: new ObjectId(handle.menuItemId) });
  } finally {
    await client.close();
  }
}

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI) throw new Error('Expected a super-admin session in CI');
  skip(true, 'super-admin session unavailable (local only)');
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-066 inventory invariant via orders-page @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC7b — orders-page lifecycle preserves inventory until completed, then decrements by 1',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));

        handle = await seedOrder();

        const baseline = await readInventoryStock(handle.inventoryId);
        expect(baseline).toBe(handle.baselineStock);

        // Pre-seed cookie consent so the REQ-065 bottom-fixed banner
        // doesn't intercept clicks on action buttons near the viewport edge.
        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });

        // Open orders queue.
        await page.goto('/dashboard/orders');
        await page.waitForLoadState('networkidle');
        const cookieBanner = page.getByTestId('cookie-consent-banner');
        if (await cookieBanner.isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /got it/i }).click();
          await expect(cookieBanner).toHaveCount(0);
        }

        // Anchor on the per-order reconcile checkbox — its aria-label is
        // unique per order ("Mark order WGE2O... as reconciled"). Walk up
        // to the card container that holds the action buttons.
        const anchorAriaLabel = `Mark order ${handle.orderNumber} as reconciled`;

        async function clickAndAwaitStatus(
          buttonName: RegExp,
          expectedNext: string
        ) {
          const anchor = page.getByRole('checkbox', { name: anchorAriaLabel });
          await expect(anchor).toBeVisible({ timeout: 15000 });
          const c = anchor.locator(
            'xpath=ancestor::*[descendant::button[contains(., "Start Preparing") or contains(., "Mark Ready") or contains(., "Complete")]][1]'
          );
          await c.getByRole('button', { name: buttonName }).click();
          await expect
            .poll(() => readOrderStatus(handle!.orderId), { timeout: 15000 })
            .toBe(expectedNext);
        }

        // confirmed → preparing
        await clickAndAwaitStatus(/start preparing/i, 'preparing');
        expect(await readInventoryStock(handle.inventoryId)).toBe(
          handle.baselineStock
        );
        await page.reload();
        await page.waitForLoadState('networkidle');

        // preparing → ready
        await clickAndAwaitStatus(/mark ready/i, 'ready');
        expect(await readInventoryStock(handle.inventoryId)).toBe(
          handle.baselineStock
        );
        await page.reload();
        await page.waitForLoadState('networkidle');

        // ready → completed (chokepoint)
        await clickAndAwaitStatus(/^complete$/i, 'completed');

        await expect
          .poll(async () => readInventoryStock(handle!.inventoryId), {
            timeout: 10000,
          })
          .toBe(handle.baselineStock - 1);

        await evidenceShot(
          page,
          'REQ-066',
          7,
          'inventory-decremented-on-orders-page-complete'
        );
      }
    );
  }
);
