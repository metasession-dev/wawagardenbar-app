/**
 * @requirement REQ-121 - Closed hours block Pay (AC6)
 * @srs REQ-CHECKOUT-018
 *
 * Rewrites shop-wide business hours, so it runs alone (see `AGGREGATE_SPECS`,
 * playwright.config.ts). Pickup and delivery cannot be paid while the business
 * is closed; dine-in stays payable because the customer is already at the bar
 * (the same rule the order service applies, REQ-061).
 */
import { test, expect } from '@playwright/test';
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
  injectCart,
  openCheckout,
  payButton,
  reopenCheckout,
  giveOwnClientIp,
} from '../helpers/checkout-page';
import { blockGatewayNavigation } from '../helpers/customer-journey';
import {
  allDaysClosed,
  allDaysOpen,
  applySettings,
  restoreSettings,
  snapshotSettings,
} from '../helpers/settings-control';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const KEYS = [
  'businessHours',
  'dineInEnabled',
  'pickupEnabled',
  'deliveryEnabled',
];

test.describe.configure({ timeout: 90_000 });

let customer: SeededCustomerForSession;
let itemId: string;
let original: Record<string, unknown>;

test.beforeAll(async () => {
  // Make sure the settings document exists (the app creates it on first read).
  await fetch(`${BASE_URL}/api/settings/business-hours-status`).catch(() => {});
  customer = await seedVerifiedCustomer();
  itemId = await seedPricedMenuItem(5000);
  original = await snapshotSettings(KEYS);
});

test.afterAll(async () => {
  await restoreSettings(original);
  await cleanupMenuItem(itemId);
  await cleanupSeededCustomer(customer);
});

async function openAs(
  page: import('@playwright/test').Page,
  query: string
): Promise<void> {
  await giveOwnClientIp(page.context());
  await attachCustomerSessionToContext(page.context(), customer, BASE_URL);
  await blockGatewayNavigation(page.context());
  await injectCart(page, itemId, 5000);
  await openCheckout(page, query);
}

test.describe('[REQ-121] closed hours', () => {
  test('[REQ-121][AC6] [US-A2.12] closed: the hours banner shows and Pay is disabled for pickup and delivery, not for dine-in', async ({
    page,
  }) => {
    tagTest('REQ-121', 6);
    await applySettings({
      ...allDaysClosed(),
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: true,
    });

    await openAs(page, '?type=pickup');
    await expect(page.getByText(/We.re closed right now/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(payButton(page)).toBeDisabled();
    await expect(
      page.getByText(/pickup and delivery orders cannot be paid/i)
    ).toBeVisible();
    await evidenceShot(page, 'REQ-121', 6, 'closed-pay-disabled-pickup');

    await reopenCheckout(page, '?type=delivery');
    await expect(payButton(page)).toBeDisabled();

    // Dine-in is inside hours by definition.
    await reopenCheckout(page, '?type=dine-in&table=12');
    await expect(payButton(page)).toBeEnabled();
  });

  test('[REQ-121][AC6] open: Pay is enabled for pickup', async ({ page }) => {
    tagTest('REQ-121', 6);
    await applySettings({
      ...allDaysOpen(),
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: true,
    });
    await openAs(page, '?type=pickup');
    await expect(page.getByText(/We.re closed right now/i)).toHaveCount(0);
    await expect(payButton(page)).toBeEnabled();
    await evidenceShot(page, 'REQ-121', 6, 'open-pay-enabled-pickup');
  });
});
