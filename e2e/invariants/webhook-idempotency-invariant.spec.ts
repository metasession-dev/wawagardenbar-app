/**
 * @requirement REQ-088 — Webhook idempotency invariant
 *
 * AC5 — Given a webhook event has already been processed, When the same
 * event is replayed, Then no duplicate points award and the second
 * response indicates "already processed".
 *
 * Sends a synthetic monnify webhook twice with the same
 * transactionReference, then reads back pointstransactions to assert
 * no duplicate side-effects.
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
import {
  mongoConn,
  baseUrl,
  uniqueIdempotencyKey,
  deleteMany,
  findOrCreateCustomerUser,
} from './helpers';

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
    const user = await findOrCreateCustomerUser(db);
    const paymentReference = `E2E-REQ088-WH-${Date.now()}`;
    const transactionReference = `MNIF-TXN-${Date.now()}`;
    const now = new Date();
    const result = await db.collection('orders').insertOne({
      orderNumber: `WG88W${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'pending',
      userId: user._id,
      items: [],
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
      estimatedWaitTime: 20,
      inventoryDeducted: false,
      idempotencyKey: uniqueIdempotencyKey('e2e-wh'),
      statusHistory: [{ status: 'pending', timestamp: now, note: 'E2E seed' }],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });
    return {
      orderId: String(result.insertedId),
      userId: user._id.toString(),
      paymentReference,
      transactionReference,
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
    await deleteMany('pointstransactions', {
      orderId: new ObjectId(handle.orderId),
    });
    await deleteMany('processedwebhookevents', {
      paymentReference: handle.paymentReference,
    });
    await deleteMany('stockmovements', {
      orderId: new ObjectId(handle.orderId),
    });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC5 — Webhook idempotency invariant', () => {
  test('replay produces no duplicate side-effects', async () => {
    tagTest('REQ-088', 5);
    const handle = await seedPendingOrder();
    let secret = '';
    try {
      secret = readMonnifySecretFromEnv();
    } catch {
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
      const { uri, dbName } = mongoConn();
      const client = new MongoClient(uri);
      try {
        await client.connect();
        const ptsCount = await client
          .db(dbName)
          .collection('pointstransactions')
          .countDocuments({
            orderId: new ObjectId(handle.orderId),
            userId: new ObjectId(handle.userId),
          });
        expect(ptsCount).toBeLessThanOrEqual(1);
      } finally {
        await client.close();
      }
    } finally {
      await cleanup(handle);
    }
  });
});
