/**
 * @requirement REQ-088 — Tab close multi-deduction invariant
 *
 * AC4 — Given a tab with N paid orders, When the tab is closed, Then
 * each order has inventoryDeducted: true and each has a PointsTransaction
 * earned row.
 *
 * Transport-layer spec: seeds a tab with 2 paid orders, closes the tab
 * via the API, then reads back orders + pointstransactions.
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
  tabId: string;
  orderIds: string[];
  userId: string;
}

async function seedTabWithOrders(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    const tabs = db.collection('tabs');
    const orders = db.collection('orders');
    const user = await users.findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const tabId = new ObjectId();
    const orderIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const orderId = new ObjectId();
      orderIds.push(orderId.toString());
      await orders.insertOne({
        _id: orderId,
        orderNumber: `WG88T${Date.now()}${i}`.slice(0, 13),
        orderType: 'dine-in',
        status: 'confirmed',
        userId: user._id,
        tabId,
        items: [
          { name: `Tab Item ${i}`, quantity: 1, price: 3000, total: 3000 },
        ],
        subtotal: 3000,
        serviceFee: 0,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        tipAmount: 0,
        total: 3000,
        totalCost: 0,
        grossProfit: 0,
        profitMargin: 0,
        operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
        paymentStatus: 'paid',
        paymentMethod: 'card',
        paymentReference: `E2E-REQ088-TAB-${Date.now()}-${i}`,
        inventoryDeducted: false,
        statusHistory: [
          { status: 'confirmed', timestamp: new Date(), note: 'E2E seed' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await tabs.insertOne({
      _id: tabId,
      tabNumber: `TAB88${Date.now()}`.slice(0, 12),
      status: 'open',
      paymentStatus: 'pending',
      userId: user._id,
      orders: orderIds.map((id) => new ObjectId(id)),
      total: 6000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { tabId: tabId.toString(), orderIds, userId: user._id.toString() };
  } finally {
    await client.close();
  }
}

async function closeTabViaAPI(tabId: string): Promise<void> {
  const resp = await fetch(`${baseUrl()}/api/tabs/${tabId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actorUserId: 'e2e-test-user',
      actorRole: 'super-admin',
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Close tab API failed: ${resp.status} ${text}`);
  }
}

async function readOrders(
  orderIds: string[]
): Promise<Array<{ _id: string; inventoryDeducted: boolean }>> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const docs = await db
      .collection('orders')
      .find({
        _id: { $in: orderIds.map((id) => new ObjectId(id)) },
      })
      .toArray();
    return docs.map((d) => ({
      _id: d._id.toString(),
      inventoryDeducted: d.inventoryDeducted ?? false,
    }));
  } finally {
    await client.close();
  }
}

async function countEarnedPointsForOrders(
  orderIds: string[],
  userId: string
): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.collection('pointstransactions').countDocuments({
      orderId: { $in: orderIds.map((id) => new ObjectId(id)) },
      userId: new ObjectId(userId),
      type: 'earned',
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
    await db.collection('tabs').deleteOne({ _id: new ObjectId(handle.tabId) });
    for (const orderId of handle.orderIds) {
      await db.collection('orders').deleteOne({ _id: new ObjectId(orderId) });
      await db
        .collection('pointstransactions')
        .deleteMany({ orderId: new ObjectId(orderId) });
      await db
        .collection('stockmovements')
        .deleteMany({ orderId: new ObjectId(orderId) });
    }
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC4 — Tab close multi-deduction invariant', () => {
  test('each order has inventoryDeducted + earned PointsTransaction', async () => {
    tagTest('REQ-088', 4);
    const handle = await seedTabWithOrders();
    try {
      await closeTabViaAPI(handle.tabId);
      const orders = await readOrders(handle.orderIds);
      const earnedCount = await countEarnedPointsForOrders(
        handle.orderIds,
        handle.userId
      );
      for (const order of orders) {
        expect(order.inventoryDeducted).toBe(true);
      }
      expect(earnedCount).toBeGreaterThanOrEqual(handle.orderIds.length);
    } finally {
      await cleanup(handle);
    }
  });
});
