/**
 * @requirement REQ-123 — Paystack payment at checkout and the paid-only kitchen gate (WA-07, #969)
 * @requirement SRS REQ-PAY-005, REQ-PAY-006, REQ-PAY-007, REQ-PAY-008
 *
 * Transport-layer lifecycle of a customer order's payment:
 *
 *   - the same Paystack reference and checkout URL come back for a second Pay
 *   - a validly signed `charge.success` marks the order paid and confirmed,
 *     emits to the kitchen once, and logs `order_confirmation` then `receipt`
 *   - a replay changes nothing
 *   - a paid amount that differs from the order total is not confirmed and
 *     raises an Incident
 *   - an unknown reference returns 404 and writes no dedup row, so the retry
 *     succeeds once the order exists
 *
 * The webhook secret lives in SystemSettings, so the spec installs a known test
 * secret and restores the original. CI runs with WhatsApp off: the
 * NotificationLog row (template, params) is the assertion, not delivery.
 * The live Paystack transaction creation (real network call) is covered by unit
 * tests and the UAT live round-trip, not by this spec.
 */
import { test, expect } from '@playwright/test';
import type { Socket } from 'socket.io-client';
import { ApiKeyService } from '@/services/api-key-service';
import { tagTest } from '../helpers/test-tags';
import { withMongo } from '../helpers/db-assertions';
import {
  seedVerifiedCustomer,
  cleanupSeededCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
} from '../helpers/customer-order-seed';
import {
  baseUrl,
  installPaystackSecret,
  chargeSuccessBody,
  postPaystackWebhook,
  seedPaystackOrder,
  cleanupPaystackOrder,
  readOrder,
  waitForNotificationRows,
  notificationRows,
  processedEventCount,
  incidentsFor,
  type PaystackOrder,
} from '../helpers/paystack-lifecycle';
import { connectClient, disconnectAll } from '../helpers/socket-listener';

const SYSTEM_USER_ID = '694541440042c70ca0fe8c35';

test.describe.configure({ mode: 'serial' });

