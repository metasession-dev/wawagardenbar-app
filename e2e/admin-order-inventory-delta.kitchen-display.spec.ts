/**
 * @requirement REQ-066 — Inventory invariant via kitchen-display completion (#277)
 *
 * AC7a — Kitchen-display path. Proves the canonical chokepoint
 * (`OrderService.completeOrder`) is the ONLY mutation site for inventory:
 *   - inventory UNCHANGED at preparing
 *   - inventory UNCHANGED at ready
 *   - inventory DECREMENTED at completed (the kitchen-display "Complete Order"
 *     button fires the deduction)
 *
 * Seeds an order via direct Mongo write (same DB-seed shape as
 * `e2e/support-ticket-staff-flow.spec.ts`); advances through the lifecycle
 * via the kitchen-display order-card buttons; reads UAT inventory between
 * each step.
 *
 * Cleanup in afterEach: deletes the seeded order + stock-movement rows
 * created by the deduction, and restores the inventory's currentStock to
 * the captured baseline so the spec leaves UAT in a clean state.
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
  inventoryId: string;
  /**
   * The TRUE baseline at seed time. For trackByLocation inventory rows,
   * the aggregate `currentStock` field is recomputed from `locations[]`
   * on every Mongoose `save()` (post-save hook), so it can drift stale
   * after direct collection-level writes; the load-bearing value is the
   * sum of `locations[*].currentStock`.
   */
  baselineStock: number;
  /**
   * True when Gulder (and other location-tracked items) — controls
   * whether the deduction lands in `locations[0]` or the aggregate.
   */
  trackByLocation: boolean;
  menuItemId: string;
  unitPrice: number;
  menuItemName: string;
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

/**
 * Pick a menu item with trackInventory + a linked Inventory row, snapshot
 * its current stock, and seed a one-item order. Returns the handles the
 * spec needs to interact + the cleanup needs to restore.
 */
