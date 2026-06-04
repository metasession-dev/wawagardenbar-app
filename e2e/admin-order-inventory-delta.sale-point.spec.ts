/**
 * @requirement REQ-066 — AC8 inventory deduction routes to `defaultSalesLocation`
 *
 * Pins the fix for #277's underlying bug: when locations[0] (storeroom) is
 * empty but other locations have stock, the deduction must land on the
 * sale-point location — not be silently clamped at zero on locations[0].
 *
 * Seeds an order whose linked inventory item is force-mutated into the
 * Desperados-shape (locations[0]=0, locations[1] >= 1, defaultSalesLocation =
 * locations[1].location). Advances `confirmed → preparing → ready →
 * completed` via the kitchen-display. Asserts:
 *   1. locations[1].currentStock dropped by exactly 1.
 *   2. locations[0].currentStock unchanged.
 *   3. Aggregate currentStock dropped by 1 (post-save hook sum).
 *
 * Cleanup restores all mutated fields on the inventory row.
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
  /** Captured BEFORE we force-mutated locations + defaultSalesLocation. */
  originalLocations: Array<{ location: string; currentStock: number }>;
  originalSalePointLocation: string | undefined;
  /** The forced-empty location (where we set currentStock to 0). */
  emptyLocationCode: string;
  /** The sale-point location (where we expect the deduction to land). */
  defaultSalesLocationCode: string;
  /** Pre-deduction sum across locations. */
  preDeductionAggregate: number;
}

async function seedOrderWithForcedEmptyLocation(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // Find an inventory with trackByLocation + at least 2 locations + total
    // stock >= 2 (so we can force one empty and still have stock to deduct).
    const candidate = await db.collection('inventories').findOne({
      trackByLocation: true,
      'locations.1': { $exists: true },
      $expr: {
        $gte: [
          {
            $sum: {
              $map: {
                input: '$locations',
                as: 'l',
                in: '$$l.currentStock',
              },
            },
          },
          2,
        ],
      },
    });
    if (!candidate) {
      throw new Error(
        'REQ-066 AC8 seed: no trackByLocation inventory with 2+ locations + 2+ total stock found on UAT'
      );
    }
    const menuItem = await db
      .collection('menuitems')
      .findOne({ _id: candidate.menuItemId });
    if (!menuItem) {
      throw new Error(
        `REQ-066 AC8 seed: linked menu item missing for inventory ${candidate._id}`
      );
    }

    // Capture original state for cleanup.
    const originalLocations = (
      candidate.locations as Array<{ location: string; currentStock: number }>
    ).map((l) => ({ location: l.location, currentStock: l.currentStock }));
    const originalSalePointLocation = candidate.defaultSalesLocation as
      | string
      | undefined;

    // Pick the location to empty + the sale-point. Prefer a location with
    // stock as the sale-point (so the deduction has somewhere to land) and
    // a different one to force-empty. Default: empty the storeroom-shaped
    // bucket, sale-point the other.
    const stocked =
      originalLocations.find((l) => l.currentStock >= 1) ||
      originalLocations[0];
    const empty =
      originalLocations.find((l) => l.location !== stocked.location) ||
      originalLocations[0];
    const emptyLocationCode = empty.location;
    const defaultSalesLocationCode = stocked.location;

    // Force-mutate: set empty location to 0 currentStock, set defaultSalesLocation.
    await db.collection('inventories').updateOne(
      { _id: candidate._id },
      {
        $set: {
          [`locations.$[empty].currentStock`]: 0,
          defaultSalesLocation: defaultSalesLocationCode,
        },
      },
      { arrayFilters: [{ 'empty.location': emptyLocationCode }] }
    );
    // Re-read to capture the post-force aggregate.
    const forced = await db
      .collection('inventories')
      .findOne({ _id: candidate._id });
    const preDeductionAggregate = (
      forced!.locations as Array<{ currentStock: number }>
    ).reduce((s, l) => s + l.currentStock, 0);
    if (preDeductionAggregate < 1) {
      // Cleanup before throwing.
      await db.collection('inventories').updateOne(
        { _id: candidate._id },
        {
          $set: { locations: originalLocations },
          ...(originalSalePointLocation === undefined
            ? { $unset: { defaultSalesLocation: '' } }
            : { $set: { defaultSalesLocation: originalSalePointLocation } }),
        }
      );
      throw new Error(
        'REQ-066 AC8 seed: post-force aggregate is 0; cannot seed an order'
      );
    }

    const orderNumber = `WGE2S${Date.now()}`.slice(0, 12);
    const subtotal = menuItem.price;
    const now = new Date();
    const seedResult = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
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
      paymentReference: `E2E-AC8-${Date.now()}`,
      paidAt: now,
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'confirmed', timestamp: now, note: 'E2E AC8 seed' },
      ],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });

    return {
      orderId: String(seedResult.insertedId),
      orderNumber,
      inventoryId: String(candidate._id),
      originalLocations,
      originalSalePointLocation,
      emptyLocationCode,
      defaultSalesLocationCode,
      preDeductionAggregate,
    };
  } finally {
    await client.close();
  }
}

