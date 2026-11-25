/**
 * @requirement REQ-127 — a failed payment start keeps one Pending order (#1031)
 * @srs REQ-CHECKOUT-019, REQ-CHECKOUT-008
 *
 * After `createOrder` succeeds and the payment start fails, the cart is kept
 * and the idempotency key follows the cart (`lib/checkout-attempt.ts`): the
 * same cart, even after a reload or a return from the menu, reuses the same
 * Pending order; a changed cart cancels the superseded unpaid order and
 * creates a new one.
 *
 * The e2e app runs with `ENABLE_TEST_PAYMENTS=true`, so the server's payment
 * start always succeeds. The failure is forced in the browser: the
 * `initializePayment` server action request (the only one that carries
 * `paymentMethods`) is aborted, which is exactly how the form sees a payment
 * start that did not complete (its `catch` and its `!success` branch both keep
 * the cart). `createOrder` is never touched.
 *
 * CI runs without test payments, so there the server's payment start cannot
 * succeed either (no working gateway). The specs therefore never require a
 * payment start to succeed: they assert the order bookkeeping (one Pending
 * order, the same order reused, the superseded order cancelled), which is
 * decided before the gateway is called. That a successful start clears the
 * cart and the stored attempt is unit-tested (`checkout-attempt.test.ts`) and
 * was shown on the UAT build (UAT step 17).
 */
import { test, expect, type Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import {
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  cleanupMenuItem,
  seedPricedMenuItem,
} from '../helpers/customer-order-seed';
import {
  giveOwnClientIp,
  injectCart,
  openCheckout,
  payButton,
  reopenCheckout,
} from '../helpers/checkout-page';
import { blockGatewayNavigation } from '../helpers/customer-journey';
import { withMongo } from '../helpers/db-assertions';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PRICE = 5000;
const FAILED_START =
  /Something went wrong while placing your order|Failed to start the payment|Failed to initialize payment/;

test.describe.configure({ timeout: 120_000 });

let itemId: string;
let customer: SeededCustomerForSession;

test.beforeAll(async () => {
  itemId = await seedPricedMenuItem(PRICE);
});

test.afterAll(async () => {
  await cleanupMenuItem(itemId);
});

test.beforeEach(async () => {
  customer = await seedVerifiedCustomer({ name: 'Ada Obi' });
});

test.afterEach(async () => {
  await withMongo(async (db) => {
    await db
      .collection('orders')
      .deleteMany({ userId: new ObjectId(customer._id) });
  });
  await cleanupSeededCustomer(customer);
});

interface Controls {
  /** Abort the next N payment-start requests. */
  failNext: (n: number) => void;
  aborted: () => number;
}

/** Sign in, put the item in the cart and arrange the forced payment-start failure. */
async function prepare(page: Page): Promise<Controls> {
  await giveOwnClientIp(page.context());
  await attachCustomerSessionToContext(page.context(), customer, BASE_URL);
  await blockGatewayNavigation(page.context());
  await injectCart(page, itemId, PRICE);

  let remaining = 0;
  let abortedCount = 0;
  await page.route(/\/checkout/, async (route) => {
    const req = route.request();
    const isPaymentStart =
      req.method() === 'POST' &&
      Boolean(req.headers()['next-action']) &&
      (req.postData() ?? '').includes('paymentMethods');
    if (isPaymentStart && remaining > 0) {
      remaining -= 1;
      abortedCount += 1;
      await route.abort('failed');
      return;
    }
    await route.fallback();
  });
  // Stay on the app after a successful start (the mock gateway page).
  await page.route('**/payments/mock**', (route) => route.abort());
  return {
    failNext: (n) => {
      remaining = n;
    },
    aborted: () => abortedCount,
  };
}

async function chooseDineIn(page: Page, table: string) {
  await expect(async () => {
    await page.locator('label[for="order-type-dine-in"]').click();
    await page.waitForTimeout(600);
    await expect(page.locator('#order-type-dine-in')).toBeChecked({
      timeout: 2000,
    });
  }).toPass({ timeout: 20000 });
  await page.locator('input[name="tableNumber"]').fill(table);
}

async function ordersFor(): Promise<any[]> {
  return withMongo(async (db) =>
    db
      .collection('orders')
      .find({ userId: new ObjectId(customer._id) })
      .sort({ createdAt: 1 })
      .toArray()
  );
}

async function cartSize(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('wawa-cart-storage');
    return raw ? (JSON.parse(raw).state?.items?.length ?? 0) : 0;
  });
}

async function pay(page: Page) {
  await payButton(page).click();
}

