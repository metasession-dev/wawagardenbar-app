/**
 * @requirement REQ-124 — Order status notifications and signed tracking links (WA-08, #970)
 * @requirement SRS REQ-ORDER-007, REQ-ORDER-008, REQ-ORDER-001
 *
 * AC1: staff move a customer order to a new status and the customer gets an
 *      `order_status_update_v2` message, once per status; staff orders never
 *      message anyone. WhatsApp is off in CI, so the assertion is the
 *      NotificationLog row (template, params, mode), not delivery.
 * AC3: `/orders/[orderId]` and the socket `join-order` event need the
 *      signed-in owner or a valid tracking token; everyone else gets a 404.
 *
 * Statuses a customer is told about that staff cannot set yet
 * (`out-for-delivery`, `delivered`, `confirmed`) are covered by the unit test
 * `__tests__/services/order-status-notifier.test.ts`: the dashboard's
 * transition table does not offer them (see the REQ-124 evidence summary).
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import type { Socket } from 'socket.io-client';
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
  cleanupOrderAndAlerts,
} from '../helpers/customer-order-seed';
import {
  waitForNotificationRows,
  notificationRows,
  readOrder,
} from '../helpers/paystack-lifecycle';
import {
  seedOrder,
  seedInboundMessage,
  cleanupInboundMessage,
  cleanupNotificationRows,
  waitForOrderStatus,
} from '../helpers/order-tracking-seed';
import {
  connectClient,
  joinOrderRoom,
  disconnectAll,
  triggerInternalEmit,
} from '../helpers/socket-listener';
import {
  createTrackingToken,
  verifyTrackingToken,
} from '../../lib/order-tracking-token';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';
const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const TEMPLATE = 'order_status_update_v2';

/** The kitchen card that carries `orderNumber`. */
function kitchenCard(page: Page, orderNumber: string) {
  return page
    .getByRole('heading', { name: orderNumber, exact: true })
    .locator('xpath=ancestor::div[contains(@class,"border-2")][1]');
}

async function clickKitchenButton(
  page: Page,
  orderNumber: string,
  button: 'Start Preparing' | 'Mark Ready'
) {
  await page.goto('/dashboard/kitchen-display');
  await expect(
    page.getByRole('heading', { name: 'Kitchen Display' })
  ).toBeVisible();
  const card = kitchenCard(page, orderNumber);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: button }).click();
}

