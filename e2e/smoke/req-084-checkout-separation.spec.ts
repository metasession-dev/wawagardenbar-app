/**
 * @requirement REQ-084 — Separate customer and admin checkout paths;
 * extend Express Create Order to support pickup/delivery.
 *
 * Covers E2E-testable acceptance criteria:
 *   AC1  — "Continue as Guest" banner visible for unauthenticated users
 *   AC3  — Only Monnify gateway options on customer checkout (no manual)
 *   AC4  — Express create order: pickup time field appears when Pickup selected
 *   AC5  — Express create order: delivery address fields appear when Delivery selected
 *   AC7  — Admin tab checkout renders AdminTabCheckoutForm (no redirect)
 *   AC10 — Express create order: customer info fields appear for pickup/delivery
 *   AC11 — Admin tab checkout: no Monnify URL, manual payment
 *
 * Admin specs (AC4, AC5, AC7, AC10, AC11) require auth storageState
 * from auth-setup. Customer specs (AC1, AC3) run unauthenticated.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Customer checkout — unauthenticated
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Customer checkout (unauthenticated)', () => {
  test('AC1: Continue as Guest banner visible for unauthenticated users', async ({ page }) => {
    tagTest('REQ-084', 1);
    await page.goto('/checkout');
    await expect(page.getByText(/continue as guest/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await evidenceShot(page, 'REQ-084', 1, 'guest-banner-visible');
  });

  test('AC3: Only Monnify gateway options shown — no manual cash/transfer/card', async ({ page }) => {
    tagTest('REQ-084', 3);
    await page.goto('/checkout');
    // Navigate to payment method step — fill required fields to get there
    await page.waitForTimeout(1000);
    // Check that no admin payment options are visible
    await expect(page.getByText(/manual payment/i)).not.toBeVisible();
    await expect(page.getByText(/cash on hand/i)).not.toBeVisible();
    await expect(page.getByText(/admin payment/i)).not.toBeVisible();
    // Monnify gateway options should be present
    const monnifyOptions = page.getByText(/card|bank transfer|ussd|phone number/i);
    await expect(monnifyOptions.first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 3, 'monnify-only-options');
  });
});

// ---------------------------------------------------------------------------
// Admin express create order — requires auth
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Express create order order type selector', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('AC4: Pickup time field appears when Pickup selected', async ({ page }) => {
    tagTest('REQ-084', 4);
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Select Pickup order type
    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    // Pickup time field should be visible
    await expect(page.getByLabel(/pickup time/i)).toBeVisible({ timeout: 5000 });
    await evidenceShot(page, 'REQ-084', 4, 'pickup-time-field');
  });

  test('AC5: Delivery address fields appear when Delivery selected', async ({ page }) => {
    tagTest('REQ-084', 5);
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Select Delivery order type
    await page.getByRole('button', { name: /delivery/i }).click();
    await page.waitForTimeout(500);

    // Delivery address fields should be visible
    await expect(page.getByLabel(/street/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/city/i)).toBeVisible();
    await evidenceShot(page, 'REQ-084', 5, 'delivery-address-fields');
  });

  test('AC10: Customer info fields appear for pickup/delivery', async ({ page }) => {
    tagTest('REQ-084', 10);
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Select Pickup
    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    // Customer info fields should be visible
    await expect(page.getByLabel(/name/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/phone/i)).toBeVisible();
    await evidenceShot(page, 'REQ-084', 10, 'customer-info-pickup');
  });
});

// ---------------------------------------------------------------------------
// Admin tab checkout — requires auth
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Admin tab checkout (manual payment)', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('AC7: AdminTabCheckoutForm renders — no redirect to customer checkout', async ({ page }) => {
    tagTest('REQ-084', 7);
    // Navigate to a tab checkout page — use a synthetic tabId
    // The page should render AdminTabCheckoutForm, not redirect
    await page.goto('/dashboard/orders/tabs/000000000000000000000000/checkout');
    await page.waitForLoadState('networkidle');

    // Should stay on dashboard route (no redirect to /orders/tabs/...)
    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/);
    // AdminTabCheckoutForm should render with manual payment options
    await expect(page.getByText(/manual payment|cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 7, 'admin-tab-checkout-form');
  });

  test('AC11: No Monnify checkout URL — manual payment only', async ({ page }) => {
    tagTest('REQ-084', 11);
    await page.goto('/dashboard/orders/tabs/000000000000000000000000/checkout');
    await page.waitForLoadState('networkidle');

    // No Monnify gateway redirect or URL
    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/);
    await expect(page.getByText(/monnify|payment gateway/i)).not.toBeVisible();
    // Manual payment options present
    await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 11, 'no-monnify-manual-payment');
  });
});
