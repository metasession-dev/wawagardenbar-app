/**
 * @requirement REQ-088 — Cancel reversal invariant (inventory + points)
 *
 * AC3 — Given an inventoryDeducted order is cancelled, When cancelOrder
 * runs, Then inventory currentStock is restored and a PointsTransaction
 * row with type: 'adjusted' exists.
 *
 * Transport-layer spec: seeds a completed+deducted order, cancels it via
 * the admin API, then reads back inventory + pointstransactions.
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
  userId: string;
  inventoryId: string;
  stockBeforeDeduction: number;
  quantity: number;
}

async function seedCompletedOrderWithDeduction(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const menuItems = db.collection('menuitems');
    const inventories = db.collection('inventories');
    const orders = db.collection('orders');
    const users = db.collection('users');
    const item = await menuItems.findOne({
      trackInventory: true,
      isAvailable: true,
    });
    if (!item) throw new Error('No trackInventory menu item found');
    const inv = await inventories.findOne({ menuItemId: item._id.toString() });
    if (!inv) throw new Error('No inventory row found');
    const user = await users.findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const stockBeforeDeduction =
      inv.trackByLocation && inv.locations?.length > 0
        ? inv.locations.reduce(
            (s: number, l: { currentStock: number }) =>
              s + (l.currentStock || 0),
            0
          )
        : inv.currentStock || 0;
    const quantity = 1;
    const orderId = new ObjectId();
    const orderNumber = `WG88CR${Date.now()}`.slice(0, 12);
    await orders.insertOne({
      _id: orderId,
      orderNumber,
      orderType: 'pickup',
      status: 'completed',
      userId: user._id,
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
      paymentReference: `E2E-REQ088-CR-${Date.now()}`,
      inventoryDeducted: true,
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(), note: 'E2E seed' },
        { status: 'completed', timestamp: new Date(), note: 'E2E seed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const newStock = Math.max(0, stockBeforeDeduction - quantity);
    await inventories.updateOne(
      { _id: inv._id },
      { $set: { currentStock: newStock } }
    );
    return {
      orderId: orderId.toString(),
      userId: user._id.toString(),
      inventoryId: inv._id.toString(),
      stockBeforeDeduction,
      quantity,
    };
  } finally {
    await client.close();
  }
}

async function cancelOrderViaAPI(orderId: string): Promise<void> {
  const resp = await fetch(`${baseUrl()}/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'E2E test cancellation' }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cancel API failed: ${resp.status} ${text}`);
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

async function countAdjustedPointsTransactions(
  orderId: string,
  userId: string
): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.collection('pointstransactions').countDocuments({
      orderId: new ObjectId(orderId),
      userId: new ObjectId(userId),
      type: 'adjusted',
    });
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
      .collection('pointstransactions')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
    await db
      .collection('stockmovements')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
    await db
      .collection('inventories')
      .updateOne(
        { _id: new ObjectId(handle.inventoryId) },
        { $set: { currentStock: handle.stockBeforeDeduction } }
      );
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC3 — Cancel reversal invariant', () => {
  test('inventory restored + adjusted PointsTransaction exists', async () => {
    tagTest('REQ-088', 3);
    const handle = await seedCompletedOrderWithDeduction();
    try {
      await cancelOrderViaAPI(handle.orderId);
      const restoredStock = await readInventoryStock(handle.inventoryId);
      const adjustedCount = await countAdjustedPointsTransactions(
        handle.orderId,
        handle.userId
      );
      expect(restoredStock).toBe(handle.stockBeforeDeduction);
      expect(adjustedCount).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup(handle);
    }
  });
});