test.describe('[REQ-127] failed payment start keeps one Pending order', () => {
  test('[REQ-127][AC1][AC4] [US-C1.1] two failed payment starts with the same cart leave one Pending order and the cart intact', async ({
    page,
  }) => {
    tagTest('REQ-127', [1, 4]);
    const controls = await prepare(page);
    await openCheckout(page);
    await chooseDineIn(page, 'T-E2E-127');

    controls.failNext(2);
    await pay(page);
    await expect(page.getByText(FAILED_START)).toBeVisible({ timeout: 30000 });
    expect(await cartSize(page)).toBe(1);
    expect(await ordersFor()).toHaveLength(1);
    await evidenceShot(page, 'REQ-127', 4, 'payment-start-failed-cart-kept');

    // Same page, same cart: pay again and fail again.
    await expect(payButton(page)).toBeEnabled();
    await pay(page);
    await expect(page.getByText(FAILED_START)).toBeVisible({ timeout: 30000 });
    expect(controls.aborted()).toBe(2);

    const orders = await ordersFor();
    expect(orders).toHaveLength(1);
    expect(orders[0].paymentStatus).toBe('pending');
    expect(orders[0].status).toBe('pending');
    expect(orders[0].paymentReference ?? null).toBeNull();
    expect(await cartSize(page)).toBe(1);
  });

  test('[REQ-127][AC1] [US-C1.2] after a failure, leaving checkout and coming back with the same cart reuses the same order: still one order, same id', async ({
    page,
  }) => {
    tagTest('REQ-127', 1);
    const controls = await prepare(page);
    await openCheckout(page);
    await chooseDineIn(page, 'T-E2E-127');

    controls.failNext(1);
    await pay(page);
    await expect(page.getByText(FAILED_START)).toBeVisible({ timeout: 30000 });
    const [first] = await ordersFor();
    expect(first).toBeTruthy();
    const attempt = await page.evaluate(() =>
      window.sessionStorage.getItem('wgb:checkout-attempt')
    );
    expect(attempt).toContain(String(first._id));

    // Return from the menu: the form remounts (it used to mint a new key here).
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await reopenCheckout(page);
    await chooseDineIn(page, 'T-E2E-127');
    controls.failNext(1);
    await pay(page);
    await expect(page.getByText(FAILED_START)).toBeVisible({ timeout: 30000 });

    // Still the one order, and it is the same one.
    const orders = await ordersFor();
    expect(orders).toHaveLength(1);
    expect(String(orders[0]._id)).toBe(String(first._id));
    expect(orders[0].status).toBe('pending');
    // The cart is kept and the stored attempt still points at that order.
    expect(await cartSize(page)).toBe(1);
    expect(
      await page.evaluate(() =>
        window.sessionStorage.getItem('wgb:checkout-attempt')
      )
    ).toContain(String(first._id));
    await evidenceShot(page, 'REQ-127', 1, 'same-order-reused-on-return');
  });

  test('[REQ-127][AC2] [US-C1.3] after a failure, changing the cart (here the table) cancels the superseded unpaid order and creates a new one for what is now in the cart', async ({
    page,
  }) => {
    tagTest('REQ-127', 2);
    const controls = await prepare(page);
    await openCheckout(page);
    await chooseDineIn(page, 'T-E2E-127-A');

    controls.failNext(1);
    await pay(page);
    await expect(page.getByText(FAILED_START)).toBeVisible({ timeout: 30000 });
    const [first] = await ordersFor();
    expect(first.dineInDetails?.tableNumber).toBe('T-E2E-127-A');

    // Change what the order is made of and pay again. Whether the gateway then
    // starts is not asserted (see the note at the top): the superseded order
    // and the new one are decided before it is called.
    await page.locator('input[name="tableNumber"]').fill('T-E2E-127-B');
    await pay(page);

    await expect
      .poll(async () => (await ordersFor()).length, { timeout: 30000 })
      .toBe(2);
    const [old, replacement] = await ordersFor();
    expect(String(old._id)).toBe(String(first._id));
    expect(old.status).toBe('cancelled');
    expect(old.cancelReason).toBe('superseded_by_new_checkout');
    expect(replacement.status).toBe('pending');
    expect(replacement.dineInDetails?.tableNumber).toBe('T-E2E-127-B');
    const live = (await ordersFor()).filter((o) => o.status !== 'cancelled');
    expect(live).toHaveLength(1);
    expect(live[0].total).toBeGreaterThanOrEqual(PRICE);
    await evidenceShot(page, 'REQ-127', 2, 'changed-cart-replaces-order');
  });
});
