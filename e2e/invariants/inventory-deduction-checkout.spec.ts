/**
 * @requirement REQ-088 — Inventory deduction invariant via customer checkout
 * @requirement REQ-066 — Generalized from kitchen-display pilot
 *
 * AC1 — Given a trackInventory menu item with stock, When a customer
 * completes checkout, Then the inventories collection shows stock
 * decremented by the ordered qty and a stockmovements row is linked.
 *
 * Transport-layer spec: seeds order via Mongo, drives the order through
 * the completion chokepoint via the admin orders page API, then reads
 * back inventory + stockmovements to assert the delta.
 *
 * @requirement REQ-088
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

function baseUrl(): string {
  return (
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

interface SeedHandle {
  orderId: string;
  orderNumber: string;
  inventoryId: string;
  menuItemId: string;
  baselineStock: number;
  quantity: number;
}

async function seedOrderWithInventory(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const menuItems = db.collection('menuitems');
    const inventories = db.collection('inventories');
    const orders = db.collection('orders');
    const item = await menuItems.findOne({
      trackInventory: true,
      isAvailable: true,
    });
    if (!item) throw new Error('No trackInventory menu item found for seed');
    const inv = await inventories.findOne({ menuItemId: item._id.toString() });
    if (!inv) throw new Error('No inventory row found for menu item');
    const baselineStock =
      inv.trackByLocation && inv.locations?.length > 0
        ? inv.locations.reduce(
            (s: number, l: { currentStock: number }) =>
              s + (l.currentStock || 0),
            0
          )
        : inv.currentStock || 0;
    const quantity = 2;
    const orderId = new ObjectId();
    const orderNumber = `WG88C${Date.now()}`.slice(0, 12);
    await orders.insertOne({
      _id: orderId,
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
      items: [
        {
          menuItemId: item._id,
          name: item.name,
          quantity,
          price: item.price || 5000,
          total: (item.price || 5000) * quantity,
        },
      ],
      subtotal: (item.price || 5000) * quantity,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: (item.price || 5000) * quantity,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      paymentStatus: 'paid',
      paymentMethod: 'card',
      paymentReference: `E2E-REQ088-INV-${Date.now()}`,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(), note: 'E2E seed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      orderId: orderId.toString(),
      orderNumber,
      inventoryId: inv._id.toString(),
      menuItemId: item._id.toString(),
      baselineStock,
      quantity,
    };
  } finally {
    await client.close();
  }
}

async function completeOrderViaAPI(orderId: string): Promise<void> {
  const resp = await fetch(`${baseUrl()}/api/orders/${orderId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actorUserId: 'e2e-test-user',
      actorRole: 'super-admin',
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Complete API failed: ${resp.status} ${text}`);
  }
}

async function readInventoryStock(inventoryId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const inv = await db
      .collection('inventories')
      .findOne({ _id: new ObjectId(inventoryId) });
    if (!inv) return 0;
    if (inv.trackByLocation && inv.locations?.length > 0) {
      return inv.locations.reduce(
        (s: number, l: { currentStock: number }) => s + (l.currentStock || 0),
        0
      );
    }
    return inv.currentStock || 0;
  } finally {
    await client.close();
  }
}

async function countStockMovements(orderId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db
      .collection('stockmovements')
      .countDocuments({ orderId: new ObjectId(orderId) });
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
      .updateOne(
        { _id: new ObjectId(handle.inventoryId) },
        { $set: { currentStock: handle.baselineStock } }
      );
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC1 — Inventory deduction invariant (checkout path)', () => {
  test('stock decremented by ordered qty + stockmovement linked', async () => {
    tagTest('REQ-088', 1);
    const handle = await seedOrderWithInventory();
    try {
      await completeOrderViaAPI(handle.orderId);
      const postStock = await readInventoryStock(handle.inventoryId);
      const movements = await countStockMovements(handle.orderId);
      expect(postStock).toBe(handle.baselineStock - handle.quantity);
      expect(movements).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup(handle);
    }
  });
});
