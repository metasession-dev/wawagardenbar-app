/**
 * @requirement REQ-125 — Admin switches for WhatsApp notifications (WA-15, #1082)
 * @srs REQ-SETTINGS-007, REQ-WA-016
 *
 * Settings, "WhatsApp messages": every switch shows what the message is for,
 * why it matters and what happens if it is off; the sign-in PIN is locked on;
 * switching off a high-impact message asks for confirmation that repeats the
 * consequence; a switched-off message is not sent and is logged as
 * `suppressed_admin_disabled` while the calling flow (the kitchen marking an
 * order ready) still completes.
 *
 * WhatsApp sends are off in the e2e environment: the assertion is the
 * `NotificationLog` row, like the other WhatsApp specs. The payment-reminder
 * message is sent by a timed job that a spec cannot trigger, so the "one switch
 * off, the rest unaffected" story uses order status updates (same gate, same
 * log); the gate by template name, the PIN never being gated and the
 * fail-open behaviour are unit-tested. The settings actions' role gate is
 * unit-tested; here a csr, a kitchen member and a customer cannot reach the
 * page at all (`/dashboard/settings` is admin and super-admin only).
 *
 * Every change made through the UI is switched back through the UI (that also
 * invalidates the server's settings cache, so no other spec sees a stale
 * switch), and the stored document is restored afterwards.
 */
import { test, expect, type Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { withMongo } from '../helpers/db-assertions';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';
import {
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  cleanupMenuItem,
  cleanupOrderAndAlerts,
  seedPricedMenuItem,
} from '../helpers/customer-order-seed';
import {
  cleanupNotificationRows,
  seedOrder,
  waitForOrderStatus,
} from '../helpers/order-tracking-seed';
import { waitForNotificationRows } from '../helpers/paystack-lifecycle';
import {
  createStaff,
  deleteStaff,
  isRefused,
  loginAsStaff,
  type ThrowawayStaff,
} from '../helpers/staff-roles';
import {
  LOCKED_WHATSAPP_TEMPLATES,
  WHATSAPP_NOTIFICATION_CATALOGUE,
} from '../../lib/whatsapp-notification-catalogue';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const KEY = 'whatsapp-notification-switches';
const TEMPLATE = 'order_status_update_v2';
const entry = (key: string) =>
  WHATSAPP_NOTIFICATION_CATALOGUE.find((e) => e.key === key)!;

async function storedSwitches(): Promise<any> {
  const doc: any = await withMongo((db) =>
    db.collection('systemsettings').findOne({ key: KEY })
  );
  return doc?.value ?? null;
}

const switchOf = (page: Page, key: string) =>
  page.getByTestId(`whatsapp-switch-${key}`);

async function openSwitches(
  page: Page,
  testInfo: { skip: (c: boolean, r: string) => void }
) {
  if (!(await isAuthenticated(page))) {
    if (process.env.CI) throw new Error('Expected a super-admin session');
    testInfo.skip(true, 'super-admin auth missing (local only)');
  }
  await page.goto('/dashboard/settings');
  await expect(page.getByTestId('whatsapp-switches')).toBeVisible({
    timeout: 30000,
  });
}

async function saved(page: Page) {
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'WhatsApp message settings saved' })
      .first()
  ).toBeVisible();
}

/** Switch everything back on through the UI (no confirmation needed to turn on). */
async function restoreAllOn(page: Page) {
  await page.goto('/dashboard/settings');
  await expect(page.getByTestId('whatsapp-switches')).toBeVisible({
    timeout: 30000,
  });
  const master = page.getByTestId('whatsapp-master-switch');
  if ((await master.getAttribute('aria-checked')) === 'false') {
    await master.click();
    await saved(page);
  }
  for (const e of WHATSAPP_NOTIFICATION_CATALOGUE) {
    const sw = switchOf(page, e.key);
    if ((await sw.getAttribute('aria-checked')) === 'false') {
      await sw.click();
      await saved(page);
    }
  }
}

function kitchenCard(page: Page, orderNumber: string) {
  return page
    .getByRole('heading', { name: orderNumber, exact: true })
    .locator('xpath=ancestor::div[contains(@class,"border-2")][1]');
}

async function markReady(page: Page, orderNumber: string) {
  await page.goto('/dashboard/kitchen-display');
  await expect(
    page.getByRole('heading', { name: 'Kitchen Display' })
  ).toBeVisible();
  const card = kitchenCard(page, orderNumber);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Mark Ready' }).click();
}

