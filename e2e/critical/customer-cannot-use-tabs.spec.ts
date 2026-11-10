/**
 * @requirement REQ-120 — Tabs are staff-only (WA-05)
 *
 * US-B2.4: a customer session cannot create or use a tab, the checkout shows
 * no tab options, and `/orders/tabs` is gone. Staff tab flows are proven
 * unchanged by `csr-order-tab-parity-req109.spec.ts` (US-B2.1), which must keep
 * passing.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
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
import { withMongo } from '../helpers/db-assertions';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PREFIX = `req120t-${Date.now().toString(36)}`;

let customer: SeededCustomerForSession;
let itemId: string;

test.beforeAll(async () => {
  customer = await seedVerifiedCustomer();
  itemId = await seedPricedMenuItem(5000);
});

test.afterAll(async () => {
  await deleteOrdersWithKeyPrefix(PREFIX);
  await withMongo(async (db) => {
    await db.collection('tabs').deleteMany({ tableNumber: `${PREFIX}-T` });
  });
  await cleanupMenuItem(itemId);
  await cleanupSeededCustomer(customer);
});

test.beforeEach(async ({ page }) => {
  await attachCustomerSessionToContext(page.context(), customer, BASE_URL);
});

test.describe('[REQ-120] customers cannot use tabs', () => {
  test('[REQ-120][AC6] [US-B2.4] /orders/tabs is gone', async ({ page }) => {
    tagTest('REQ-120', 6);
    const res = await page.goto('/orders/tabs');
    expect(res?.status()).toBe(404);
    const sub = await page.goto('/orders/tabs/000000000000000000000000');
    expect(sub?.status()).toBe(404);
  });

  test('[REQ-120][AC6] [US-B2.4] the orders page lists orders only, with no tabs section', async ({
    page,
  }) => {
    tagTest('REQ-120', 6);
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /My Orders/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Pay & Close Tab|View Tab Details/i)
    ).toHaveCount(0);
    await evidenceShot(page, 'REQ-120', 6, 'orders-page-no-tabs');
  });

  test('[REQ-120][AC6] [US-B2.4] the checkout offers no tab options', async ({
    page,
  }) => {
    tagTest('REQ-120', 6);
    await page.addInitScript((id: string) => {
      window.localStorage.setItem(
        'wawa-cart-storage',
        JSON.stringify({
          state: {
            items: [
              {
                cartItemId: 'e2e-1',
                id,
                menuItemId: id,
                name: 'E2E Order Item 5000',
                price: 5000,
                quantity: 1,
                portionSize: 'full',
                portionMultiplier: 1,
                subtotal: 5000,
                image: '',
                category: 'food',
                specialInstructions: '',
                preparationTime: 10,
              },
            ],
            isOpen: false,
          },
          version: 0,
        })
      );
    }, itemId);
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await page.goto('/checkout');
    await page.waitForSelector('input[name="customerName"]', {
      timeout: 20000,
    });

    // Four steps and none of them is a tab step.
    await expect(page.getByText('Payment Options')).toHaveCount(0);
    await expect(page.locator('label[for="new-tab"]')).toHaveCount(0);
    await expect(page.locator('label[for="existing-tab"]')).toHaveCount(0);
    await expect(page.getByText(/Open a New Tab|Add to Tab/i)).toHaveCount(0);

    // The order type selector has no "Pay Now" (staff Express only).
    await page.locator('input[name="customerName"]').fill('E2E Customer');
    await page.locator('input[name="customerEmail"]').fill('e2e@e2e.local');
    await page.locator('input[name="customerPhone"]').fill('08011223344');
    await page.locator('button', { hasText: 'Next' }).click();
    await expect(page.locator('label[for="dine-in"]')).toBeVisible();
    await expect(page.locator('label[for="pay-now"]')).toHaveCount(0);
    await evidenceShot(page, 'REQ-120', 6, 'checkout-no-tab-options');
  });

  test('[REQ-120][AC6] [US-B2.4] the public API refuses a tab on a customer order', async ({
    page,
  }) => {
    tagTest('REQ-120', 6);
    const key = `${PREFIX}-api`;
    const res = await page.request.post('/api/public/orders', {
      data: {
        orderType: 'dine-in',
        idempotencyKey: key,
        useTab: 'new',
        dineInDetails: { tableNumber: `${PREFIX}-T` },
        items: [{ menuItemId: itemId, quantity: 1 }],
      },
    });
    expect(res.status()).toBe(403);
    expect(await ordersWithKey(key)).toHaveLength(0);
  });

  test('[REQ-120][AC6] [US-B2.4] the public tab routes refuse a customer', async ({
    page,
  }) => {
    tagTest('REQ-120', 6);
    const create = await page.request.post('/api/public/tabs', {
      data: { tableNumber: `${PREFIX}-T` },
    });
    const list = await page.request.get('/api/public/tabs');
    expect(create.status()).toBe(403);
    expect(list.status()).toBe(403);
    const created = await withMongo(async (db) =>
      db.collection('tabs').countDocuments({ tableNumber: `${PREFIX}-T` })
    );
    expect(created).toBe(0);
  });
});