async function seedOrder(
  orderStartStatus: 'confirmed' | 'preparing'
): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    const menuItem = await db
      .collection('menuitems')
      .findOne({ trackInventory: true });
    if (!menuItem) {
      throw new Error(
        'No menu item with trackInventory:true found on UAT — REQ-066 spec needs one for the linkage assertion'
      );
    }
    const inventory = await db
      .collection('inventories')
      .findOne({ menuItemId: menuItem._id });
    if (!inventory) {
      throw new Error(
        `Menu item ${menuItem._id} has trackInventory but no linked Inventory row — REQ-066 spec setup gap`
      );
    }

    const orderNumber = `WGE2E${Date.now()}`.slice(0, 12);
    const subtotal = menuItem.price;
    const now = new Date();
    const seedResult = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status: orderStartStatus,
      items: [
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
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
      // Mongoose-required on Order. Without it, `order.save()` in
      // `updateOrderStatusAction` rejects with a ValidationError and the
      // server action returns success: false (silently — the toast surfaces it
      // but the test was not asserting against the toast).
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      statusHistory: [
        { status: orderStartStatus, timestamp: now, note: 'E2E seed' },
      ],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });

    return {
      orderId: String(seedResult.insertedId),
      orderNumber,
      inventoryId: String(inventory._id),
      baselineStock: computeStockFromInventory(inventory as any),
      trackByLocation: Boolean(
        (inventory as { trackByLocation?: boolean }).trackByLocation
      ),
      menuItemId: String(menuItem._id),
      unitPrice: menuItem.price,
      menuItemName: menuItem.name,
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
    // Sum the deductions we caused BEFORE deleting them, so we can
    // restore exactly that amount (sign-flipped) back to the inventory.
    const movs = await db
      .collection('stockmovements')
      .find({ orderId: new ObjectId(handle.orderId) })
      .toArray();
    const totalDeducted = movs.reduce(
      (s, m) =>
        s + Math.abs((m as unknown as { quantity: number }).quantity || 0),
      0
    );
    await db
      .collection('orders')
      .deleteOne({ _id: new ObjectId(handle.orderId) });
    await db
      .collection('stockmovements')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
    if (totalDeducted > 0) {
      // Inventory rows with `trackByLocation:true` recompute the aggregate
      // `currentStock` from `locations[]` on every Mongoose save (post-save
      // hook). Writing to the aggregate alone gets clobbered next save, so
      // for location-tracked rows we restore into `locations.0`.
      const update = handle.trackByLocation
        ? { $inc: { 'locations.0.currentStock': totalDeducted } }
        : { $inc: { currentStock: totalDeducted } };
      await db
        .collection('inventories')
        .updateOne({ _id: new ObjectId(handle.inventoryId) }, update);
    }
  } finally {
    await client.close();
  }
}

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI) {
    throw new Error(
      'Expected a super-admin session in CI but none was present'
    );
  }
  skip(true, 'super-admin session unavailable (local only)');
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-066 inventory invariant via kitchen-display @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC7a — kitchen-display lifecycle preserves inventory until completed, then decrements by 1',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));

        handle = await seedOrder('confirmed');

        // Sanity: pre-flight baseline.
        const baseline = await readInventoryStock(handle.inventoryId);
        expect(baseline).toBe(handle.baselineStock);

        // Pre-seed cookie consent so the bottom-fixed banner from
        // REQ-065 doesn't intercept clicks on buttons rendered near
        // the viewport edge. `addInitScript` runs before any page
        // script, so the banner's useEffect sees consent already set
        // and skips rendering.
        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });

        // Open kitchen-display.
        await page.goto('/dashboard/kitchen-display');
        await page.waitForLoadState('networkidle');
        // Belt-and-braces: if the banner did render (e.g. addInitScript
        // raced with page bootstrap), click it away before continuing.
        const cookieBanner = page.getByTestId('cookie-consent-banner');
        if (await cookieBanner.isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /got it/i }).click();
          await expect(cookieBanner).toHaveCount(0);
        }

        // The kitchen-order-card renders the orderNumber inside a
        // unique `<h2>`. Anchor on that, then walk up to the Card
        // container that holds the action buttons.
        const heading = page.getByRole('heading', {
          name: handle.orderNumber,
          level: 2,
        });
        await expect(heading).toBeVisible({ timeout: 15000 });
        const card = heading.locator(
          'xpath=ancestor::*[descendant::button[contains(., "Start Preparing") or contains(., "Mark Ready") or contains(., "Complete Order")]][1]'
        );

        async function clickAndAwaitStatus(
          buttonText: string,
          expectedNext: string
        ) {
          // Locate via Playwright locator scoped to our order's card.
          const h = page.getByRole('heading', {
            name: handle!.orderNumber,
            level: 2,
          });
          await expect(h).toBeVisible({ timeout: 15000 });
          const card = h.locator(
            'xpath=ancestor::div[contains(@class, "border-2")][1]'
          );
          const btn = card.getByRole('button', {
            name: new RegExp(buttonText, 'i'),
          });
          await expect(btn).toBeVisible({ timeout: 15000 });
          await expect(btn).toBeEnabled();
          // Real click — Playwright handles auto-scroll + waits for actionability.
          await btn.click();
          await expect
            .poll(() => readOrderStatus(handle!.orderId), { timeout: 20000 })
            .toBe(expectedNext);
        }

        // confirmed → preparing
        await clickAndAwaitStatus('Start Preparing', 'preparing');
        // NEGATIVE INVARIANT — preparing must not deduct.
        expect(await readInventoryStock(handle.inventoryId)).toBe(
          handle.baselineStock
        );
        await page.reload();
        await page.waitForLoadState('networkidle');

        // preparing → ready
        await clickAndAwaitStatus('Mark Ready', 'ready');
        // NEGATIVE INVARIANT — ready must not deduct either.
        expect(await readInventoryStock(handle.inventoryId)).toBe(
          handle.baselineStock
        );
        await page.reload();
        await page.waitForLoadState('networkidle');

        // ready → completed: this is the canonical site.
        await clickAndAwaitStatus('Complete Order', 'completed');
        // Unused reference to the static `card` locator (set above) is intentional:
        // kept for readability of the lifecycle; the helper does the real work.
        void card;

        // Poll for the deduction to land (the route revalidates async).
        await expect
          .poll(async () => readInventoryStock(handle!.inventoryId), {
            timeout: 10000,
          })
          .toBe(handle.baselineStock - 1);

        await evidenceShot(
          page,
          'REQ-066',
          7,
          'inventory-decremented-on-kitchen-complete'
        );
      }
    );
  }
);
