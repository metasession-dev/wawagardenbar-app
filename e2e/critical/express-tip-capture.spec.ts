/**
 * @requirement REQ-035 — Tip recording at express checkout
 *
 * Verifies that the express create-order flow captures a tip and the
 * tip's payment method INDEPENDENTLY of the bill's payment method, and
 * that the resulting Order persists both fields.
 *
 * Exercise scenario: customer pays card while leaving a cash tip.
 *
 * Retry-safe assertion model (#352): instead of asserting on a daily-
 * report aggregate delta (which retry-doubles when describe.serial
 * blocks re-run after a failure), captures a timestamp before the UI
 * flow and queries Mongo directly for the order with the exact
 * (tipAmount + tipPaymentMethod + paymentMethod) shape created after
 * that timestamp. The aggregation correctness is unit-tested at
 * `__tests__/services/financial-report-service.tip.test.ts`.
 *
 * Cleanup in afterEach deletes the captured order — subsequent runs
 * (retry, schedule, dispatch) start from a deterministic state.
 *
 * See SDLC/test-isolation.md for the contract.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import {
  findRecentOrderWithTip,
  deleteOrderById,
} from '../helpers/db-assertions';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend({
  storageState: ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

test.describe('REQ-035: express order tip capture', () => {
  const TIP = 500;
  let createdOrderId: string | null = null;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test.afterEach(async () => {
    if (createdOrderId) {
      await deleteOrderById(createdOrderId).catch(() => {
        /* idempotent cleanup — best-effort */
      });
      createdOrderId = null;
    }
  });

  test('AC1 + AC4 — ₦500 cash tip on a card-paid express order persists with tipPaymentMethod:cash, paymentMethod:card', async ({
    page,
  }) => {
    // Capture timestamp BEFORE the UI flow so the DB query that runs
    // after creation can scope to "the order I just created".
    const since = new Date();

    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Pick the first menu item.
    const menuCard = page.locator('.grid .cursor-pointer').first();
    await expect(menuCard).toBeVisible({ timeout: 10000 });
    await menuCard.click();

    // Proceed to checkout.
    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    const payNowBtn = page.locator('button').filter({ hasText: 'Pay Now' });
    await expect(payNowBtn).toBeVisible({ timeout: 5000 });
    await payNowBtn.click();

    // Choose POS as the bill payment method.
    const posBtn = page.locator('button').filter({ hasText: 'POS' }).first();
    await expect(posBtn).toBeVisible({ timeout: 5000 });
    await posBtn.click();

    // Enter the tip amount and override the tip method to cash.
    const tipInput = page.locator('#tip-amount');
    await expect(tipInput).toBeVisible();
    await tipInput.fill(String(TIP));

    // Tip method dropdown defaults to the bill method (POS / 'card');
    // override to 'cash' to exercise AC4. Document-order XPath finds
    // the first combobox after the tip input — fails loudly if the
    // override path moves so we catch the regression before the test
    // silently records the tip under the bill's method.
    const tipMethodTrigger = page
      .locator('#tip-amount')
      .locator('xpath=following::button[@role="combobox"][1]');
    await expect(tipMethodTrigger).toBeVisible({ timeout: 5000 });
    await tipMethodTrigger.click();
    const cashOption = page.getByRole('option', { name: /^Cash$/ });
    await expect(cashOption).toBeVisible({ timeout: 5000 });
    await cashOption.click();

    // Submit.
    const payBtn = page.getByRole('button', { name: /Pay ₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    await payBtn.click();

    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Direct DB assertion — retry-safe and concurrency-safe.
    const order = await findRecentOrderWithTip({
      since,
      tipAmount: TIP,
      tipPaymentMethod: 'cash',
      paymentMethod: 'card',
    });
    expect(order).toBeTruthy();
    expect(order.tipAmount).toBe(TIP);
    expect(order.tipPaymentMethod).toBe('cash');
    expect(order.paymentMethod).toBe('card');
    expect(order.paymentStatus).toBe('paid');

    createdOrderId = String(order._id);
  });
});
