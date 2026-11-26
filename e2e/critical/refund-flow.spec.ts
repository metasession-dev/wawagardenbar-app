/**
 * @requirement REQ-128 — Customer cancellation and Paystack refunds (WA-11, #973)
 * @requirement SRS REQ-PAY-011, REQ-PAY-012, REQ-PAY-013, REQ-PAY-014, REQ-WA-019
 *
 * The refund journey end to end, with Paystack simulated (the e2e stack installs
 * the `sk_test_e2e_` secret, so no refund call leaves the process) and WhatsApp
 * off: the NotificationLog row (template, params) is the assertion.
 *
 *   - a customer texts "cancel" for a paid confirmed order: the order is cancelled,
 *     a full refund is requested once, `order_cancelled` is logged (AC2, AC5)
 *   - `refund.processed` makes the order `refunded` and logs `refund_processed`;
 *     a replay changes nothing (AC1, AC5)
 *   - a cancel after preparation only creates a refund-request ticket (AC3)
 *   - a manager approves a partial ₦2,000 from the ticket; a csr cannot decide (AC3, AC4)
 *   - a manager refunds from the order page; the customer cancels on the order page
 *   - `refund.failed` leaves the order paid and alerts staff (AC1)
 */
import { test, expect } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
import {
  seedVerifiedCustomer,
  cleanupSeededCustomer,
  attachCustomerSessionToContext,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
} from '../helpers/customer-order-seed';
import {
  baseUrl,
  installPaystackSecret,
  cleanupPaystackOrder,
  readOrder,
  waitForNotificationRows,
  notificationRows,
  type PaystackOrder,
} from '../helpers/paystack-lifecycle';
import {
  seedActiveCustomer,
  cleanupCustomer,
  sendInbound,
  incomingRow,
  type ActiveCustomer,
} from '../helpers/whatsapp-inbound-seed';
import {
  createStaff,
  deleteStaff,
  loginAsStaff,
  type ThrowawayStaff,
} from '../helpers/staff-roles';
import {
  seedPaidPaystackOrder,
  refundsFor,
  waitForRefunds,
  sendRefundWebhook,
  readTicket,
  refundTicketsFor,
  cleanupRefundData,
} from '../helpers/refund-seed';

test.describe.configure({ mode: 'serial' });

