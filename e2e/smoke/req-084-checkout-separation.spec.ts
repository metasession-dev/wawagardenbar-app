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
 */
import { test, expect } from '@playwright/test';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function guard(
  skip: (cond: boolean, reason: string) => void,
  ok: boolean
) {
  if (ok) return;
  if (process.env.CI) throw new Error('Expected an authenticated session in CI but none was present');
  skip(true, 'super-admin session unavailable (local only)');
}

// ---------------------------------------------------------------------------
// Customer checkout — unauthenticated
// AC1: The checkout page shows a "Continuing as Guest" banner when the
// user is not authenticated. The page only renders if the cart has items;
// we add one via the menu before navigating to /checkout.
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Customer checkout (unauthenticated)', () => {
  test('AC1: Continuing as Guest banner visible for unauthenticated users', async ({ page }) => {
    tagTest('REQ-084', 1);

    // Add an item to cart via menu so checkout doesn't redirect
    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');

    // Click the first available "Add to Cart" or menu item button
    const addToCartBtn = page.getByRole('button', { name: /add to cart|add to order/i }).first();
    if (await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.goto(`${BASE_URL}/checkout`);
    await page.waitForLoadState('networkidle');

    // If redirected back to /menu (empty cart), skip with a note
    if (page.url().includes('/menu')) {
      test.skip(true, 'Cart empty — checkout redirected to /menu. Cannot verify guest banner without cart items.');
    }

    await expect(page.getByText(/continuing as guest/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await evidenceShot(page, 'REQ-084', 1, 'guest-banner-visible');
  });

  test('AC3: No admin payment options on customer checkout', async ({ page }) => {
    tagTest('REQ-084', 3);

    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');

    const addToCartBtn = page.getByRole('button', { name: /add to cart|add to order/i }).first();
    if (await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.goto(`${BASE_URL}/checkout`);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/menu')) {
      test.skip(true, 'Cart empty — checkout redirected to /menu. Cannot verify payment options without cart items.');
    }

    // No admin payment labels should be visible on the customer checkout
    await expect(page.getByText(/manual payment|admin payment|cash on hand|admin checkout|price override/i)).not.toBeVisible();
    await evidenceShot(page, 'REQ-084', 3, 'monnify-only-options');
  });
});

// ---------------------------------------------------------------------------
// Admin express create order — requires super-admin auth
// ---------------------------------------------------------------------------

superAdminTest.describe('REQ-084 — Express create order order type selector', () => {
  superAdminTest('AC4: Pickup time field appears when Pickup selected', async ({ page }) => {
    tagTest('REQ-084', 4);
    guard(superAdminTest.skip, await isAuthenticated(page));

    await page.goto(`${BASE_URL}/dashboard/orders/express/create-order`);
    await page.waitForLoadState('networkidle');

    // Click the Pickup button
    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    // Pickup time field should be visible
    await expect(page.locator('#pickupTime')).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 4, 'pickup-time-field');
  });

  superAdminTest('AC5: Delivery address fields appear when Delivery selected', async ({ page }) => {
    tagTest('REQ-084', 5);
    guard(superAdminTest.skip, await isAuthenticated(page));

    await page.goto(`${BASE_URL}/dashboard/orders/express/create-order`);
    await page.waitForLoadState('networkidle');

    // Click the Delivery button
    await page.getByRole('button', { name: /delivery/i }).click();
    await page.waitForTimeout(500);

    // Delivery address fields should be visible
    await expect(page.locator('#deliveryStreet')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#deliveryCity')).toBeVisible();
    await evidenceShot(page, 'REQ-084', 5, 'delivery-address-fields');
  });

  superAdminTest('AC10: Customer info fields appear for pickup/delivery', async ({ page }) => {
    tagTest('REQ-084', 10);
    guard(superAdminTest.skip, await isAuthenticated(page));

    await page.goto(`${BASE_URL}/dashboard/orders/express/create-order`);
    await page.waitForLoadState('networkidle');

    // Select Pickup
    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    // Customer info fields should be visible
    await expect(page.locator('#customerName')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#customerPhone')).toBeVisible();
    await evidenceShot(page, 'REQ-084', 10, 'customer-info-pickup');
  });
});

// ---------------------------------------------------------------------------
// Admin tab checkout — requires super-admin auth
// AC7/AC11: The tab checkout page renders AdminTabCheckoutForm with
// manual payment options (no Monnify redirect). We seed a tab in MongoDB
// first so the page doesn't redirect to /dashboard/orders/tabs.
// ---------------------------------------------------------------------------

import { MongoClient, ObjectId } from 'mongodb';

function mongoConn(): { uri: string; dbName: string } {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

async function seedTab(): Promise<string> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const tabId = new ObjectId();
    await db.collection('tabs').insertOne({
      _id: tabId,
      tabNumber: `E2E-084-${Date.now()}`,
      status: 'open',
      items: [{
        name: 'E2E Test Item',
        price: 500,
        quantity: 1,
        portionSize: 'full',
        portionMultiplier: 1.0,
        subtotal: 500,
      }],
      totalAmount: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return tabId.toString();
  } finally {
    await client.close();
  }
}

async function cleanupTab(tabId: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.collection('tabs').deleteOne({ _id: new ObjectId(tabId) });
  } finally {
    await client.close();
  }
}

superAdminTest.describe('REQ-084 — Admin tab checkout (manual payment)', () => {
  let tabId: string;

  superAdminTest.beforeAll(async () => {
    tabId = await seedTab();
  });

  superAdminTest.afterAll(async () => {
    if (tabId) await cleanupTab(tabId);
  });

  superAdminTest('AC7: AdminTabCheckoutForm renders — no redirect', async ({ page }) => {
    tagTest('REQ-084', 7);
    guard(superAdminTest.skip, await isAuthenticated(page));

    await page.goto(`${BASE_URL}/dashboard/orders/tabs/${tabId}/checkout`);
    await page.waitForLoadState('networkidle');

    // Should stay on the checkout route (no redirect)
    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/, { timeout: 10000 });
    // AdminTabCheckoutForm renders with manual payment options
    await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 7, 'admin-tab-checkout-form');
  });

  superAdminTest('AC11: No Monnify checkout URL — manual payment only', async ({ page }) => {
    tagTest('REQ-084', 11);
    guard(superAdminTest.skip, await isAuthenticated(page));

    await page.goto(`${BASE_URL}/dashboard/orders/tabs/${tabId}/checkout`);
    await page.waitForLoadState('networkidle');

    // No Monnify gateway redirect or URL
    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/, { timeout: 10000 });
    await expect(page.getByText(/monnify|payment gateway/i)).not.toBeVisible();
    // Manual payment options present
    await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 11, 'no-monnify-manual-payment');
  });
});
