/**
 * @requirement REQ-120 — Single customer order service (WA-05)
 *
 * Server-side validation on the customer order path. Orders are placed
 * through `POST /api/public/orders` as a signed-in customer: that route and
 * the web checkout both call `createCustomerOrder`, so the typed errors,
 * idempotency and server-side totals proved here hold for both.
 *
 * Settings (hours, minimum, radius, hourly cap) are set in Mongo and restored
 * after each test; this spec runs alone (`AGGREGATE_SPECS`).
 *
 * Transport-layer spec (no `page`): its evidence is the per-spec entry in
 * test-execution-summary.md, not screenshots.
 *
 * Stories: US-A2.6 (hours), US-A2.7 (minimum), US-A2.8 (radius),
 * US-A2.9 (idempotency); AC2 (client totals ignored), AC2 (hourly cap).
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import {
  seedVerifiedCustomer,
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
  ordersWithKey,
  deleteOrdersWithKeyPrefix,
} from '../helpers/customer-order-seed';
import {
  allDaysOpen,
  allDaysClosed,
  applySettings,
  snapshotSettings,
  restoreSettings,
} from '../helpers/settings-control';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PREFIX = `req120-${Date.now().toString(36)}`;
const SETTING_KEYS = [
  'businessHours',
  'minimumOrderAmount',
  'maxOrdersPerHour',
  'deliveryRadius',
  'geocodedCoordinates',
  'pickupEnabled',
  'deliveryEnabled',
  'dineInEnabled',
];

test.describe.configure({ mode: 'serial' });

let snapshot: Record<string, unknown>;
let customer: SeededCustomerForSession;
let itemId: string;
let seq = 0;

const key = () => `${PREFIX}-${++seq}`;

function orderBody(over: Record<string, unknown> = {}) {
  return {
    orderType: 'pickup',
    idempotencyKey: key(),
    items: [{ menuItemId: itemId, quantity: 2 }],
    ...over,
  };
}

test.beforeAll(async () => {
  snapshot = await snapshotSettings(SETTING_KEYS);
  customer = await seedVerifiedCustomer();
  itemId = await seedPricedMenuItem(5000);
});

test.afterAll(async () => {
  await restoreSettings(snapshot);
  await deleteOrdersWithKeyPrefix(PREFIX);
  await cleanupMenuItem(itemId);
  await cleanupSeededCustomer(customer);
});

test.beforeEach(async ({ context }) => {
  // Known-good baseline for every test: open all day, low minimum, no cap.
  await applySettings({
    ...allDaysOpen(),
    minimumOrderAmount: 1000,
    maxOrdersPerHour: 100000,
    pickupEnabled: true,
    deliveryEnabled: true,
    dineInEnabled: true,
  });
  await attachCustomerSessionToContext(context, customer, BASE_URL);
});

test.describe('[REQ-120] customer order validation', () => {
  test('[REQ-120][AC2] [US-A2.6] outside business hours the order is refused with OUT_OF_HOURS and none is created', async ({
    context,
  }) => {
    tagTest('REQ-120', 2);
    await applySettings(allDaysClosed());
    const body = orderBody();

    const res = await context.request.post('/api/public/orders', {
      data: body,
    });

    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe('OUT_OF_HOURS');
    expect(await ordersWithKey(body.idempotencyKey)).toHaveLength(0);
  });

  test('[REQ-120][AC2] [US-A2.7] a cart below the minimum is refused with BELOW_MINIMUM', async ({
    context,
  }) => {
    tagTest('REQ-120', 2);
    await applySettings({ minimumOrderAmount: 50000 }); // cart is ₦10,000
    const body = orderBody();

    const res = await context.request.post('/api/public/orders', {
      data: body,
    });

    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe('BELOW_MINIMUM');
    expect(await ordersWithKey(body.idempotencyKey)).toHaveLength(0);
  });

  test('[REQ-120][AC2] [US-A2.8] a delivery address beyond the radius is refused with OUT_OF_RADIUS', async ({
    context,
  }) => {
    tagTest('REQ-120', 2);
    await applySettings({
      deliveryRadius: 5,
      geocodedCoordinates: { lat: 6.5244, lng: 3.3792, geocodedAt: new Date() },
    });
    const body = orderBody({
      orderType: 'delivery',
      deliveryDetails: {
        address: {
          street: '1 Far Away Road',
          city: 'Abuja',
          state: 'FCT',
          country: 'Nigeria',
        },
      },
      customerLat: 9.0765, // Abuja, hundreds of km from the bar
      customerLng: 7.3986,
    });

    const res = await context.request.post('/api/public/orders', {
      data: body,
    });

    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe('OUT_OF_RADIUS');
    expect(await ordersWithKey(body.idempotencyKey)).toHaveLength(0);
  });

  test('[REQ-120][AC3] [US-A2.9] the same idempotency key twice creates one order', async ({
    context,
  }) => {
    tagTest('REQ-120', 3);
    const body = orderBody();

    const first = await context.request.post('/api/public/orders', {
      data: body,
    });
    const second = await context.request.post('/api/public/orders', {
      data: body,
    });

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(200);
    const a = (await first.json()).data;
    const b = (await second.json()).data;
    expect(b._id).toBe(a._id);
    expect(await ordersWithKey(body.idempotencyKey)).toHaveLength(1);
  });

  test('[REQ-120][AC2][AC4] client totals are ignored: the stored order carries the server total and a WG order number', async ({
    context,
  }) => {
    tagTest('REQ-120', [2, 4]);
    const body = orderBody({ total: 1, subtotal: 1, tax: 0, deliveryFee: 0 });

    const res = await context.request.post('/api/public/orders', {
      data: body,
    });

    expect(res.status()).toBe(201);
    const [stored] = await ordersWithKey(body.idempotencyKey);
    expect(stored.subtotal).toBe(10000); // 2 × ₦5,000 from the menu
    expect(stored.total).toBeGreaterThanOrEqual(10000);
    expect(stored.origin).toBe('customer');
    expect(stored.channel).toBe('public_api');
    expect(String(stored.userId)).toBe(customer._id);
    expect(stored.orderNumber).toMatch(/^WG\d{10}$/);
  });

  test('[REQ-120][AC2] the hourly cap refuses with RATE_LIMITED', async ({
    context,
  }) => {
    tagTest('REQ-120', 2);
    await applySettings({ maxOrdersPerHour: 1 });

    // Whatever customer orders already exist in the last hour, the second
    // request in a row is over a cap of one.
    await context.request.post('/api/public/orders', { data: orderBody() });
    const res = await context.request.post('/api/public/orders', {
      data: orderBody(),
    });

    expect(res.status()).toBe(429);
    expect((await res.json()).code).toBe('RATE_LIMITED');
  });

  test('[REQ-120][AC1] a staff-only shape is refused: pay-now and tabs', async ({
    context,
  }) => {
    tagTest('REQ-120', 1);
    const payNow = await context.request.post('/api/public/orders', {
      data: orderBody({ orderType: 'pay-now' }),
    });
    const tab = await context.request.post('/api/public/orders', {
      data: orderBody({ orderType: 'dine-in', useTab: 'new' }),
    });
    expect(payNow.status()).toBe(403);
    expect(tab.status()).toBe(403);
  });
});
