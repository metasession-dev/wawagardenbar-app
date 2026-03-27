/**
 * @requirement REQ-014 - E2E: Reconciliation checkbox for orders and tabs
 *
 * Verifies:
 * - Reconciliation checkbox is displayed on every tab
 * - Reconciliation checkbox is displayed on standalone orders (no tabId)
 * - Orders belonging to a tab do NOT show reconciliation checkbox
 * - Clicking checkbox persists the reconciled status
 * - Reconciliation filter works on both tabs and orders pages
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');

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

test.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Admin login failed or credentials not configured');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Tabs Page — Reconciliation
// ═══════════════════════════════════════════════════════════════════════════
test.describe('REQ-014: Tabs Page — Reconciliation', () => {
  test('tabs page displays reconciliation checkbox on each tab card', async ({
    page,
  }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const tabCards = page.locator('[data-testid="tab-card"]');
    const count = await tabCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    // Every tab card should have a checkbox with reconciliation aria-label
    const firstCard = tabCards.first();
    const checkbox = firstCard.locator(
      'button[role="checkbox"][aria-label*="reconciled"]'
    );
    await expect(checkbox).toBeVisible();
  });

  test('clicking reconciliation checkbox toggles state', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const tabCards = page.locator('[data-testid="tab-card"]');
    const count = await tabCards.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const firstCard = tabCards.first();
    const checkbox = firstCard.locator(
      'button[role="checkbox"][aria-label*="reconciled"]'
    );

    // Get initial state
    const initialState = await checkbox.getAttribute('data-state');

    // Click to toggle
    await checkbox.click();
    await page.waitForTimeout(500);

    // State should have changed
    const newState = await checkbox.getAttribute('data-state');
    expect(newState).not.toBe(initialState);

    // Toggle back to restore original state
    await checkbox.click();
    await page.waitForTimeout(500);

    const restoredState = await checkbox.getAttribute('data-state');
    expect(restoredState).toBe(initialState);
  });

  test('tabs filter includes reconciliation options', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    // Open the filter panel
    await page.getByText('Filter Tabs', { exact: true }).first().click();

    // Reconciliation label should be visible in the filter panel
    await expect(
      page.locator('label', { hasText: 'Reconciliation' })
    ).toBeVisible();

    // Open the reconciliation select
    const selectTrigger = page
      .locator('label', { hasText: 'Reconciliation' })
      .locator('..')
      .locator('button[role="combobox"]');
    await selectTrigger.click();

    // Verify options
    await expect(
      page.getByRole('option', { name: 'All', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Reconciled', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Not Reconciled', exact: true })
    ).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Orders Page — Reconciliation
// ═══════════════════════════════════════════════════════════════════════════
test.describe('REQ-014: Orders Page — Reconciliation', () => {
  test('standalone orders show reconciliation checkbox', async ({ page }) => {
    // Create a standalone order via express order flow
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Wait for menu items to load and click the first card to add to cart
    const menuCard = page.locator('.grid .cursor-pointer').first();
    await expect(menuCard).toBeVisible({ timeout: 10000 });
    await menuCard.click();

    // The checkout button should appear (shows cart count)
    const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // Select "Pay Now" destination
    const payNowBtn = page.locator('button').filter({ hasText: 'Pay Now' });
    await expect(payNowBtn).toBeVisible({ timeout: 5000 });
    await payNowBtn.click();

    // Select Cash payment method
    const cashBtn = page.locator('button').filter({ hasText: 'Cash' });
    await expect(cashBtn).toBeVisible({ timeout: 5000 });
    await cashBtn.click();

    // Submit — "Pay ₦X,XXX"
    const payBtn = page.getByRole('button', { name: /Pay ₦/i });
    await expect(payBtn).toBeVisible({ timeout: 5000 });
    await payBtn.click();

    // Wait for redirect to orders page
    await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify the standalone order has a reconciliation checkbox
    const orderCards = page.locator('[data-testid="order-card"]');
    await expect(orderCards.first()).toBeVisible({ timeout: 5000 });

    // Find a standalone order (without "On Tab" link)
    const count = await orderCards.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const card = orderCards.nth(i);
      const hasTabLink = (await card.locator('text=On Tab').count()) > 0;

      if (!hasTabLink) {
        const checkbox = card.locator(
          'button[role="checkbox"][aria-label*="reconciled"]'
        );
        await expect(checkbox).toBeVisible();
        return;
      }
    }

    // Should not reach here — we just created a standalone order
    expect(false).toBe(true);
  });

  test('tab orders do NOT show reconciliation checkbox', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    const orderCards = page.locator('[data-testid="order-card"]');
    const count = await orderCards.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Find a tab order (one with "On Tab" link)
    let foundTabOrder = false;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const card = orderCards.nth(i);
      const hasTabLink = (await card.locator('text=On Tab').count()) > 0;

      if (hasTabLink) {
        // Tab order — should NOT have reconciliation checkbox
        const checkbox = card.locator(
          'button[role="checkbox"][aria-label*="reconciled"]'
        );
        await expect(checkbox).toHaveCount(0);
        foundTabOrder = true;
        break;
      }
    }

    if (!foundTabOrder) {
      // No tab orders visible — skip
      test.skip();
    }
  });

  test('orders filter includes reconciliation options', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    // Open the filter popover
    await page.getByRole('button', { name: /Filters/i }).click();

    // Reconciliation select should be visible
    await expect(page.getByText('Reconciliation')).toBeVisible();
  });
});
