/**
 * @requirement REQ-123 — payment_link for an abandoned payment (WA-07, #969)
 * @requirement SRS REQ-PAY-010
 *
 * A customer order still unpaid 5 minutes after checkout gets exactly one
 * `payment_link` message carrying the stable Paystack access code. The
 * in-process scheduler (server.ts) ticks every minute, so the spec seeds an
 * order made to look 6 minutes old and waits for the next tick. WhatsApp is off
 * in CI: the NotificationLog row (template, params) is the assertion. The
 * once-only claim and the 30-minute window are covered by the unit test
 * (`__tests__/jobs/expire-unpaid-orders.test.ts`).
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import {
  seedVerifiedCustomer,
  cleanupSeededCustomer,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
} from '../helpers/customer-order-seed';
import {
  seedPaystackOrder,
  cleanupPaystackOrder,
  readOrder,
  notificationRows,
  waitForNotificationRows,
} from '../helpers/paystack-lifecycle';

test.describe('[REQ-123] abandoned payment link', () => {
  test('[REQ-123][AC7] [US-A2.19] one payment_link is logged with the stable access code, then no second', async () => {
    tagTest('REQ-123', 7);
    test.setTimeout(240_000);
    const customer = await seedVerifiedCustomer({ name: 'Adaeze Obi' });
    const itemId = await seedPricedMenuItem(5000);
    const order = await seedPaystackOrder({
      userId: customer._id,
      itemId,
      total: 5000,
      ageMinutes: 6,
      stored: {
        checkoutUrl: 'https://checkout.paystack.com/e2elink123',
        accessCode: 'e2elink123',
      },
    });
    try {
      // The job runs once a minute (first tick about a minute after boot).
      const rows = await waitForNotificationRows(
        customer._id,
        'payment_link',
        1,
        200_000
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].templateParams.body[1]).toBe('₦5,000');
      expect(Number(rows[0].templateParams.body[2])).toBeGreaterThan(0);
      expect(Number(rows[0].templateParams.body[2])).toBeLessThanOrEqual(25);
      expect(rows[0].templateParams.buttons).toEqual([
        { index: 0, params: ['e2elink123'] },
      ]);

      const sent = await readOrder(order._id);
      expect(sent.paymentLinkSentAt).toBeTruthy();
      expect(sent.status).toBe('pending');

      await new Promise((r) => setTimeout(r, 2000));
      expect(await notificationRows(customer._id, 'payment_link')).toHaveLength(
        1
      );
    } finally {
      await cleanupPaystackOrder(order, customer._id);
      await cleanupMenuItem(itemId);
      await cleanupSeededCustomer(customer);
    }
  });
});