async function readInventory(inventoryId: string): Promise<{
  aggregate: number;
  locations: Array<{ location: string; currentStock: number }>;
}> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const inv = await client
      .db(dbName)
      .collection('inventories')
      .findOne({ _id: new ObjectId(inventoryId) });
    const locations = (
      (inv?.locations as Array<{ location: string; currentStock: number }>) ||
      []
    ).map((l) => ({ location: l.location, currentStock: l.currentStock }));
    const aggregate = locations.reduce((s, l) => s + l.currentStock, 0);
    return { aggregate, locations };
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
    // Restore the inventory to exactly its pre-test state.
    const restore: Record<string, unknown> = {};
    handle.originalLocations.forEach((l, idx) => {
      restore[`locations.${idx}.location`] = l.location;
      restore[`locations.${idx}.currentStock`] = l.currentStock;
    });
    const update: Record<string, unknown> = { $set: restore };
    if (handle.originalSalePointLocation === undefined) {
      update.$unset = { defaultSalesLocation: '' };
    } else {
      (update.$set as Record<string, unknown>).defaultSalesLocation =
        handle.originalSalePointLocation;
    }
    await db
      .collection('inventories')
      .updateOne({ _id: new ObjectId(handle.inventoryId) }, update);
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
  'REQ-066 AC8 — deduction routes to defaultSalesLocation @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC8 — locations[0] empty, defaultSalesLocation set: deduction lands on sale-point not on empty location',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));

        handle = await seedOrderWithForcedEmptyLocation();

        // Pre-check: empty location is empty, sale-point has stock.
        const before = await readInventory(handle.inventoryId);
        const beforeEmpty = before.locations.find(
          (l) => l.location === handle!.emptyLocationCode
        );
        const beforeSale = before.locations.find(
          (l) => l.location === handle!.defaultSalesLocationCode
        );
        expect(beforeEmpty?.currentStock).toBe(0);
        expect(beforeSale?.currentStock).toBeGreaterThanOrEqual(1);
        expect(before.aggregate).toBe(handle.preDeductionAggregate);

        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });

        await page.goto('/dashboard/kitchen-display');
        await page.waitForLoadState('networkidle');
        const cookieBanner = page.getByTestId('cookie-consent-banner');
        if (await cookieBanner.isVisible().catch(() => false)) {
          await page.getByRole('button', { name: /got it/i }).click();
          await expect(cookieBanner).toHaveCount(0);
        }

        const heading = page.getByRole('heading', {
          name: handle.orderNumber,
          level: 2,
        });
        await expect(heading).toBeVisible({ timeout: 15000 });

        async function clickAndAwaitStatus(
          buttonText: string,
          expectedNext: string
        ) {
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
          await btn.click();
          await expect
            .poll(() => readOrderStatus(handle!.orderId), { timeout: 20000 })
            .toBe(expectedNext);
        }

        // confirmed → preparing
        await clickAndAwaitStatus('Start Preparing', 'preparing');
        const afterPreparing = await readInventory(handle.inventoryId);
        expect(afterPreparing.aggregate).toBe(handle.preDeductionAggregate);

        await page.reload();
        await page.waitForLoadState('networkidle');

        // preparing → ready
        await clickAndAwaitStatus('Mark Ready', 'ready');
        const afterReady = await readInventory(handle.inventoryId);
        expect(afterReady.aggregate).toBe(handle.preDeductionAggregate);

        await page.reload();
        await page.waitForLoadState('networkidle');

        // ready → completed
        await clickAndAwaitStatus('Complete Order', 'completed');

        // The load-bearing assertion: aggregate drops by 1.
        await expect
          .poll(
            async () => (await readInventory(handle!.inventoryId)).aggregate,
            {
              timeout: 10000,
            }
          )
          .toBe(handle.preDeductionAggregate - 1);

        // And — the proof of routing — the deduction landed on the sale-point,
        // not on the empty location (which proves the #277 bug is fixed).
        const finalState = await readInventory(handle.inventoryId);
        const finalEmpty = finalState.locations.find(
          (l) => l.location === handle!.emptyLocationCode
        );
        const finalSale = finalState.locations.find(
          (l) => l.location === handle!.defaultSalesLocationCode
        );
        expect(finalEmpty?.currentStock).toBe(0);
        expect(finalSale?.currentStock).toBe(beforeSale!.currentStock - 1);

        await evidenceShot(
          page,
          'REQ-066',
          8,
          'deduction-routed-to-sale-point-location'
        );
      }
    );
  }
);
