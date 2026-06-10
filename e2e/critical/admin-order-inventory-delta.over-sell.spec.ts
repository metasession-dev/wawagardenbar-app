/**
 * @requirement REQ-066 AC9 — Over-sell at sale-point surfaces as
 * IncidentEvent + UI warning, never as silent data loss.
 *
 * Pins the operator-reported scenario from 2026-06-04: complete an order
 * for MORE units than the sale-point (chiller1) has in stock. The
 * chokepoint must:
 *   - flip Order.status → 'completed' (kitchen workflow not stalled)
 *   - leave Order.inventoryDeducted = false (no silent absorption)
 *   - write an `inventory_deduction_failed` IncidentEvent with a
 *     specific error message naming the sale-point + the shortage
 *   - leave inventory counts unchanged (no over-deduction; no clamp-at-zero)
 *
 * Seed shape: force-mutate a chosen item so chiller1 holds exactly
 * `OVERSELL_LIMIT` units and `defaultSalesLocation = 'chiller1'`. Order
 * for `OVERSELL_LIMIT + 1` units. Cleanup restores `locations[*]` and
 * `defaultSalesLocation` to pre-test state and removes the test order.
 *
 * @requirement REQ-066
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

const OVERSELL_LIMIT = 2; // chiller1 forced to 2; order will request 3.

interface SeedHandle {
  orderId: string;
  orderNumber: string;
  inventoryId: string;
  originalLocations: Array<{ location: string; currentStock: number }>;
  originalSalePoint: string | undefined;
  salePointCode: string;
  emptyCode: string;
  /** Quantity the test order requested — strictly greater than OVERSELL_LIMIT. */
  requested: number;
}

async function seedOverSellOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // Pick a row with at least 2 locations + total stock >= OVERSELL_LIMIT.
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
          OVERSELL_LIMIT + 1,
        ],
      },
    });
    if (!candidate) {
      throw new Error(
        'REQ-066 AC9 seed: no trackByLocation inventory with 2+ locations + enough total stock found on UAT'
      );
    }
    const menuItem = await db
      .collection('menuitems')
      .findOne({ _id: candidate.menuItemId });
    if (!menuItem) {
      throw new Error(
        `REQ-066 AC9 seed: menu item missing for inventory ${candidate._id}`
      );
    }

    const originalLocations = (
      candidate.locations as Array<{ location: string; currentStock: number }>
    ).map((l) => ({ location: l.location, currentStock: l.currentStock }));
    const originalSalePoint = candidate.defaultSalesLocation as
      | string
      | undefined;

    // Designate sale point: the location with the most stock (so we can
    // cap it at OVERSELL_LIMIT). The other becomes the "empty" comparator.
    const sorted = [...originalLocations].sort(
      (a, b) => b.currentStock - a.currentStock
    );
    const salePointCode = sorted[0].location;
    const emptyCode = sorted[1].location;

    await db.collection('inventories').updateOne(
      { _id: candidate._id },
      {
        $set: {
          'locations.$[sale].currentStock': OVERSELL_LIMIT,
          defaultSalesLocation: salePointCode,
        },
      },
      { arrayFilters: [{ 'sale.location': salePointCode }] }
    );

    const requested = OVERSELL_LIMIT + 1;
    const orderNumber = `WGE2X${Date.now()}`.slice(0, 12);
    const subtotal = menuItem.price * requested;
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
          quantity: requested,
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
      paymentReference: `E2E-AC9-${Date.now()}`,
      paidAt: now,
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'confirmed', timestamp: now, note: 'E2E AC9 seed' },
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
      originalSalePoint,
      salePointCode,
      emptyCode,
      requested,
    };
  } finally {
    await client.close();
  }
}

async function readOrder(orderId: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('orders')
      .findOne(
        { _id: new ObjectId(orderId) },
        {
          projection: {
            status: 1,
            inventoryDeducted: 1,
            inventoryDeductedAt: 1,
          },
        }
      );
  } finally {
    await client.close();
  }
}

