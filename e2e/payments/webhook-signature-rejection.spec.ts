/**
 * @requirement REQ-069 — Payments + webhooks E2E coverage (sub-issue #294)
 * @requirement SRS REQ-PAY-002 — webhook signature validation rejects forged payloads
 *
 * Sends a synthetic webhook with a deliberately-wrong signature header to
 * both /api/webhooks/paystack and /api/webhooks/monnify. The route handlers
 * must return 401 and NOT mutate any order state.
 *
 * No secret needed — the test sends garbage signatures and expects 401.
 * This pins the signature-verification path end-to-end (HTTP layer + handler).
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { sendWebhook } from '../helpers/webhook-mock';
import {
  buildPaystackChargeSuccess,
  buildMonnifyEvent,
} from '../helpers/payment-provider-mock';

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
  const candidate =
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  return candidate.replace(/\/$/, '');
}

interface SeedHandle {
  orderId: string;
  paymentReference: string;
}

async function seedPendingOrder(suffix: string): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const paymentReference = `E2E-REQ069-SIG-${suffix}-${Date.now()}`;
    const now = new Date();
    const result = await db.collection('orders').insertOne({
      orderNumber: `WGE69S${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'pending',
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
      statusHistory: [{ status: 'pending', timestamp: now }],
      kitchenPriority: 'normal',
      createdAt: now,
      updatedAt: now,
    });
    return { orderId: String(result.insertedId), paymentReference };
  } finally {
    await client.close();
  }
}

async function readOrderPaymentStatus(orderId: string): Promise<string | null> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const order = await client
      .db(dbName)
      .collection('orders')
      .findOne(
        { _id: new ObjectId(orderId) },
        { projection: { paymentStatus: 1 } }
      );
    return (order?.paymentStatus as string) ?? null;
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
      .collection('processedwebhookevents')
      .deleteMany({ paymentReference: handle.paymentReference });
  } finally {
    await client.close();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('REQ-069 SRS REQ-PAY-002 — webhook signature rejection', () => {
  let handle: SeedHandle | null = null;

  test.afterEach(async () => {
    if (handle) {
      await cleanup(handle);
      handle = null;
    }
  });

  test('paystack: invalid signature → 401, order paymentStatus unchanged', async () => {
    handle = await seedPendingOrder('pst');

    const payload = buildPaystackChargeSuccess({
      reference: handle.paymentReference,
      amount: 500000,
    });

    const response = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'paystack',
      rawBody: JSON.stringify(payload),
      signature:
        '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    });

    expect(response.status).toBe(401);
    expect(await readOrderPaymentStatus(handle.orderId)).toBe('pending');
  });

  test('monnify: invalid signature → 401, order paymentStatus unchanged', async () => {
    handle = await seedPendingOrder('mny');

    const payload = buildMonnifyEvent({
      paymentReference: handle.paymentReference,
      amount: 7500,
      paymentStatus: 'PAID',
    });

    const response = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'monnify',
      rawBody: JSON.stringify(payload),
      signature: 'thisisnotavalidsignature',
    });

    expect(response.status).toBe(401);
    expect(await readOrderPaymentStatus(handle.orderId)).toBe('pending');
  });

  test('paystack: missing signature header → 401', async () => {
    handle = await seedPendingOrder('pst-miss');

    const payload = buildPaystackChargeSuccess({
      reference: handle.paymentReference,
    });

    const response = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'paystack',
      rawBody: JSON.stringify(payload),
      signature: '',
    });

    expect(response.status).toBe(401);
    expect(await readOrderPaymentStatus(handle.orderId)).toBe('pending');
  });
});
