/**
 * @requirement REQ-122 - Staff notifications (AC1, AC2, AC3, AC5)
 * @srs REQ-DASH-003, REQ-DASH-004, REQ-DASH-005, REQ-DASH-006
 *
 * A customer order is paid by a signed provider webhook, exactly as in
 * production, and the dashboard of a signed-in staff member shows the alert:
 * a live bell count, a toast, a Needs-attention panel, and Acknowledge.
 * WhatsApp is off in this environment, so nothing is sent to Meta; escalation
 * timing is covered by the unit tests with fake timers.
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
import {
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  cleanupMenuItem,
  cleanupOrderAndAlerts,
  seedPricedMenuItem,
  seedUnpaidOrder,
} from '../helpers/customer-order-seed';
import {
  createStaff,
  deleteStaff,
  loginAsStaff,
  type ThrowawayStaff,
} from '../helpers/staff-roles';
import {
  ensurePaystackSecret,
  payViaPaystackWebhook,
} from '../helpers/customer-journey';

test.describe.configure({ timeout: 120_000 });

let customer: SeededCustomerForSession;
let itemId: string;
let paystack: Awaited<ReturnType<typeof ensurePaystackSecret>>;
const staff: ThrowawayStaff[] = [];
const orders: ObjectId[] = [];

test.beforeAll(async () => {
  customer = await seedVerifiedCustomer();
  itemId = await seedPricedMenuItem(5000);
  paystack = await ensurePaystackSecret();
});

test.afterAll(async () => {
  for (const id of orders) await cleanupOrderAndAlerts(id);
  await deleteStaff(...staff.map((s) => s.id));
  await withMongo(async (db) => {
    await db
      .collection('staffnotifications')
      .deleteMany({ createdAt: { $gte: new Date(Date.now() - 3600_000) } });
  });
  await paystack?.restore();
  await cleanupMenuItem(itemId);
  await cleanupSeededCustomer(customer);
});

async function staffPage(browser: Browser, roles: ThrowawayStaff['roles']) {
  const member = await createStaff('alerts', roles);
  staff.push(member);
  const session = await loginAsStaff(browser, member);
  return { member, ...session };
}

/** A customer order that the provider then confirms as paid. */
async function payCustomerOrder(
  origin: 'customer' | 'staff' = 'customer'
): Promise<{ _id: ObjectId; orderNumber: string }> {
  const order = await seedUnpaidOrder({
    userId: customer._id,
    itemId,
    origin,
  });
  orders.push(order._id);
  const { status, paidOrder } = await payViaPaystackWebhook(
    order,
    paystack.secret
  );
  expect(status).toBe(200);
  expect(paidOrder.paymentStatus).toBe('paid');
  return order;
}

async function notificationsFor(orderId: ObjectId) {
  return withMongo(async (db) =>
    db
      .collection('staffnotifications')
      .find({ refId: orderId.toString() })
      .toArray()
  );
}

const bellCount = (page: Page) => page.getByTestId('staff-bell-count');

/** The unread count now (0 when the badge is not shown). Other specs pay orders
 *  too, so counts are compared to a baseline, never to an absolute number. */
async function currentCount(page: Page): Promise<number> {
  return (await bellCount(page).count())
    ? Number(await bellCount(page).innerText())
    : 0;
}

/** The bell list has a link to this order. */
function orderLink(page: Page, orderNumber: string) {
  return page
    .getByTestId('staff-bell-list')
    .getByRole('link', { name: new RegExp(orderNumber) });
}

