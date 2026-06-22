/**
 * @requirement REQ-084 — Separate customer and admin checkout paths;
 * extend Express Create Order to support pickup/delivery.
 *
 * Covers E2E-testable acceptance criteria:
 *   AC1  — "Continuing as Guest" banner visible for unauthenticated users
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

// ---------------------------------------------------------------------------
// Customer checkout — unauthenticated
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Customer checkout (unauthenticated)', () => {
  test('AC1: Continuing as Guest banner visible for unauthenticated users', async ({ page }) => {
    tagTest('REQ-084', 1);
    await page.goto('/checkout');
    await expect(page.getByText(/continuing as guest/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await evidenceShot(page, 'REQ-084', 1, 'guest-banner-visible');
  });

  test('AC3: Only Monnify gateway options shown — no manual cash/transfer/card', async ({ page }) => {
    tagTest('REQ-084', 3);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // No admin payment options should be visible on the customer checkout
    await expect(page.getByText(/manual payment/i)).not.toBeVisible();
    await expect(page.getByText(/admin payment/i)).not.toBeVisible();

    // The checkout is multi-step. Verify no admin-only labels exist on the page
    await expect(page.getByText(/cash on hand|admin checkout|price override/i)).not.toBeVisible();
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

    // Click the Pickup button (has Clock icon + "Pickup" text)
    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    // Pickup time field should be visible (Label htmlFor="pickupTime")
    await expect(page.locator('#pickupTime')).toBeVisible({ timeout: 5000 });
    await evidenceShot(page, 'REQ-084', 4, 'pickup-time-field');
  });

  test('AC5: Delivery address fields appear when Delivery selected', async ({ page }) => {
    tagTest('REQ-084', 5);
    await page.goto('/dashboard/orders/express/create-order');
    await page.waitForLoadState('networkidle');

    // Click the Delivery button (has Bike icon + "Delivery" text)
    await page.getByRole('button', { name: /delivery/i }).click();
    await page.waitForTimeout(500);

    // Delivery address fields should be visible
    await expect(page.locator('#deliveryStreet')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#deliveryCity')).toBeVisible();
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
    await expect(page.locator('#customerName')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#customerPhone')).toBeVisible();
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
    // The page should render AdminTabCheckoutForm, not redirect to /orders/tabs/...
    await page.goto('/dashboard/orders/tabs/000000000000000000000000/checkout');
    await page.waitForLoadState('networkidle');

    // Should stay on dashboard route (no redirect to /orders/tabs/...)
    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/);
    // AdminTabCheckoutForm should render with manual payment options
    // The form has cash/transfer/card payment method buttons
    await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
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
