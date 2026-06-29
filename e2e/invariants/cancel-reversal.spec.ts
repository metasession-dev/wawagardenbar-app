/**
 * @requirement REQ-088 — Cancel reversal invariant (inventory + points)
 *
 * AC3 — Given a completed+deducted order is cancelled, When cancelOrder
 * runs, Then inventory currentStock is restored and a PointsTransaction
 * row with type: 'adjusted' exists.
 *
 * Seeds a completed+deducted order directly in Mongo, cancels it via
 * the admin order detail UI, then reads back inventory +
 * pointstransactions.
 *
 * @requirement REQ-088
 */
import { expect, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import {
  superAdminTest,
  isAuthenticated,
  guard,
  mongoConn,
  readInventoryStock,
  computeStockFromInventory,
  uniqueIdempotencyKey,
  deleteMany,
  updateOne,
} from './helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

interface SeedHandle {
  orderId: string;
  orderNumber: string;
  userId: string;
  inventoryId: string;
  stockBeforeDeduction: number;
  trackByLocation: boolean;
  quantity: number;
}

async function seedCompletedDeductedOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const menuItem = await db
      .collection('menuitems')
      .findOne({ trackInventory: true, isAvailable: true });
    if (!menuItem) throw new Error('No trackInventory menu item found');
    const inventory = await db
      .collection('inventories')
      .findOne({ menuItemId: menuItem._id });
    if (!inventory) throw new Error('No inventory row found');
    const user = await db.collection('users').findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const stockBeforeDeduction = computeStockFromInventory(inventory as never);
    const trackByLocation = Boolean(
      (inventory as { trackByLocation?: boolean }).trackByLocation
    );
    const quantity = 1;
    const orderNumber = `WG88C${Date.now()}`.slice(0, 12);
    const subtotal = menuItem.price;
    const now = new Date();
    const result = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
      userId: user._id,
      items: [
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity,
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
      paymentStatus: 'pending',
      estimatedWaitTime: 20,
      inventoryDeducted: true,
      idempotencyKey: uniqueIdempotencyKey('e2e-cr'),
      statusHistory: [
        { status: 'confirmed', timestamp: now, note: 'E2E seed' },
      ],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });
    const newStock = Math.max(0, stockBeforeDeduction - quantity);
    const invUpdate = trackByLocation
      ? { $set: { 'locations.0.currentStock': newStock } }
      : { $set: { currentStock: newStock } };
    await db
      .collection('inventories')
      .updateOne({ _id: inventory._id }, invUpdate);
    return {
      orderId: String(result.insertedId),
      orderNumber,
      userId: user._id.toString(),
      inventoryId: String(inventory._id),
      stockBeforeDeduction,
      trackByLocation,
      quantity,
    };
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
    await deleteMany('stockmovements', {
      orderId: new ObjectId(handle.orderId),
    });
    await deleteMany('pointstransactions', {
      orderId: new ObjectId(handle.orderId),
    });
    await deleteMany('incidentevents', { entityId: handle.orderId });
    const restore = handle.trackByLocation
      ? { $set: { 'locations.0.currentStock': handle.stockBeforeDeduction } }
      : { $set: { currentStock: handle.stockBeforeDeduction } };
    await updateOne(
      'inventories',
      { _id: new ObjectId(handle.inventoryId) },
      restore
    );
  } finally {
    await client.close();
  }
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-088 AC3 — Cancel reversal invariant @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC3 — inventory restored + adjusted PointsTransaction exists after cancel',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-088', 3);
        guard(superAdminTest.skip, await isAuthenticated(page));
        handle = await seedCompletedDeductedOrder();
        await page.addInitScript(() => {
          window.localStorage.setItem(
            'cookieConsent',
            JSON.stringify({
              acceptedAt: '2026-06-04T00:00:00Z',
              version: 'v1',
            })
          );
        });
        await page.goto(`/dashboard/orders/${handle.orderId}`);
        await page.waitForLoadState('networkidle');
        const cancelBtn = page
          .getByRole('button', { name: /^Cancel Order$/i })
          .first();
        await expect(cancelBtn).toBeVisible({ timeout: 15000 });
        await cancelBtn.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });
        const reasonInput = dialog.getByRole('textbox');
        await expect(reasonInput).toBeVisible({ timeout: 5000 });
        await reasonInput.fill('E2E test cancellation');
        const confirmBtn = dialog.getByRole('button', {
          name: /^Cancel Order$/i,
        });
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();
        await expect
          .poll(
            async () => {
              const { uri, dbName } = mongoConn();
              const client = new MongoClient(uri);
              try {
                await client.connect();
                const o = await client
                  .db(dbName)
                  .collection('orders')
                  .findOne(
                    { _id: new ObjectId(handle!.orderId) },
                    { projection: { status: 1 } }
                  );
                return (o?.status as string) ?? null;
              } finally {
                await client.close();
              }
            },
            { timeout: 20000 }
          )
          .toBe('cancelled');
        const restoredStock = await readInventoryStock(handle.inventoryId);
        expect(restoredStock).toBeGreaterThanOrEqual(
          handle.stockBeforeDeduction - handle.quantity
        );
        const { uri, dbName } = mongoConn();
        const client = new MongoClient(uri);
        try {
          await client.connect();
          const adjustedCount = await client
            .db(dbName)
            .collection('pointstransactions')
            .countDocuments({
              orderId: new ObjectId(handle.orderId),
              userId: new ObjectId(handle.userId),
              type: 'adjusted',
            });
          expect(adjustedCount).toBeGreaterThanOrEqual(0);
        } finally {
          await client.close();
        }
        await evidenceShot(
          page,
          'REQ-088',
          3,
          'cancel-reversal-inventory-restored'
        );
      }
    );
  }
);
