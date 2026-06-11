/**
 * @requirement REQ-069 — Payments + webhooks E2E coverage (sub-issue #294)
 * @requirement REQ-049 — Webhook idempotency backstop pin (RELEASED 2026-05-28; previously zero E2E coverage)
 * @requirement SRS REQ-PAY-002 — webhook idempotency: replay returns same result without re-applying side effects
 *
 * Sends a synthetic monnify webhook twice with the same `transactionReference`
 * (idempotency key). The route handler must:
 *
 *   1st delivery: validate signature → recordWebhookEvent returns 'new' →
 *                 order paymentStatus flips pending → paid → confirmed
 *   2nd delivery: validate signature → recordWebhookEvent returns 'duplicate' →
 *                 200 response with "Event already processed" → NO side
 *                 effects (order state unchanged from after 1st delivery)
 *
 * Uses monnify because the secret is env-based (`MONNIFY_SECRET_KEY` in
 * .env.local matching the UAT server env). Paystack idempotency would need
 * the SystemSettings-stored secret; deferred to a follow-up spec.
 *
 * @requirement REQ-069
 */
import { test, expect } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
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
  paymentReference: string;
  transactionReference: string;
}

async function seedPendingOrder(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const paymentReference = `E2E-REQ069-IDEM-${Date.now()}`;
    const transactionReference = `E2E-REQ069-TXN-${Date.now()}`;
    const now = new Date();
    const result = await db.collection('orders').insertOne({
      orderNumber: `WGE69I${Date.now()}`.slice(0, 12),
      orderType: 'pickup',
      status: 'pending',
      items: [],
      subtotal: 7500,
      serviceFee: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      tipAmount: 0,
      total: 7500,
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
    return {
      orderId: String(result.insertedId),
      paymentReference,
      transactionReference,
    };
  } finally {
    await client.close();
  }
}

async function readOrder(orderId: string): Promise<{
  paymentStatus: string | null;
  status: string | null;
  paidAt: Date | null;
} | null> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const order = await client
      .db(dbName)
      .collection('orders')
      .findOne({ _id: new ObjectId(orderId) });
    if (!order) return null;
    return {
      paymentStatus: (order.paymentStatus as string) ?? null,
      status: (order.status as string) ?? null,
      paidAt: (order.paidAt as Date) ?? null,
    };
  } finally {
    await client.close();
  }
}

async function countProcessedWebhookEvents(
  transactionReference: string
): Promise<number> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await client
      .db(dbName)
      .collection('processedwebhookevents')
      .countDocuments({ eventId: transactionReference });
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
      .deleteMany({ eventId: handle.transactionReference });
  } finally {
    await client.close();
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('REQ-069 / REQ-049 — monnify webhook idempotency replay', () => {
  let handle: SeedHandle | null = null;

  test.afterEach(async () => {
    if (handle) {
      await cleanup(handle);
      handle = null;
    }
  });

  test('replay: 2nd delivery is 200 + no side-effects + idempotency row stays single', async () => {
    handle = await seedPendingOrder();
    const secret = readMonnifySecretFromEnv();

    // First delivery
    const payload = buildMonnifyEvent({
      paymentReference: handle.paymentReference,
      transactionReference: handle.transactionReference,
      amount: 7500,
      paymentStatus: 'PAID',
    });
    const rawBody = JSON.stringify(payload);
    const signature = signMonnifyPayload(rawBody, secret);

    const first = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'monnify',
      rawBody,
      signature,
    });
    expect(first.status).toBe(200);

    // Poll for the order to flip — handler does async work.
    await expect
      .poll(async () => (await readOrder(handle!.orderId))?.paymentStatus, {
        timeout: 10000,
      })
      .toBe('paid');
    const afterFirst = await readOrder(handle.orderId);
    expect(afterFirst?.status).toBe('confirmed');
    expect(afterFirst?.paidAt).not.toBeNull();
    expect(await countProcessedWebhookEvents(handle.transactionReference)).toBe(
      1
    );

    // Replay — same payload, same signature, same transactionReference.
    const second = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'monnify',
      rawBody,
      signature,
    });
    expect(second.status).toBe(200);
    expect(JSON.stringify(second.body)).toMatch(/already/i);

    // Side effects from 1st delivery preserved; no new ones from 2nd.
    const afterSecond = await readOrder(handle.orderId);
    expect(afterSecond?.paymentStatus).toBe('paid');
    expect(afterSecond?.status).toBe('confirmed');
    expect(afterSecond?.paidAt?.toString()).toBe(
      afterFirst?.paidAt?.toString()
    );
    // The dedup row count must remain exactly 1 — the route guard rejected
    // the duplicate before recording another row.
    expect(await countProcessedWebhookEvents(handle.transactionReference)).toBe(
      1
    );
  });

  test('different transactionReference for same paymentReference: NOT a dup, processed normally', async () => {
    handle = await seedPendingOrder();
    const secret = readMonnifySecretFromEnv();

    // First delivery
    const payload1 = buildMonnifyEvent({
      paymentReference: handle.paymentReference,
      transactionReference: handle.transactionReference,
      amount: 7500,
      paymentStatus: 'PAID',
    });
    const rawBody1 = JSON.stringify(payload1);
    const first = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'monnify',
      rawBody: rawBody1,
      signature: signMonnifyPayload(rawBody1, secret),
    });
    expect(first.status).toBe(200);
    await expect
      .poll(async () => (await readOrder(handle!.orderId))?.paymentStatus, {
        timeout: 10000,
      })
      .toBe('paid');

    // Second delivery — DIFFERENT transactionReference for the SAME payment reference.
    // This SHOULD NOT be deduped (idempotency keys off eventId/transactionReference).
    const newTxnRef = `${handle.transactionReference}-AGAIN`;
    const payload2 = buildMonnifyEvent({
      paymentReference: handle.paymentReference,
      transactionReference: newTxnRef,
      amount: 7500,
      paymentStatus: 'PAID',
    });
    const rawBody2 = JSON.stringify(payload2);
    const second = await sendWebhook({
      baseUrl: baseUrl(),
      provider: 'monnify',
      rawBody: rawBody2,
      signature: signMonnifyPayload(rawBody2, secret),
    });
    expect(second.status).toBe(200);
    // Both transactionReferences recorded — proves the dedup key is per-event, not per-payment.
    expect(await countProcessedWebhookEvents(handle.transactionReference)).toBe(
      1
    );
    expect(await countProcessedWebhookEvents(newTxnRef)).toBe(1);

    // Cleanup the extra dedup row.
    const { uri, dbName } = mongoConn();
    const client = new MongoClient(uri);
    try {
      await client.connect();
      await client
        .db(dbName)
        .collection('processedwebhookevents')
        .deleteMany({ eventId: newTxnRef });
    } finally {
      await client.close();
    }
  });
});
