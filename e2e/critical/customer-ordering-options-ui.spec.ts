/**
 * @requirement REQ-120 (AC7) - the checkout offers only the enabled order types
 *
 * Found in UAT (step 10): with only dine-in enabled the checkout still showed
 * Pickup and Delivery, and the customer learned they were disabled only after
 * paying. The page reads `getOrderingOptionsAction` (REQ-121: one page). Rewrites shop-wide settings, so it runs alone
 * (see `AGGREGATE_SPECS`, playwright.config.ts).
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
} from '../helpers/customer-order-seed';
import {
  applySettings,
  restoreSettings,
  snapshotSettings,
} from '../helpers/settings-control';
import {
  blockGatewayNavigation,
  dismissCookieBanner,
} from '../helpers/customer-journey';
import { giveOwnClientIp } from '../helpers/checkout-page';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const KEYS = ['dineInEnabled', 'pickupEnabled', 'deliveryEnabled'];

test.describe.configure({ timeout: 90_000 });

let customer: SeededCustomerForSession;
let itemId: string;
let original: Record<string, unknown>;

test.beforeAll(async () => {
  customer = await seedVerifiedCustomer();
  itemId = await seedPricedMenuItem(5000);
  original = await snapshotSettings(KEYS);
});

test.afterAll(async () => {
  await restoreSettings(original);
  await cleanupMenuItem(itemId);
  await cleanupSeededCustomer(customer);
});

async function openOrderDetails(
  page: import('@playwright/test').Page,
  context: import('@playwright/test').BrowserContext
) {
  await dismissCookieBanner(page);
  await giveOwnClientIp(context);
  await blockGatewayNavigation(context);
  await attachCustomerSessionToContext(context, customer, BASE_URL);
  await page.addInitScript((id: string) => {
    window.localStorage.setItem(
      'wawa-cart-storage',
      JSON.stringify({
        state: {
          items: [
            {
              cartItemId: 'e2e-opts-1',
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
  // REQ-121: one page; the order type selector is the first thing on it.
  await expect(page.locator('label[for^="order-type-"]').first()).toBeVisible({
    timeout: 25000,
  });
  await expect(page.getByText('Sign In', { exact: true })).toHaveCount(0, {
    timeout: 45000,
  });
  await page.waitForLoadState('networkidle');
}

test.describe('[REQ-120] checkout offers only enabled order types', () => {
  test('[REQ-120][AC7] only dine-in enabled: Pickup and Delivery are not offered', async ({
    page,
    context,
  }) => {
    tagTest('REQ-120', 7);
    await applySettings({
      dineInEnabled: true,
      pickupEnabled: false,
      deliveryEnabled: false,
    });
    await openOrderDetails(page, context);
    await expect(page.locator('label[for="order-type-dine-in"]')).toBeVisible();
    await expect(page.locator('label[for="order-type-pickup"]')).toHaveCount(0);
    await expect(page.locator('label[for="order-type-delivery"]')).toHaveCount(
      0
    );
    await evidenceShot(page, 'REQ-120', 7, 'only-dine-in-offered');
  });

  test('[REQ-120][AC7] pickup and delivery enabled, dine-in off: Dine In is not offered and the selection moves to an enabled type', async ({
    page,
    context,
  }) => {
    tagTest('REQ-120', 7);
    await applySettings({
      dineInEnabled: false,
      pickupEnabled: true,
      deliveryEnabled: true,
    });
    await openOrderDetails(page, context);
    await expect(page.locator('label[for="order-type-pickup"]')).toBeVisible();
    await expect(
      page.locator('label[for="order-type-delivery"]')
    ).toBeVisible();
    await expect(page.locator('label[for="order-type-dine-in"]')).toHaveCount(
      0
    );
    // The selection moves to an enabled type.
    await expect(page.locator('#order-type-pickup')).toHaveAttribute(
      'data-state',
      'checked'
    );
    await evidenceShot(page, 'REQ-120', 7, 'dine-in-hidden');
  });
});
