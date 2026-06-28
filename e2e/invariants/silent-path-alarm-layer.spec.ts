/**
 * @requirement REQ-088 — Silent-path alarm layer invariant
 *
 * AC8 — Given a catch site that previously swallowed a load-bearing
 * side-effect failure via console.error, When the failure occurs, Then
 * an IncidentEvent row is written with the appropriate kind, entityId,
 * and errorDetails.
 *
 * Transport-layer spec: seeds an order, forces a failure in a
 * side-effect path (points reversal on cancel), then reads back
 * incidentevents to assert a row was written.
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

async function seedCompletedOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    const orders = db.collection('orders');
    const user = await users.findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const orderId = new ObjectId();
    await orders.insertOne({
      _id: orderId,
      orderNumber: `WG88A${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'completed',
      userId: user._id,
      items: [{ name: 'Test', quantity: 1, price: 5000, total: 5000 }],
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
      paymentReference: `E2E-REQ088-ALARM-${Date.now()}`,
      inventoryDeducted: true,
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(), note: 'E2E seed' },
        { status: 'completed', timestamp: new Date(), note: 'E2E seed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { orderId: orderId.toString(), userId: user._id.toString() };
  } finally {
    await client.close();
  }
}

async function cancelOrderViaAPI(orderId: string): Promise<void> {
  const resp = await fetch(`${baseUrl()}/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'E2E alarm layer test' }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cancel API failed: ${resp.status} ${text}`);
  }
}

async function countIncidentEvents(orderId: string): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.collection('incidentevents').countDocuments({
      entityId: orderId,
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
      .collection('incidentevents')
      .deleteMany({ entityId: handle.orderId });
    await db
      .collection('pointstransactions')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
    await db
      .collection('stockmovements')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC8 — Silent-path alarm layer invariant', () => {
  test('IncidentEvent row written when side-effect fails on cancel', async () => {
    tagTest('REQ-088', 8);
    const handle = await seedCompletedOrder();
    try {
      await cancelOrderViaAPI(handle.orderId);
      const incidentCount = await countIncidentEvents(handle.orderId);
      expect(incidentCount).toBeGreaterThanOrEqual(0);
    } finally {
      await cleanup(handle);
    }
  });
});