test.describe('[REQ-128] refunds', () => {
  let restoreSecret: () => Promise<void>;
  let itemId: string;
  let waCustomer: ActiveCustomer;
  let webCustomer: SeededCustomerForSession;
  let manager: ThrowawayStaff;
  let csr: ThrowawayStaff;
  const orders: PaystackOrder[] = [];
  const tickets: string[] = [];

  const newOrder = async (
    userId: string,
    status: 'confirmed' | 'preparing' = 'confirmed'
  ) => {
    const o = await seedPaidPaystackOrder({ userId, itemId, status });
    orders.push(o);
    return o;
  };

  test.beforeAll(async () => {
    restoreSecret = await installPaystackSecret();
    itemId = await seedPricedMenuItem(5000);
    waCustomer = await seedActiveCustomer();
    webCustomer = await seedVerifiedCustomer();
    manager = await createStaff('refund-mgr', ['manager']);
    csr = await createStaff('refund-csr', ['csr']);
  });

  test.afterAll(async () => {
    await cleanupRefundData(
      orders.map((o) => o._id),
      tickets
    );
    for (const o of orders) {
      await cleanupPaystackOrder(o, waCustomer.userId);
      await cleanupPaystackOrder(o, webCustomer._id);
    }
    await cleanupMenuItem(itemId);
    await cleanupCustomer(waCustomer);
    await cleanupSeededCustomer(webCustomer);
    await deleteStaff(manager.id, csr.id);
    await withMongo((db) =>
      db.collection('auditlogs').deleteMany({
        action: { $in: ['refund.requested', 'refund.approved'] },
        userId: { $in: [new ObjectId(manager.id)] },
      })
    );
    await restoreSecret();
  });

  let cancelled: PaystackOrder;
  let cancelledRefund: any;

  test('[REQ-128][AC2][AC5] [US-A4.9] texting "cancel" for a paid confirmed order cancels it, requests one full refund and logs order_cancelled', async ({
    request,
  }) => {
    tagTest('REQ-128', [2, 5]);
    cancelled = await newOrder(waCustomer.userId);

    const id = await sendInbound(request, waCustomer.phone, 'cancel');
    const row = await incomingRow(id);
    expect(row.classifiedIntent).toBe('order_cancel');
    expect(row.actionTaken).toBe('cancelled_refund_started');

    const order = await readOrder(cancelled._id);
    expect(order.status).toBe('cancelled');
    // The order says paid until Paystack confirms the refund (ADR-015).
    expect(order.paymentStatus).toBe('paid');

    const rows = await waitForRefunds(cancelled._id, 1);
    expect(rows).toHaveLength(1);
    cancelledRefund = rows[0];
    expect(cancelledRefund).toMatchObject({
      type: 'full',
      status: 'pending',
      amountKobo: 500000,
      source: 'whatsapp_cancel',
      transactionReference: cancelled.reference,
    });
    expect(cancelledRefund.paystackRefundId).toMatch(/^\d{10}$/);

    const logs = await waitForNotificationRows(
      waCustomer.userId,
      'order_cancelled',
      1
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].templateParams.body[0]).toBe(cancelled.orderNumber);
    expect(logs[0].templateParams.body[1]).toContain('full refund of ₦5,000');

    // texting it again does not refund twice
    const again = await sendInbound(request, waCustomer.phone, 'cancel');
    await incomingRow(again);
    expect(await refundsFor(cancelled._id)).toHaveLength(1);
  });

  test('[REQ-128][AC1][AC5] [US-A4.10] refund.processed makes the order refunded and logs refund_processed; a replay changes nothing', async () => {
    tagTest('REQ-128', [1, 5]);
    const first = await sendRefundWebhook('refund.processed', cancelledRefund);
    expect(first.status).toBe(200);

    const order = await readOrder(cancelled._id);
    expect(order.paymentStatus).toBe('refunded');
    const [refund] = await refundsFor(cancelled._id);
    expect(refund.status).toBe('processed');

    const logs = await waitForNotificationRows(
      waCustomer.userId,
      'refund_processed',
      1
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].templateParams.body).toEqual([
      '₦5,000',
      cancelled.orderNumber,
    ]);

    const replay = await sendRefundWebhook('refund.processed', cancelledRefund);
    expect(replay.status).toBe(200);
    await new Promise((r) => setTimeout(r, 1000));
    expect(
      await notificationRows(waCustomer.userId, 'refund_processed')
    ).toHaveLength(1);
    // the dedup key is `refund:<event>:<paystack refund id>`
    const dedup = await withMongo<number>((db) =>
      db.collection('processedwebhookevents').countDocuments({
        eventId: `refund:refund.processed:${cancelledRefund.paystackRefundId}`,
      })
    );
    expect(dedup).toBe(1);
  });

  let preparing: PaystackOrder;
  let requestTicketId: string;

  test('[REQ-128][AC3] [US-A4.11] cancelling after preparation began creates a refund-request ticket and moves no money', async ({
    request,
  }) => {
    tagTest('REQ-128', 3);
    preparing = await newOrder(waCustomer.userId, 'preparing');

    const id = await sendInbound(request, waCustomer.phone, 'cancel');
    const row = await incomingRow(id);
    expect(row.actionTaken).toBe('cancel_request_created');

    const ticketsFound = await refundTicketsFor(preparing._id);
    expect(ticketsFound).toHaveLength(1);
    requestTicketId = String(ticketsFound[0]._id);
    tickets.push(requestTicketId);
    expect(ticketsFound[0].refundRequest.status).toBe('pending');
    expect(await refundsFor(preparing._id)).toHaveLength(0);
    const order = await readOrder(preparing._id);
    expect(order.status).toBe('preparing');
    expect(order.paymentStatus).toBe('paid');

    // asking again does not create a second request
    const again = await sendInbound(request, waCustomer.phone, 'cancel');
    await incomingRow(again);
    expect(await refundTicketsFor(preparing._id)).toHaveLength(1);
  });

  test('[REQ-128][AC3][AC4] [US-B3.1] a manager approves a partial ₦2,000 refund from the request; the order becomes partially_refunded once Paystack confirms', async ({
    browser,
  }) => {
    tagTest('REQ-128', [3, 4]);
    const { context, page } = await loginAsStaff(browser, manager);
    try {
      await page.goto(`/dashboard/support/${requestTicketId}`);
      await expect(
        page.getByText('Refund request', { exact: true })
      ).toBeVisible();
      await page.locator('#partial-amount').fill('2000');
      await evidenceShot(page, 'REQ-128', 3, 'refund-request-panel');
      await page.getByRole('button', { name: 'Approve partial' }).click();

      const rows = await waitForRefunds(preparing._id, 1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        type: 'partial',
        amountKobo: 200000,
        status: 'pending',
        source: 'request_approval',
      });
      expect(String(rows[0].approvedBy)).toBe(manager.id);
      const ticket = await readTicket(requestTicketId);
      expect(ticket.refundRequest.status).toBe('approved');

      const hook = await sendRefundWebhook('refund.processed', rows[0]);
      expect(hook.status).toBe(200);
      const order = await readOrder(preparing._id);
      expect(order.paymentStatus).toBe('partially_refunded');

      const audit = await withMongo<any[]>((db) =>
        db
          .collection('auditlogs')
          .find({
            resourceId: preparing._id.toString(),
            action: { $in: ['refund.requested', 'refund.approved'] },
          })
          .toArray()
      );
      expect(audit.map((a: any) => a.action).sort()).toEqual([
        'refund.approved',
        'refund.requested',
      ]);
    } finally {
      await context.close();
    }
  });

  let second: PaystackOrder;

  test('[REQ-128][AC4] [US-B3.2] a csr without the manager role cannot decide a request or see the Refund action', async ({
    browser,
    request,
  }) => {
    tagTest('REQ-128', 4);
    second = await newOrder(waCustomer.userId, 'preparing');
    const id = await sendInbound(request, waCustomer.phone, 'cancel');
    await incomingRow(id);
    const [t] = await refundTicketsFor(second._id);
    tickets.push(String(t._id));

    const { context, page } = await loginAsStaff(browser, csr);
    try {
      await page.goto(`/dashboard/support/${t._id}`);
      await expect(
        page.getByText('waiting for a manager, admin or super-admin')
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Approve full refund' })
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Approve partial' })
      ).toHaveCount(0);
      await evidenceShot(page, 'REQ-128', 4, 'csr-cannot-decide');

      await page.goto(`/dashboard/orders/${second._id}`);
      await expect(page.getByText(second.orderNumber).first()).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Refund', exact: true })
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
    expect(await refundsFor(second._id)).toHaveLength(0);
  });

  test('[REQ-128][AC4][AC6] [US-B3.1] a manager refunds part of a paid order from the order page, with a reason', async ({
    browser,
  }) => {
    tagTest('REQ-128', [4, 6]);
    const { context, page } = await loginAsStaff(browser, manager);
    try {
      await page.goto(`/dashboard/orders/${second._id}`);
      await page.getByRole('button', { name: 'Refund', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Partial refund' }).click();
      await dialog.locator('#refund-amount').fill('1000');
      await dialog
        .locator('#refund-reason')
        .fill('Missing item reported by phone');
      await evidenceShot(page, 'REQ-128', 4, 'manager-refund-dialog');
      await dialog.getByRole('button', { name: 'Refund', exact: true }).click();

      const rows = await waitForRefunds(second._id, 1);
      expect(rows[0]).toMatchObject({
        type: 'partial',
        amountKobo: 100000,
        source: 'staff',
        reason: 'Missing item reported by phone',
      });
      expect(String(rows[0].approvedBy)).toBe(manager.id);
    } finally {
      await context.close();
    }
  });

  let webOrder: PaystackOrder;

  test('[REQ-128][AC2][AC5] [US-A4.9] the signed-in customer cancels a paid confirmed order on the order page and gets a full refund', async ({
    browser,
  }) => {
    tagTest('REQ-128', [2, 5]);
    webOrder = await newOrder(webCustomer._id);
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    try {
      await attachCustomerSessionToContext(context, webCustomer, baseUrl());
      const page = await context.newPage();
      await page.goto(`/orders/${webOrder._id}`);
      await page.getByRole('button', { name: 'Cancel Order' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('full refund')).toBeVisible();
      await dialog.locator('textarea').fill('Changed my mind about this order');
      await evidenceShot(page, 'REQ-128', 2, 'customer-cancel-dialog');
      await dialog.getByRole('button', { name: 'Cancel Order' }).last().click();

      const rows = await waitForRefunds(webOrder._id, 1);
      expect(rows[0]).toMatchObject({
        type: 'full',
        amountKobo: 500000,
        source: 'customer_cancel',
      });
      const order = await readOrder(webOrder._id);
      expect(order.status).toBe('cancelled');
      const logs = await waitForNotificationRows(
        webCustomer._id,
        'order_cancelled',
        1
      );
      expect(logs.length).toBeGreaterThanOrEqual(1);
    } finally {
      await context.close();
    }
  });

  test('[REQ-128][AC1] refund.failed leaves the order paid, frees the amount and alerts staff', async () => {
    tagTest('REQ-128', 1);
    const [refund] = await refundsFor(webOrder._id);
    const hook = await sendRefundWebhook('refund.failed', refund);
    expect(hook.status).toBe(200);

    const [after] = await refundsFor(webOrder._id);
    expect(after.status).toBe('failed');
    const order = await readOrder(webOrder._id);
    expect(order.paymentStatus).toBe('paid');
    expect(order.refundReservedKobo ?? 0).toBe(0);
    const alerts = await withMongo<any[]>((db) =>
      db
        .collection('staffnotifications')
        .find({ type: 'refund', refId: String(refund._id) })
        .toArray()
    );
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  test('[REQ-128][AC1] an unknown refund answers 404 so Paystack retries, and a bad signature is refused', async () => {
    tagTest('REQ-128', 1);
    const unknown = await sendRefundWebhook('refund.processed', {
      paystackRefundId: '123',
      transactionReference: 'E2E-REQ128-NO-SUCH-REFERENCE',
      amountKobo: 1000,
    });
    expect(unknown.status).toBe(404);

    const body = JSON.stringify({
      event: 'refund.processed',
      data: { id: 1, transaction_reference: 'x' },
    });
    const res = await fetch(`${baseUrl()}/api/webhooks/paystack`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paystack-signature': 'bad',
      },
      body,
    });
    expect(res.status).toBe(401);
  });
});
