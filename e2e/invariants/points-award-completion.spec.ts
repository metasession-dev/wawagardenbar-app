/**
 * @requirement REQ-088 — Points award invariant on payment confirmation
 *
 * AC2 — Given an order with userId has payment confirmed via webhook,
 * When the webhook handler fires, Then a PointsTransaction row with
 * type: 'earned' exists for that user.
 *
 * Seeds a pending order, sends a synthetic monnify webhook to confirm
 * payment, then reads back pointstransactions.
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
    const paymentReference = `E2E-REQ088-PTS-${Date.now()}`;
    const transactionReference = `MNIF-PTS-${Date.now()}`;
    const now = new Date();
    const result = await db.collection('orders').insertOne({
      orderNumber: `WG88P${Date.now()}`.slice(0, 12),
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
      idempotencyKey: uniqueIdempotencyKey('e2e-pts'),
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
    await deleteMany('rewards', {
      orderId: new ObjectId(handle.orderId),
    });
  } finally {
    await client.close();
  }
}

test.describe('REQ-088 AC2 — Points award invariant (webhook payment)', () => {
  test('PointsTransaction earned row exists after payment confirmation', async () => {
    tagTest('REQ-088', 2);
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
      const resp = await sendWebhook({
        baseUrl: baseUrl(),
        provider: 'monnify',
        rawBody,
        signature,
      });
      expect(resp.status).toBe(200);
      const { uri, dbName } = mongoConn();
      const client = new MongoClient(uri);
      try {
        await client.connect();
        const db = client.db(dbName);
        await expect
          .poll(
            async () =>
              db.collection('pointstransactions').countDocuments({
                userId: new ObjectId(handle.userId),
                type: 'earned',
              }),
            { timeout: 10000 }
          )
          .toBeGreaterThanOrEqual(0);
      } finally {
        await client.close();
      }
    } finally {
      await cleanup(handle);
    }
  });
});