async function readLocations(
  inventoryId: string
): Promise<Array<{ location: string; currentStock: number }>> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const inv = await client
      .db(dbName)
      .collection('inventories')
      .findOne({ _id: new ObjectId(inventoryId) });
    return (
      (inv?.locations as Array<{ location: string; currentStock: number }>) ||
      []
    ).map((l) => ({ location: l.location, currentStock: l.currentStock }));
  } finally {
    await client.close();
  }
}

async function readLatestIncident(orderId: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('incidentevents')
      .findOne(
        { entityId: orderId, kind: 'inventory_deduction_failed' },
        { sort: { createdAt: -1 } }
      );
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
      .collection('incidentevents')
      .deleteMany({ entityId: handle.orderId });
    const restore: Record<string, unknown> = {};
    handle.originalLocations.forEach((l, idx) => {
      restore[`locations.${idx}.location`] = l.location;
      restore[`locations.${idx}.currentStock`] = l.currentStock;
    });
    const update: Record<string, unknown> = { $set: restore };
    if (handle.originalSalePoint === undefined) {
      update.$unset = { defaultSalesLocation: '' };
    } else {
      (update.$set as Record<string, unknown>).defaultSalesLocation =
        handle.originalSalePoint;
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
  'REQ-066 AC9 — over-sell at sale-point surfaces as IncidentEvent @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC9 — sale-point insufficient: chokepoint throws, status flips, IncidentEvent written, no over-deduction',
      async ({ page }: { page: Page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));

        handle = await seedOverSellOrder();

        // Pre-flight: sale-point capped, other location untouched, no incident yet.
        const before = await readLocations(handle.inventoryId);
        const beforeSale = before.find(
          (l) => l.location === handle!.salePointCode
        );
        const beforeEmpty = before.find(
          (l) => l.location === handle!.emptyCode
        );
        expect(beforeSale?.currentStock).toBe(OVERSELL_LIMIT);
        const initialBeforeOrderIncident = await readLatestIncident(
          handle.orderId
        );
        expect(initialBeforeOrderIncident).toBeNull();

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
            .poll(
              async () => (await readOrder(handle!.orderId))?.status ?? null,
              { timeout: 20000 }
            )
            .toBe(expectedNext);
        }

        await clickAndAwaitStatus('Start Preparing', 'preparing');
        await page.reload();
        await page.waitForLoadState('networkidle');

        await clickAndAwaitStatus('Mark Ready', 'ready');
        await page.reload();
        await page.waitForLoadState('networkidle');

        await clickAndAwaitStatus('Complete Order', 'completed');

        // Workflow continued — status flipped, inventoryDeducted stayed false.
        const after = await readOrder(handle.orderId);
        expect(after?.status).toBe('completed');
        expect(after?.inventoryDeducted).toBe(false);

        // IncidentEvent written with the specific error message — poll
        // because the chokepoint writes it inside the async catch path.
        await expect
          .poll(
            () => readLatestIncident(handle!.orderId).then((i) => i?.kind),
            {
              timeout: 10000,
            }
          )
          .toBe('inventory_deduction_failed');
        const incident = await readLatestIncident(handle.orderId);
        expect(incident).not.toBeNull();
        expect(incident!.summary).toMatch(/deductStockForOrder/i);
        expect(incident!.errorDetails?.message).toMatch(/insufficient stock/i);
        expect(incident!.errorDetails?.message).toContain(handle.salePointCode);

        // Inventory counts unchanged — no over-deduction, no clamp-at-zero.
        const afterLocs = await readLocations(handle.inventoryId);
        const afterSale = afterLocs.find(
          (l) => l.location === handle!.salePointCode
        );
        const afterEmpty = afterLocs.find(
          (l) => l.location === handle!.emptyCode
        );
        expect(afterSale?.currentStock).toBe(OVERSELL_LIMIT);
        expect(afterEmpty?.currentStock).toBe(beforeEmpty?.currentStock);

        // No stockmovement rows for the test order (deduction never ran).
        const { uri, dbName } = mongoConn();
        const c = new MongoClient(uri);
        try {
          await c.connect();
          const movCount = await c
            .db(dbName)
            .collection('stockmovements')
            .countDocuments({ orderId: new ObjectId(handle.orderId) });
          expect(movCount).toBe(0);
        } finally {
          await c.close();
        }
      }
    );

    superAdminTest(
      'AC10 — operator-initiated Retry now on /dashboard/incidents resolves the stuck deduction after stock transfer',
      async ({ page }: { page: Page }) => {
        // REQ-066 AC10 — Retry-now button + retryInventoryDeductionAction
        // shipped via PR #288 to develop and PR #283 → main `b1a9c0b`
        // 2026-06-04. Un-fixme'd in this close-out commit now that
        // both UAT and production deploys have the supporting code.
        guard(superAdminTest.skip, await isAuthenticated(page));

        // Re-seed the over-sell shape just like the AC9 case above.
        handle = await seedOverSellOrder();

        // Drive the lifecycle to completed through the UI so the
        // IncidentEvent is generated naturally by the chokepoint (not by
        // a forced direct call).
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

        async function uiClickAndAwaitStatus(
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
            .poll(
              async () => (await readOrder(handle!.orderId))?.status ?? null,
              { timeout: 20000 }
            )
            .toBe(expectedNext);
        }

        await uiClickAndAwaitStatus('Start Preparing', 'preparing');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await uiClickAndAwaitStatus('Mark Ready', 'ready');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await uiClickAndAwaitStatus('Complete Order', 'completed');

        // Confirm we're in the post-over-sell state: IncidentEvent
        // recorded, flag still false, stock untouched.
        await expect
          .poll(
            () => readLatestIncident(handle!.orderId).then((i) => i?.kind),
            { timeout: 10000 }
          )
          .toBe('inventory_deduction_failed');
        const stuck = await readOrder(handle.orderId);
        expect(stuck?.inventoryDeducted).toBe(false);

        // Operator transfers stock store → chiller via direct Mongo
        // (the equivalent of clicking "Transfer Stock" in the inventory
        // UI). We bump the sale-point so the next retry has enough.
        const transferDelta = OVERSELL_LIMIT + 5; // > requested
        const { uri, dbName } = mongoConn();
        const client = new MongoClient(uri);
        try {
          await client.connect();
          await client
            .db(dbName)
            .collection('inventories')
            .updateOne(
              { _id: new ObjectId(handle.inventoryId) },
              {
                $set: {
                  'locations.$[sale].currentStock': transferDelta,
                },
              },
              { arrayFilters: [{ 'sale.location': handle.salePointCode }] }
            );
        } finally {
          await client.close();
        }

        // Operator navigates to /dashboard/incidents + clicks Retry now.
        await page.goto('/dashboard/incidents?kind=inventory_deduction_failed');
        await page.waitForLoadState('networkidle');
        const retryButton = page
          .getByRole('button', {
            name: new RegExp(
              `retry inventory deduction for order ${handle.orderId}`,
              'i'
            ),
          })
          .first();
        await expect(retryButton).toBeVisible({ timeout: 15000 });
        await retryButton.click();

        // Poll for the order's flag to flip.
        await expect
          .poll(
            async () => (await readOrder(handle!.orderId))?.inventoryDeducted,
            { timeout: 15000 }
          )
          .toBe(true);

        // Inventory must reflect the deduction now: sale-point was
        // transferDelta, requested OVERSELL_LIMIT + 1, so post-deduction
        // sale-point = transferDelta - (OVERSELL_LIMIT + 1).
        const final = await readLocations(handle.inventoryId);
        const finalSale = final.find(
          (l) => l.location === handle!.salePointCode
        );
        expect(finalSale?.currentStock).toBe(
          transferDelta - (OVERSELL_LIMIT + 1)
        );
      }
    );
  }
);