test.describe('[REQ-125] WhatsApp notification switches', () => {
  test.describe.configure({ timeout: 150_000 });
  let original: unknown;
  let customer: SeededCustomerForSession;
  let itemId: string;
  const orders: ObjectId[] = [];

  test.beforeAll(async () => {
    original = await withMongo((db) =>
      db.collection('systemsettings').findOne({ key: KEY })
    );
    customer = await seedVerifiedCustomer({ name: 'Ada Obi' });
    itemId = await seedPricedMenuItem(4000);
  });

  test.afterAll(async () => {
    for (const id of orders) await cleanupOrderAndAlerts(id);
    await cleanupNotificationRows(customer._id);
    await cleanupMenuItem(itemId);
    await cleanupSeededCustomer(customer);
    await withMongo(async (db) => {
      const col = db.collection('systemsettings');
      if (original) await col.replaceOne({ key: KEY }, original as any);
      else await col.deleteOne({ key: KEY });
    });
  });

  test.beforeEach(async () => {
    await cleanupNotificationRows(customer._id);
  });

  superAdminTest(
    '[REQ-125][AC5][AC4] [US-B4.5] every switch shows what it is for, why it matters and what happens if it is off; the sign-in PIN is locked on',
    async ({ page }, testInfo) => {
      tagTest('REQ-125', [4, 5]);
      await openSwitches(page, testInfo);

      const panel = page.getByTestId('whatsapp-switches');
      for (const e of WHATSAPP_NOTIFICATION_CATALOGUE) {
        await expect(switchOf(page, e.key), e.key).toBeVisible();
        await expect(panel.getByText(e.purpose)).toBeVisible();
        await expect(panel.getByText(e.why)).toBeVisible();
        await expect(panel.getByText(e.ifOff)).toBeVisible();
      }
      const n = WHATSAPP_NOTIFICATION_CATALOGUE.length;
      await expect(panel.getByText('What it is for:')).toHaveCount(n);
      await expect(panel.getByText('Why it matters:')).toHaveCount(n);
      await expect(panel.getByText('If you switch it off:')).toHaveCount(n);
      await evidenceShot(
        page,
        'REQ-125',
        5,
        'switches-with-purpose-why-if-off'
      );

      const locked = page.getByTestId('whatsapp-locked-verification_pin');
      await expect(locked).toBeVisible();
      await expect(locked).toContainText(
        LOCKED_WHATSAPP_TEMPLATES.verification_pin.reason
      );
      await expect(locked.getByRole('switch')).toBeDisabled();
      await expect(locked.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      await evidenceShot(page, 'REQ-125', 4, 'sign-in-pin-locked-on');
    }
  );

  superAdminTest(
    '[REQ-125][AC2][AC3][AC6][AC7] [US-B4.6] switching off order status updates asks for confirmation, is stored, and the next status change saves without sending a message and is logged as suppressed',
    async ({ page }, testInfo) => {
      tagTest('REQ-125', [2, 3, 6, 7]);
      await openSwitches(page, testInfo);
      try {
        await switchOf(page, 'order_status').click();
        const dialog = page.getByTestId('whatsapp-confirm-dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(entry('order_status').ifOff);
        await evidenceShot(
          page,
          'REQ-125',
          6,
          'confirm-dialog-repeats-consequence'
        );
        await dialog.getByRole('button', { name: 'Switch it off' }).click();
        await saved(page);
        await expect
          .poll(async () => (await storedSwitches())?.switches?.order_status)
          .toBe(false);
        // The rest keep their state: only this entry is off.
        const stored = await storedSwitches();
        expect(stored.masterEnabled).toBe(true);
        expect(
          Object.values(stored.switches).filter((v) => v === false)
        ).toHaveLength(1);

        const order = await seedOrder({
          userId: customer._id,
          itemId,
          orderType: 'pickup',
          status: 'preparing',
        });
        orders.push(order._id);
        await markReady(page, order.orderNumber);
        // The calling flow completes: the order is ready.
        expect(await waitForOrderStatus(order._id, 'ready')).toBe(true);

        const rows = await waitForNotificationRows(customer._id, TEMPLATE, 1);
        expect(rows).toHaveLength(1);
        expect(rows[0].success).toBe(false);
        expect(rows[0].errorCode).toBe('suppressed_admin_disabled');
        await evidenceShot(
          page,
          'REQ-125',
          3,
          'status-change-saved-message-suppressed'
        );
      } finally {
        await restoreAllOn(page);
      }
      const after = await storedSwitches();
      expect(after.switches.order_status).not.toBe(false);
    }
  );

  superAdminTest(
    '[REQ-125][AC3][AC4][AC5] [US-B4.7] switching off every WhatsApp message disables the individual switches, shows the banner, keeps the sign-in PIN locked on, and suppresses an order status message while the status change still saves',
    async ({ page }, testInfo) => {
      tagTest('REQ-125', [3, 4, 5]);
      await openSwitches(page, testInfo);
      try {
        await page.getByTestId('whatsapp-master-switch').click();
        const dialog = page.getByTestId('whatsapp-confirm-dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Switch it off' }).click();
        await saved(page);
        await expect
          .poll(async () => (await storedSwitches())?.masterEnabled)
          .toBe(false);

        await expect(
          page.getByTestId('whatsapp-master-off-banner')
        ).toBeVisible();
        for (const e of WHATSAPP_NOTIFICATION_CATALOGUE) {
          await expect(switchOf(page, e.key), e.key).toBeDisabled();
        }
        const locked = page.getByTestId('whatsapp-locked-verification_pin');
        await expect(locked.getByRole('switch')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        await evidenceShot(
          page,
          'REQ-125',
          5,
          'master-off-banner-switches-disabled'
        );

        const order = await seedOrder({
          userId: customer._id,
          itemId,
          orderType: 'pickup',
          status: 'preparing',
        });
        orders.push(order._id);
        await markReady(page, order.orderNumber);
        expect(await waitForOrderStatus(order._id, 'ready')).toBe(true);
        const rows = await waitForNotificationRows(customer._id, TEMPLATE, 1);
        expect(rows[0].errorCode).toBe('suppressed_admin_disabled');
      } finally {
        await restoreAllOn(page);
      }
      expect((await storedSwitches()).masterEnabled).toBe(true);
    }
  );

  superAdminTest(
    '[REQ-125][AC6] [US-B4.8] switching off staff alerts or payment reminders asks first and repeats the consequence; keeping it on changes nothing',
    async ({ page }, testInfo) => {
      tagTest('REQ-125', 6);
      await openSwitches(page, testInfo);
      for (const key of ['staff_alert', 'payment_reminder']) {
        await switchOf(page, key).click();
        const dialog = page.getByTestId('whatsapp-confirm-dialog');
        await expect(dialog, key).toBeVisible();
        await expect(dialog).toContainText(entry(key).ifOff);
        await dialog.getByRole('button', { name: 'Keep it on' }).click();
        await expect(dialog).toBeHidden();
        await expect(switchOf(page, key)).toHaveAttribute(
          'aria-checked',
          'true'
        );
      }
      expect((await storedSwitches())?.switches?.staff_alert).not.toBe(false);
      expect((await storedSwitches())?.switches?.payment_reminder).not.toBe(
        false
      );
    }
  );

  test('[REQ-125][AC8] [US-B4.9] a csr, a kitchen member and a customer cannot reach the settings page that holds the switches', async ({
    browser,
  }) => {
    tagTest('REQ-125', 8);
    const staff: ThrowawayStaff[] = [];
    let customerCtx: SeededCustomerForSession | null = null;
    const contexts: Array<{ close: () => Promise<void> }> = [];
    try {
      for (const role of ['csr', 'kitchen'] as const) {
        const member = await createStaff(`wa15-${role}`, [role]);
        staff.push(member);
        const { context, page } = await loginAsStaff(browser, member);
        contexts.push(context);
        expect(await isRefused(page, '/dashboard/settings'), role).toBe(true);
        await expect(page.getByTestId('whatsapp-switches')).toHaveCount(0);
      }
      customerCtx = await seedVerifiedCustomer({ name: 'No Staff' });
      const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
      });
      contexts.push(context);
      await attachCustomerSessionToContext(context, customerCtx, BASE_URL);
      const page = await context.newPage();
      expect(await isRefused(page, '/dashboard/settings'), 'customer').toBe(
        true
      );
      await expect(page.getByTestId('whatsapp-switches')).toHaveCount(0);
    } finally {
      for (const c of contexts) await c.close();
      if (staff.length) await deleteStaff(...staff.map((s) => s.id));
      if (customerCtx) await cleanupSeededCustomer(customerCtx);
    }
  });
});