test.describe('[REQ-123] Paystack payment lifecycle', () => {
  let restoreSecret: () => Promise<void>;
  let customer: SeededCustomerForSession;
  let itemId: string;
  let apiKey = '';
  let apiKeyDocId = '';
  let seq = 0;

  test.beforeAll(async () => {
    restoreSecret = await installPaystackSecret();
    customer = await seedVerifiedCustomer();
    itemId = await seedPricedMenuItem(5000);
    const key = await ApiKeyService.createKey(
      {
        name: `e2e-req123-${Date.now()}`,
        role: 'admin',
        scopes: ['payments:write'],
        rateLimit: 300,
      },
      SYSTEM_USER_ID
    );
    apiKey = key.plainKey;
    apiKeyDocId = key.apiKey._id;
  });

  test.afterAll(async () => {
    if (apiKeyDocId) {
      await ApiKeyService.revokeKey(apiKeyDocId, SYSTEM_USER_ID);
      await ApiKeyService.deleteKey(apiKeyDocId);
    }
    await cleanupMenuItem(itemId);
    await cleanupSeededCustomer(customer);
    await restoreSecret();
  });

  const eventId = () => Date.now() * 10 + ++seq;

  test('[REQ-123][AC1][AC2] [US-A2.13] pressing Pay again returns the same Paystack reference and checkout URL', async () => {
    tagTest('REQ-123', [1, 2]);
    const order: PaystackOrder = await seedPaystackOrder({
      userId: customer._id,
      itemId,
      stored: {
        checkoutUrl: 'https://checkout.paystack.com/e2e123abc',
        accessCode: 'e2e123abc',
      },
    });
    try {
      const pay = () =>
        fetch(`${baseUrl()}/api/public/payments`, {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            orderId: order._id.toString(),
            customerName: 'E2E Customer',
            customerEmail: 'e2e@example.com',
            redirectUrl: 'https://example.com/back',
          }),
        });
      const first = await pay();
      const second = await pay();
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      const a = (await first.json()).data;
      const b = (await second.json()).data;
      expect(a.provider).toBe('paystack');
      expect(a.checkoutUrl).toBe('https://checkout.paystack.com/e2e123abc');
      expect(b.checkoutUrl).toBe(a.checkoutUrl);
      expect(b.paymentReference).toBe(a.paymentReference);
    } finally {
      await cleanupPaystackOrder(order, customer._id);
    }
  });

  test('[REQ-123][AC3][AC4] [US-A2.14] a valid signed charge.success pays and confirms the order, emits to the kitchen once and logs order_confirmation then receipt', async () => {
    tagTest('REQ-123', [3, 4]);
    const order = await seedPaystackOrder({ userId: customer._id, itemId });
    const id = eventId();
    const sockets: Socket[] = [];
    try {
      const kitchen = await connectClient(baseUrl());
      sockets.push(kitchen);
      kitchen.emit('kitchen:subscribe');
      const created: Array<{ orderNumber?: string }> = [];
      kitchen.on('kitchen:new-order', (p) => created.push(p));
      await new Promise((r) => setTimeout(r, 300));

      const res = await postPaystackWebhook(
        chargeSuccessBody({
          reference: order.reference,
          amountKobo: 500000,
          eventId: id,
        })
      );
      expect(res.status).toBe(200);

      const paid = await readOrder(order._id);
      expect(paid.paymentStatus).toBe('paid');
      expect(paid.status).toBe('confirmed');
      expect(paid.transactionReference).toBe(String(id));
      expect(paid.paidAt).toBeTruthy();

      const confirmations = await waitForNotificationRows(
        customer._id,
        'order_confirmation',
        1
      );
      const receipts = await waitForNotificationRows(
        customer._id,
        'receipt',
        1
      );
      expect(confirmations).toHaveLength(1);
      expect(confirmations[0].templateParams.body[0]).toBe(order.orderNumber);
      expect(confirmations[0].templateParams.body[1]).toBe('₦5,000');
      expect(receipts).toHaveLength(1);
      expect(receipts[0].templateParams.header).toEqual([order.orderNumber]);
      expect(receipts[0].attemptedAt.getTime()).toBeGreaterThanOrEqual(
        confirmations[0].attemptedAt.getTime()
      );

      await new Promise((r) => setTimeout(r, 1500));
      const mine = created.filter((e) => e.orderNumber === order.orderNumber);
      expect(mine).toHaveLength(1);
    } finally {
      disconnectAll(sockets);
      await cleanupPaystackOrder(order, customer._id, [id]);
    }
  });

  test('[REQ-123][AC3] [US-A2.15] a replayed webhook processes nothing twice', async () => {
    tagTest('REQ-123', 3);
    const order = await seedPaystackOrder({ userId: customer._id, itemId });
    const id = eventId();
    const body = chargeSuccessBody({
      reference: order.reference,
      amountKobo: 500000,
      eventId: id,
    });
    try {
      const first = await postPaystackWebhook(body);
      const replay = await postPaystackWebhook(body);
      expect(first.status).toBe(200);
      expect(replay.status).toBe(200);
      expect(String(replay.body.message)).toMatch(/already processed/i);

      await waitForNotificationRows(customer._id, 'receipt', 1);
      await new Promise((r) => setTimeout(r, 1000));
      expect(
        await notificationRows(customer._id, 'order_confirmation')
      ).toHaveLength(1);
      expect(await notificationRows(customer._id, 'receipt')).toHaveLength(1);
      expect(await processedEventCount(id)).toBe(1);
    } finally {
      await cleanupPaystackOrder(order, customer._id, [id]);
    }
  });

  test('[REQ-123][AC3] [US-A2.16] an amount that differs from the order total is not confirmed and raises an Incident', async () => {
    tagTest('REQ-123', 3);
    const order = await seedPaystackOrder({ userId: customer._id, itemId });
    const id = eventId();
    try {
      const res = await postPaystackWebhook(
        chargeSuccessBody({
          reference: order.reference,
          amountKobo: 100000, // ₦1,000 paid for a ₦5,000 order
          eventId: id,
        })
      );
      expect(res.status).toBe(200);

      const row = await readOrder(order._id);
      expect(row.paymentStatus).toBe('payment_mismatch');
      expect(row.status).toBe('pending');

      const incidents = await incidentsFor(
        order._id.toString(),
        'payment_mismatch'
      );
      expect(incidents).toHaveLength(1);
      expect(incidents[0].errorDetails).toMatchObject({
        paidKobo: 100000,
        expectedKobo: 500000,
      });
      await new Promise((r) => setTimeout(r, 800));
      expect(
        await notificationRows(customer._id, 'order_confirmation')
      ).toHaveLength(0);
    } finally {
      await cleanupPaystackOrder(order, customer._id, [id]);
    }
  });

  test('[REQ-123][AC3] [US-A2.17] an unknown reference returns 404 with no dedup row, and the retry succeeds once the order exists', async () => {
    tagTest('REQ-123', 3);
    const id = eventId();
    const reference = `E2E-REQ123-LATE-${id}`;
    const body = chargeSuccessBody({
      reference,
      amountKobo: 500000,
      eventId: id,
    });
    const order = await seedPaystackOrder({
      userId: customer._id,
      itemId,
      reference: `E2E-REQ123-OTHER-${id}`,
    });
    try {
      const miss = await postPaystackWebhook(body);
      expect(miss.status).toBe(404);
      expect(await processedEventCount(id)).toBe(0);

      // The order's reference now exists (as if Paystack's retry came later).
      await withMongo((db) =>
        db
          .collection('orders')
          .updateOne(
            { _id: order._id },
            { $set: { paymentReference: reference } }
          )
      );
      const retry = await postPaystackWebhook(body);
      expect(retry.status).toBe(200);
      expect((await readOrder(order._id)).paymentStatus).toBe('paid');
      expect(await processedEventCount(id)).toBe(1);
    } finally {
      await cleanupPaystackOrder(order, customer._id, [id]);
    }
  });

  test('[REQ-123][AC3] a webhook with a bad signature is rejected and changes nothing', async () => {
    tagTest('REQ-123', 3);
    const order = await seedPaystackOrder({ userId: customer._id, itemId });
    const id = eventId();
    try {
      const res = await postPaystackWebhook(
        chargeSuccessBody({
          reference: order.reference,
          amountKobo: 500000,
          eventId: id,
        }),
        'not-the-secret'
      );
      expect(res.status).toBe(401);
      expect((await readOrder(order._id)).paymentStatus).toBe('pending');
      expect(await processedEventCount(id)).toBe(0);
    } finally {
      await cleanupPaystackOrder(order, customer._id, [id]);
    }
  });
});
