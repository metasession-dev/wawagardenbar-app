/**
 * @requirement REQ-088 — Points award invariant on order completion
 *
 * AC2 — Given an order with userId is completed, When the completion
 * chokepoint fires, Then a PointsTransaction row with type: 'earned'
 * exists for that orderId.
 *
 * Transport-layer spec: seeds an order with a userId via Mongo, drives
 * completion via the admin API, then reads back pointstransactions to
 * assert the earned row exists.
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
}

async function seedOrderWithUser(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    const orders = db.collection('orders');
    const user = await users.findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found for seed');
    const orderId = new ObjectId();
    const orderNumber = `WG88P${Date.now()}`.slice(0, 12);
    await orders.insertOne({
      _id: orderId,
      orderNumber,
      orderType: 'pickup',
      status: 'confirmed',
      userId: user._id,
      items: [{ name: 'Test Item', quantity: 1, price: 5000, total: 5000 }],
      subtotal: 5000,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: 5000,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
      paymentStatus: 'paid',
      paymentMethod: 'card',
      paymentReference: `E2E-REQ088-PTS-${Date.now()}`,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(), note: 'E2E seed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { orderId: orderId.toString(), userId: user._id.toString() };
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

async function countEarnedPointsTransactions(
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
    await db
      .collection('orders')
      .deleteOne({ _id: new ObjectId(handle.orderId) });
    await db
      .collection('pointstransactions')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC2 — Points award invariant (order completion)', () => {
  test('PointsTransaction earned row exists after completion', async () => {
    tagTest('REQ-088', 2);
    const handle = await seedOrderWithUser();
    try {
      await completeOrderViaAPI(handle.orderId);
      const earnedCount = await countEarnedPointsTransactions(
        handle.orderId,
        handle.userId
      );
      expect(earnedCount).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanup(handle);
    }
  });
});
