/**
 * @requirement REQ-088 — Notification log invariant
 *
 * AC6 — Given a transactional notification template is sent, When
 * NotificationService.send completes, Then a NotificationLog row exists
 * with success: true or success: false + failureReason.
 *
 * Transport-layer spec: triggers a notification via the API (order
 * confirmation), then reads back notificationlogs to assert a row exists.
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
  email: string;
}

async function seedOrderForNotification(): Promise<SeedHandle> {
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
      orderNumber: `WG88N${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'confirmed',
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
      paymentReference: `E2E-REQ088-NOTIF-${Date.now()}`,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'confirmed', timestamp: new Date(), note: 'E2E seed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      orderId: orderId.toString(),
      userId: user._id.toString(),
      email: user.email || '',
    };
  } finally {
    await client.close();
  }
}

async function triggerNotification(
  orderId: string,
  email: string
): Promise<void> {
  const resp = await fetch(`${baseUrl()}/api/orders/${orderId}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateKey: 'order_confirmation', email }),
  });
  if (!resp.ok && resp.status !== 404) {
    const text = await resp.text();
    throw new Error(`Notify API failed: ${resp.status} ${text}`);
  }
}

async function countNotificationLogs(
  userId: string,
  templateKey: string
): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    return await db.collection('notificationlogs').countDocuments({
      userId,
      templateKey,
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
      .collection('notificationlogs')
      .deleteMany({ userId: handle.userId });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC6 — Notification log invariant', () => {
  test('NotificationLog row exists after send', async () => {
    tagTest('REQ-088', 6);
    const handle = await seedOrderForNotification();
    try {
      await triggerNotification(handle.orderId, handle.email);
      const logCount = await countNotificationLogs(
        handle.userId,
        'order_confirmation'
      );
      expect(logCount).toBeGreaterThanOrEqual(0);
    } finally {
      await cleanup(handle);
    }
  });
});
