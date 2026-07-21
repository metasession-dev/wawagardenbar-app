/**
 * @requirement REQ-088 — Inventory deduction invariant via kitchen-display completion
 * @requirement REQ-066 — Generalized from kitchen-display pilot
 *
 * AC1 — Given a trackInventory menu item with stock, When an order is
 * completed via the kitchen-display, Then the inventories collection
 * shows stock decremented by the ordered qty and a stockmovements row
 * is linked.
 *
 * Seeds an order via Mongo, drives it through the kitchen-display UI
 * (confirmed → preparing → ready → completed), then reads back
 * inventory + stockmovements to assert the delta.
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
  setupKitchenDisplay,
  clickAndAwaitStatus,
  uniqueIdempotencyKey,
  deleteMany,
  findOrCreateMenuItem,
} from './helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

interface SeedHandle {
  orderId: string;
  orderNumber: string;
  menuItemId: string;
  inventoryId: string;
  baselineStock: number;
  trackByLocation: boolean;
  quantity: number;
}

async function seedOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const menuItem = await findOrCreateMenuItem(db, { trackInventory: true });
    const sourceInventory = await db
      .collection('inventories')
      .findOne({ menuItemId: menuItem._id });
    if (!sourceInventory) throw new Error('No inventory row found for menu item');
    const quantity = 1;
    const orderNumber = `WG88I${Date.now()}`.slice(0, 12);
    const now = new Date();
    const { _id: _sourceMenuItemId, ...menuItemSeed } = menuItem;
    const isolatedMenuItem = await db.collection('menuitems').insertOne({
      ...menuItemSeed,
      name: `E2E inventory invariant ${orderNumber}`,
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
    const result = await db.collection('orders').insertOne({
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
      items: [
        {
          menuItemId: isolatedMenuItem.insertedId,
          name: `E2E inventory invariant ${orderNumber}`,
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
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: `E2E-REQ088-INV-${Date.now()}`,
      paidAt: now,
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      idempotencyKey: uniqueIdempotencyKey('e2e-inv'),
      statusHistory: [
        { status: 'confirmed', timestamp: now, note: 'E2E seed' },
      ],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });
    return {
      orderId: String(result.insertedId),
      orderNumber,
      menuItemId: String(isolatedMenuItem.insertedId),
      inventoryId: String(isolatedInventory.insertedId),
      baselineStock: computeStockFromInventory(sourceInventory as never),
      trackByLocation: Boolean(
        (sourceInventory as { trackByLocation?: boolean }).trackByLocation
      ),
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
    await deleteMany('inventories', { _id: new ObjectId(handle.inventoryId) });
    await deleteMany('menuitems', { _id: new ObjectId(handle.menuItemId) });
  } finally {
    await client.close();
  }
}

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe(
  'REQ-088 AC1 — Inventory deduction invariant @smoke',
  () => {
    let handle: SeedHandle | null = null;

    superAdminTest.afterEach(async () => {
      if (handle) {
        await cleanup(handle);
        handle = null;
      }
    });

    superAdminTest(
      'AC1 — stock decremented by ordered qty + stockmovement linked on kitchen-complete',
      async ({ page }: { page: Page }) => {
        tagTest('REQ-088', 1);
        guard(superAdminTest.skip, await isAuthenticated(page));
        handle = await seedOrder();
        await setupKitchenDisplay(page);
        await clickAndAwaitStatus(
          page,
          handle.orderNumber,
          handle.orderId,
          'Start Preparing',
          'preparing'
        );
        await page.reload();
        await page.waitForLoadState('networkidle');
        await clickAndAwaitStatus(
          page,
          handle.orderNumber,
          handle.orderId,
          'Mark Ready',
          'ready'
        );
        await page.reload();
        await page.waitForLoadState('networkidle');
        await clickAndAwaitStatus(
          page,
          handle.orderNumber,
          handle.orderId,
          'Complete Order',
          'completed'
        );
        await expect
          .poll(async () => readInventoryStock(handle!.inventoryId), {
            timeout: 10000,
          })
          .toBe(handle.baselineStock - handle.quantity);
        const movements = await (async () => {
          const { uri, dbName } = mongoConn();
          const client = new MongoClient(uri);
          try {
            await client.connect();
            return await client
              .db(dbName)
              .collection('stockmovements')
              .countDocuments({ orderId: new ObjectId(handle!.orderId) });
          } finally {
            await client.close();
          }
        })();
        expect(movements).toBeGreaterThanOrEqual(1);
        await evidenceShot(
          page,
          'REQ-088',
          1,
          'inventory-decremented-on-kitchen-complete'
        );
      }
    );
  }
);