test.describe('[REQ-124] customer status notifications', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: ADMIN_FILE });

  let customer: SeededCustomerForSession;
  let itemId: string;
  const orders: ObjectId[] = [];

  test.beforeAll(async () => {
    customer = await seedVerifiedCustomer({ name: 'Ada Obi' });
    itemId = await seedPricedMenuItem(4000);
  });

  test.afterAll(async () => {
    for (const id of orders) await cleanupOrderAndAlerts(id);
    await cleanupNotificationRows(customer._id);
    await cleanupMenuItem(itemId);
    await cleanupSeededCustomer(customer);
  });

  test.beforeEach(async () => {
    await cleanupNotificationRows(customer._id);
  });

  test('[REQ-124][AC1] [US-A4.1] a paid pickup order set to ready logs order_status_update_v2 "ready for pickup" with a signed Track order link', async ({
    page,
  }) => {
    tagTest('REQ-124', 1);
    const order = await seedOrder({
      userId: customer._id,
      itemId,
      orderType: 'pickup',
      status: 'preparing',
    });
    orders.push(order._id);

    await clickKitchenButton(page, order.orderNumber, 'Mark Ready');
    expect(await waitForOrderStatus(order._id, 'ready')).toBe(true);

    const rows = await waitForNotificationRows(customer._id, TEMPLATE, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].templateParams.mode).toBe('template');
    expect(rows[0].templateParams.body).toEqual([
      order.orderNumber,
      'ready for pickup',
    ]);
    const button = rows[0].templateParams.buttons[0];
    expect(button.index).toBe(0);
    const [id, query] = button.params[0].split('?t=');
    expect(id).toBe(order._id.toString());
    expect(verifyTrackingToken(id, query)).toBe(true);
    await evidenceShot(page, 'REQ-124', 1, 'status-ready-notified');
  });

  test('[REQ-124][AC1] a dine-in order set to ready says it is on its way to the table', async ({
    page,
  }) => {
    tagTest('REQ-124', 1);
    const order = await seedOrder({
      userId: customer._id,
      itemId,
      orderType: 'dine-in',
      tableNumber: '7',
      status: 'preparing',
    });
    orders.push(order._id);

    await clickKitchenButton(page, order.orderNumber, 'Mark Ready');
    const rows = await waitForNotificationRows(customer._id, TEMPLATE, 1);
    expect(rows[0].templateParams.body).toEqual([
      order.orderNumber,
      'ready and on its way to your table',
    ]);
  });

  test('[REQ-124][AC1] each status is messaged once: preparing then ready give two rows, and a repeated "ready" gives no third', async ({
    page,
  }) => {
    tagTest('REQ-124', 1);
    const order = await seedOrder({
      userId: customer._id,
      itemId,
      orderType: 'pickup',
      status: 'confirmed',
    });
    orders.push(order._id);

    await clickKitchenButton(page, order.orderNumber, 'Start Preparing');
    expect(await waitForOrderStatus(order._id, 'preparing')).toBe(true);
    await clickKitchenButton(page, order.orderNumber, 'Mark Ready');
    expect(await waitForOrderStatus(order._id, 'ready')).toBe(true);

    let rows = await waitForNotificationRows(customer._id, TEMPLATE, 2);
    expect(rows.map((r) => r.templateParams.body[1])).toEqual([
      'being prepared',
      'ready for pickup',
    ]);

    // Staff save "ready" a second time (status wound back by hand).
    await withMongo((db) =>
      db
        .collection('orders')
        .updateOne({ _id: order._id }, { $set: { status: 'preparing' } })
    );
    await clickKitchenButton(page, order.orderNumber, 'Mark Ready');
    expect(await waitForOrderStatus(order._id, 'ready')).toBe(true);
    await page.waitForTimeout(1500);
    rows = await notificationRows(customer._id, TEMPLATE);
    expect(rows).toHaveLength(2);
    const saved = await readOrder(order._id);
    expect(saved.notifiedStatuses.sort()).toEqual(['preparing', 'ready']);
  });

  test('[REQ-124][AC1] inside the 24-hour window the message is free-form text carrying the signed link', async ({
    page,
  }) => {
    tagTest('REQ-124', 1);
    const messageId = await seedInboundMessage({
      phone: customer.phone,
      userId: customer._id,
      minutesAgo: 10,
    });
    const order = await seedOrder({
      userId: customer._id,
      itemId,
      orderType: 'pickup',
      status: 'preparing',
    });
    orders.push(order._id);
    try {
      await clickKitchenButton(page, order.orderNumber, 'Mark Ready');
      const rows = await waitForNotificationRows(customer._id, TEMPLATE, 1);
      expect(rows[0].templateParams.mode).toBe('text');
      const text: string = rows[0].templateParams.body[0];
      expect(text).toContain(`order #${order.orderNumber} is ready for pickup`);
      const url = new URL(text.slice(text.indexOf('http')));
      expect(url.pathname).toBe(`/orders/${order._id.toString()}`);
      expect(
        verifyTrackingToken(order._id.toString(), url.searchParams.get('t'))
      ).toBe(true);
    } finally {
      await cleanupInboundMessage(messageId);
    }
  });

  test('[REQ-124][AC1] [US-A4.3] a staff express order that changes status logs no customer message', async ({
    page,
  }) => {
    tagTest('REQ-124', 1);
    const order = await seedOrder({
      userId: customer._id,
      itemId,
      origin: 'staff',
      orderType: 'dine-in',
      tableNumber: '4',
      status: 'preparing',
      paid: false,
    });
    orders.push(order._id);

    await clickKitchenButton(page, order.orderNumber, 'Mark Ready');
    expect(await waitForOrderStatus(order._id, 'ready')).toBe(true);
    await page.waitForTimeout(2000);
    expect(await notificationRows(customer._id, TEMPLATE)).toHaveLength(0);
  });
});