test.describe('[REQ-122] staff notifications', () => {
  test('[REQ-122][AC1][AC2] [US-B5.3] a paid customer order raises one alert: the csr bell count rises live, a toast shows and the item links to the order', async ({
    browser,
  }) => {
    tagTest('REQ-122', [1, 2]);
    const { context, page } = await staffPage(browser, ['csr']);
    try {
      await page.goto('/dashboard/orders');
      await page.waitForLoadState('networkidle');
      const before = await currentCount(page);

      const order = await payCustomerOrder();

      // Live: the signal (or the 30 s refresh) brings the count up by one.
      await expect
        .poll(() => currentCount(page), { timeout: 60000 })
        .toBe(before + 1);
      await expect(
        page
          .getByRole('status')
          .filter({ hasText: /New order/ })
          .first()
      ).toBeVisible({ timeout: 15000 });
      await evidenceShot(page, 'REQ-122', 2, 'bell-count-and-toast');

      // The tab title carries the unread count.
      await expect.poll(() => page.title()).toMatch(/^\(\d+\)/);

      // The list names the order and links to it.
      await page.getByTestId('staff-bell').click();
      const item = orderLink(page, order.orderNumber);
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute(
        'href',
        `/dashboard/orders/${order._id.toString()}`
      );
      await evidenceShot(page, 'REQ-122', 1, 'alert-raised-for-paid-order');

      // Exactly one notification exists for the order, for the order rule's roles.
      const rows = await notificationsFor(order._id);
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe('order');
      expect(rows[0].targetRoles).toEqual(
        expect.arrayContaining(['kitchen', 'csr'])
      );
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC1][AC2] an alert reaches kitchen and csr and no other role', async ({
    browser,
  }) => {
    tagTest('REQ-122', [1, 2]);
    const order = await payCustomerOrder();
    const kitchen = await staffPage(browser, ['kitchen']);
    const manager = await staffPage(browser, ['manager']);
    try {
      await kitchen.page.goto('/dashboard/orders');
      await kitchen.page.waitForLoadState('networkidle');
      await kitchen.page.getByTestId('staff-bell').click();
      await expect(orderLink(kitchen.page, order.orderNumber)).toBeVisible({
        timeout: 20000,
      });

      // A manager is not in the order rule's roles: nothing for them.
      await manager.page.goto('/dashboard/orders');
      await manager.page.waitForLoadState('networkidle');
      await expect(bellCount(manager.page)).toHaveCount(0);
      await manager.page.getByTestId('staff-bell').click();
      await expect(
        manager.page.getByText('Nothing needs your attention.')
      ).toBeVisible();
      await expect(manager.page.getByTestId('needs-attention')).toHaveCount(0);
    } finally {
      await kitchen.context.close();
      await manager.context.close();
    }
  });

  test('[REQ-122][AC1] a staff-created order raises no alert', async () => {
    tagTest('REQ-122', 1);
    const order = await payCustomerOrder('staff');
    expect(await notificationsFor(order._id)).toHaveLength(0);
  });

  test('[REQ-122][AC1] a retried payment webhook does not alert twice', async () => {
    tagTest('REQ-122', 1);
    const order = await payCustomerOrder();
    // The provider delivers the same event again.
    await payViaPaystackWebhook(
      { ...order, total: 5000 },
      paystack.secret
    ).catch(() => undefined);
    expect(await notificationsFor(order._id)).toHaveLength(1);
  });

  test('[REQ-122][AC3] [US-B5.4] an unacknowledged item appears in Needs attention with the minutes it has waited', async ({
    browser,
  }) => {
    tagTest('REQ-122', 3);
    const { context, page } = await staffPage(browser, ['csr']);
    try {
      const order = await payCustomerOrder();
      // Make it have waited a while.
      await withMongo(async (db) => {
        await db
          .collection('staffnotifications')
          .updateOne(
            { refId: order._id.toString() },
            { $set: { createdAt: new Date(Date.now() - 4 * 60_000) } }
          );
      });

      await page.goto('/dashboard/orders');
      const panel = page.getByTestId('needs-attention');
      await expect(panel).toBeVisible({ timeout: 30000 });
      await expect(
        panel.getByRole('link', { name: new RegExp(order.orderNumber) })
      ).toBeVisible();
      await expect(
        panel.getByTestId('needs-attention-wait').first()
      ).toHaveText(/^\d+ min waiting$/);
      await evidenceShot(page, 'REQ-122', 3, 'needs-attention-panel');
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC2] [US-B5.9] opening the linked item acknowledges it and records who and when', async ({
    browser,
  }) => {
    tagTest('REQ-122', 2);
    const { member, context, page } = await staffPage(browser, ['csr']);
    try {
      const order = await payCustomerOrder();
      await page.goto('/dashboard/orders');
      await expect(bellCount(page)).toBeVisible({ timeout: 60000 });

      await page.getByTestId('staff-bell').click();
      await orderLink(page, order.orderNumber).click();
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/orders/${order._id.toString()}`)
      );

      // Acknowledged: who and when are recorded, and the count goes down.
      await expect
        .poll(
          async () => (await notificationsFor(order._id))[0]?.acknowledgedAt,
          {
            timeout: 20000,
          }
        )
        .toBeTruthy();
      const [row] = await notificationsFor(order._id);
      expect(row.acknowledgedBy).toBe(member.id);
      expect(row.acknowledgedAt).toBeInstanceOf(Date);
      expect(row.escalationLevel).toBe(0);
      // It is gone from the bell list.
      await page.getByTestId('staff-bell').click();
      await expect(orderLink(page, order.orderNumber)).toHaveCount(0);
      await evidenceShot(page, 'REQ-122', 2, 'opened-item-acknowledged');
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC2] opening the order page directly also acknowledges it, and Acknowledge all clears the rest', async ({
    browser,
  }) => {
    tagTest('REQ-122', 2);
    const { member, context, page } = await staffPage(browser, ['csr']);
    try {
      const direct = await payCustomerOrder();
      const other = await payCustomerOrder();

      // Open one order straight from its URL (not through the bell).
      await page.goto(`/dashboard/orders/${direct._id.toString()}`);
      await expect
        .poll(
          async () => (await notificationsFor(direct._id))[0]?.acknowledgedBy,
          { timeout: 20000 }
        )
        .toBe(member.id);

      // Acknowledge all for what is left.
      await page.goto('/dashboard/orders');
      await expect(bellCount(page)).toBeVisible({ timeout: 60000 });
      await page.getByTestId('staff-bell').click();
      await page.getByRole('button', { name: 'Acknowledge all' }).click();
      await expect
        .poll(
          async () => (await notificationsFor(other._id))[0]?.acknowledgedBy,
          { timeout: 20000 }
        )
        .toBe(member.id);
      await expect(bellCount(page)).toHaveCount(0);
      await expect(
        page.getByText('Nothing needs your attention.')
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('[REQ-122][AC5] the on-shift toggle in the top bar sets and clears on shift', async ({
    browser,
  }) => {
    tagTest('REQ-122', 5);
    const { member, context, page } = await staffPage(browser, ['csr']);
    try {
      await page.goto('/dashboard/orders');
      const toggle = page.getByTestId('on-shift-toggle');
      await expect(toggle).toBeVisible({ timeout: 20000 });
      await expect(toggle).toHaveAttribute('aria-checked', 'false');

      await toggle.click();
      await expect
        .poll(async () =>
          withMongo(
            async (db) =>
              (
                await db
                  .collection('users')
                  .findOne({ _id: new ObjectId(member.id) })
              )?.onShift
          )
        )
        .toBe(true);
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      await evidenceShot(page, 'REQ-122', 5, 'on-shift-on');

      await toggle.click();
      await expect
        .poll(async () =>
          withMongo(
            async (db) =>
              (
                await db
                  .collection('users')
                  .findOne({ _id: new ObjectId(member.id) })
              )?.onShift
          )
        )
        .toBe(false);
    } finally {
      await context.close();
    }
  });
});
