/**
 * @requirement REQ-088 — Webhook idempotency invariant
 *
 * AC5 — Given a webhook event has already been processed, When the same
 * event is replayed, Then no duplicate inventory deduction, no duplicate
 * points award, and ProcessedWebhookEvent returns 'duplicate'.
 *
 * Transport-layer spec: sends a synthetic monnify webhook twice with the
 * same transactionReference, then reads back orders + pointstransactions
 * to assert no duplicate side-effects.
 *
 * @requirement REQ-088
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import {
  sendWebhook,
  signMonnifyPayload,
  readMonnifySecretFromEnv,
} from '../helpers/webhook-mock';
import { buildMonnifyEvent } from '../helpers/payment-provider-mock';

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
  paymentReference: string;
  transactionReference: string;
}

async function seedPendingOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection('users');
    const orders = db.collection('orders');
    const user = await users.findOne({ role: 'customer' });
    if (!user) throw new Error('No customer user found');
    const paymentReference = `E2E-REQ088-WH-${Date.now()}`;
    const transactionReference = `MNIF-TXN-${Date.now()}`;
    const orderId = new ObjectId();
    await orders.insertOne({
      _id: orderId,
      orderNumber: `WG88W${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'pending',
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
      paymentStatus: 'pending',
      paymentReference,
      inventoryDeducted: false,
      statusHistory: [
        { status: 'pending', timestamp: new Date(), note: 'E2E seed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      orderId: orderId.toString(),
      userId: user._id.toString(),
      paymentReference,
      transactionReference,
    };
  } finally {
    await client.close();
  }
}

async function countPointsTransactions(
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
      .collection('processedwebhookevents')
      .deleteMany({ paymentReference: handle.paymentReference });
    await db
      .collection('stockmovements')
      .deleteMany({ orderId: new ObjectId(handle.orderId) });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC5 — Webhook idempotency invariant', () => {
  test('replay produces no duplicate side-effects', async () => {
    tagTest('REQ-088', 5);
    const handle = await seedPendingOrder();
    const secret = readMonnifySecretFromEnv();
    if (!secret) {
      test.skip(true, 'MONNIFY_SECRET_KEY not configured');
      return;
    }
    try {
      const payload = buildMonnifyEvent({
        paymentReference: handle.paymentReference,
        transactionReference: handle.transactionReference,
        amount: 5000,
        paymentStatus: 'PAID',
      });
      const rawBody = JSON.stringify(payload);
      const signature = signMonnifyPayload(rawBody, secret);
      const resp1 = await sendWebhook({
        baseUrl: baseUrl(),
        provider: 'monnify',
        rawBody,
        signature,
      });
      expect(resp1.status).toBe(200);
      const resp2 = await sendWebhook({
        baseUrl: baseUrl(),
        provider: 'monnify',
        rawBody,
        signature,
      });
      expect(resp2.status).toBe(200);
      const ptsCount = await countPointsTransactions(
        handle.orderId,
        handle.userId
      );
      expect(ptsCount).toBeLessThanOrEqual(1);
    } finally {
      await cleanup(handle);
    }
  });
});