test.describe('[REQ-124] tracking page access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ mode: 'serial' });
  let owner: SeededCustomerForSession;
  let stranger: SeededCustomerForSession;
  let itemId: string;
  let order: { _id: ObjectId; orderNumber: string };
  let otherOrder: { _id: ObjectId; orderNumber: string };
  const sockets: Socket[] = [];

  const url = (id: ObjectId, token?: string | null) =>
    `/orders/${id.toString()}${token ? `?t=${token}` : ''}`;

  test.beforeAll(async () => {
    owner = await seedVerifiedCustomer({ name: 'Ada Obi' });
    stranger = await seedVerifiedCustomer({ name: 'Tunde Bello' });
    itemId = await seedPricedMenuItem(4000);
    order = await seedOrder({ userId: owner._id, itemId, status: 'preparing' });
    otherOrder = await seedOrder({
      userId: owner._id,
      itemId,
      status: 'preparing',
    });
  });

  test.afterAll(async () => {
    disconnectAll(sockets);
    await cleanupOrderAndAlerts(order._id);
    await cleanupOrderAndAlerts(otherOrder._id);
    await cleanupMenuItem(itemId);
    await cleanupSeededCustomer(owner);
    await cleanupSeededCustomer(stranger);
  });

  async function expectNotFound(page: Page, target: string) {
    const response = await page.goto(target);
    expect(response?.status()).toBe(404);
    await expect(page.getByText(order.orderNumber)).toHaveCount(0);
  }

  test('[REQ-124][AC3] [US-A4.4] an order id with no token and no login is a 404', async ({
    browser,
  }) => {
    tagTest('REQ-124', 3);
    const context = await browser.newContext();
    const page = await context.newPage();
    await expectNotFound(page, url(order._id));
    await evidenceShot(page, 'REQ-124', 3, 'tracking-no-token-404');
    await context.close();
  });

  test('[REQ-124][AC3] a valid token opens the order without a login', async ({
    browser,
  }) => {
    tagTest('REQ-124', 3);
    const context = await browser.newContext();
    const page = await context.newPage();
    const token = createTrackingToken(order._id.toString());
    expect(token).toBeTruthy();
    const response = await page.goto(url(order._id, token));
    expect(response?.status()).toBe(200);
    await expect(page.getByText(order.orderNumber).first()).toBeVisible();
    await evidenceShot(page, 'REQ-124', 3, 'tracking-token-opens-order');
    await context.close();
  });

  test('[REQ-124][AC3] a token for another order, an expired token and an altered token are all 404', async ({
    browser,
  }) => {
    tagTest('REQ-124', 3);
    const context = await browser.newContext();
    const page = await context.newPage();
    const forOther = createTrackingToken(otherOrder._id.toString());
    const expired = createTrackingToken(
      order._id.toString(),
      Date.now() - 31 * 24 * 60 * 60 * 1000
    );
    const good = createTrackingToken(order._id.toString())!;
    const altered = `${good.slice(0, -2)}${good.endsWith('AA') ? 'BB' : 'AA'}`;
    for (const token of [forOther, expired, altered]) {
      await expectNotFound(page, url(order._id, token));
    }
    await context.close();
  });

  test('[REQ-124][AC3] the signed-in owner opens the order without a token; another signed-in customer gets a 404', async ({
    browser,
  }) => {
    tagTest('REQ-124', 3);
    const ownerContext = await browser.newContext();
    await attachCustomerSessionToContext(ownerContext, owner, BASE_URL);
    const ownerPage = await ownerContext.newPage();
    const ok = await ownerPage.goto(url(order._id));
    expect(ok?.status()).toBe(200);
    await expect(ownerPage.getByText(order.orderNumber).first()).toBeVisible();
    await ownerContext.close();

    const strangerContext = await browser.newContext();
    await attachCustomerSessionToContext(strangerContext, stranger, BASE_URL);
    const strangerPage = await strangerContext.newPage();
    await expectNotFound(strangerPage, url(order._id));
    await strangerContext.close();
  });

  test('[REQ-124][AC3] a socket joins the order room only with a valid token', async () => {
    tagTest('REQ-124', 3);
    test.skip(
      !INTERNAL_SECRET,
      'INTERNAL_API_SECRET is needed to drive the internal emit endpoint'
    );
    const orderId = order._id.toString();
    const emit = () =>
      triggerInternalEmit(BASE_URL, INTERNAL_SECRET, 'order-status-update', {
        orderId,
        status: 'ready',
        note: 'e2e-req124',
      });

    const anonymous = await connectClient(BASE_URL);
    sockets.push(anonymous);
    let anonymousGot = 0;
    anonymous.on('order-status-update', () => anonymousGot++);
    await joinOrderRoom(anonymous, orderId);

    const forged = await connectClient(BASE_URL);
    sockets.push(forged);
    let forgedGot = 0;
    forged.on('order-status-update', () => forgedGot++);
    await joinOrderRoom(
      forged,
      orderId,
      createTrackingToken(otherOrder._id.toString())!
    );

    const holder = await connectClient(BASE_URL);
    sockets.push(holder);
    let holderGot = 0;
    holder.on('order-status-update', () => holderGot++);
    await joinOrderRoom(holder, orderId, createTrackingToken(orderId)!);

    await emit();
    await new Promise((r) => setTimeout(r, 2000));
    expect(holderGot).toBe(1);
    expect(anonymousGot).toBe(0);
    expect(forgedGot).toBe(0);
  });
});
