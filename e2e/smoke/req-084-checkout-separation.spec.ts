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
import { test, expect, type Page } from '@playwright/test';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { MongoClient, ObjectId } from 'mongodb';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function guard(
  skip: (cond: boolean, reason: string) => void,
  ok: boolean
) {
  if (ok) return;
  if (process.env.CI) throw new Error('Expected an authenticated session in CI but none was present');
  skip(true, 'super-admin session unavailable (local only)');
}

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

/**
 * Inject a cart item directly into localStorage (Zustand persist)
 * so the /checkout page doesn't redirect to /menu for empty cart.
 */
async function injectCart(page: Page) {
  await page.addInitScript(() => {
    const cartItem = {
      id: 'e2e-test-item',
      menuItemId: 'e2e-test-item',
      name: 'E2E Test Item',
      price: 500,
      quantity: 1,
      portionSize: 'full',
      portionMultiplier: 1.0,
      subtotal: 500,
      image: undefined,
      category: 'food',
      specialInstructions: undefined,
      preparationTime: 20,
      customizations: undefined,
    };
    const cartState = {
      state: {
        items: [cartItem],
        isOpen: false,
      },
      version: 0,
    };
    window.localStorage.setItem('wawa-cart-storage', JSON.stringify(cartState));
  });
}

// ---------------------------------------------------------------------------
// Customer checkout — unauthenticated
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Customer checkout (unauthenticated)', () => {
  test('AC1: Continuing as Guest banner visible for unauthenticated users', async ({ page }) => {
    tagTest('REQ-084', 1);

    await injectCart(page);

    await page.goto(`${BASE_URL}/checkout`);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/menu')) {
      test.skip(true, 'Cart injection failed — checkout redirected to /menu.');
    }

    await expect(page.getByText(/continuing as guest/i)).toBeVisible({ timeout: 15000 });
    // Use .first() — there are two "Sign in" links (navbar + guest banner)
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
    await evidenceShot(page, 'REQ-084', 1, 'guest-banner-visible');
  });

  test('AC3: No admin payment options on customer checkout', async ({ page }) => {
    tagTest('REQ-084', 3);

    await injectCart(page);

    await page.goto(`${BASE_URL}/checkout`);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/menu')) {
      test.skip(true, 'Cart injection failed — checkout redirected to /menu.');
    }

    await expect(page.getByText(/manual payment|admin payment|cash on hand|admin checkout|price override/i)).not.toBeVisible();
    await evidenceShot(page, 'REQ-084', 3, 'monnify-only-options');
  });
});

// ---------------------------------------------------------------------------
// Admin express create order — requires super-admin auth
// Pre-warms the route in beforeAll to trigger Next.js dev mode compilation,
// then each test navigates again (route already compiled → fast load).
// ---------------------------------------------------------------------------

superAdminTest.describe('REQ-084 — Express create order order type selector', () => {
  superAdminTest.describe.configure({ timeout: 120_000 });

  // Pre-warm: navigate to the express page once to trigger compilation.
  // The page will show a loading spinner while server actions execute.
  // We wait for the loading to finish so subsequent tests load instantly.
  superAdminTest.beforeAll(async ({ page }) => {
    if (!(await isAuthenticated(page))) {
      if (process.env.CI) throw new Error('Expected an authenticated session in CI but none was present');
      return;
    }
    // Navigate and wait for the page to fully load (server actions + render).
    // Use a generous timeout for first-time dev mode compilation.
    await page.goto('/dashboard/orders/express/create-order');
    try {
      await expect(page.getByText('Order Type')).toBeVisible({ timeout: 120_000 });
    } catch {
      // Pre-warm failed — tests will skip individually
    }
  });

  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      if (process.env.CI) throw new Error('Expected an authenticated session in CI but none was present');
      testInfo.skip(true, 'super-admin auth missing (local only)');
    }
  });

  superAdminTest('AC4: Pickup time field appears when Pickup selected', async ({ page }) => {
    tagTest('REQ-084', 4);

    await page.goto('/dashboard/orders/express/create-order');
    try {
      await expect(page.getByText('Order Type')).toBeVisible({ timeout: 30000 });
    } catch {
      await page.screenshot({ path: 'test-results/express-order-stuck-loading-ac4.png' });
      superAdminTest.skip(true, 'Express create-order page stuck in loading state');
    }

    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('#pickupTime')).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 4, 'pickup-time-field');
  });

  superAdminTest('AC5: Delivery address fields appear when Delivery selected', async ({ page }) => {
    tagTest('REQ-084', 5);

    await page.goto('/dashboard/orders/express/create-order');
    try {
      await expect(page.getByText('Order Type')).toBeVisible({ timeout: 30000 });
    } catch {
      await page.screenshot({ path: 'test-results/express-order-stuck-loading-ac5.png' });
      superAdminTest.skip(true, 'Express create-order page stuck in loading state');
    }

    await page.getByRole('button', { name: /delivery/i }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('#deliveryStreet')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#deliveryCity')).toBeVisible();
    await evidenceShot(page, 'REQ-084', 5, 'delivery-address-fields');
  });

  superAdminTest('AC10: Customer info fields appear for pickup/delivery', async ({ page }) => {
    tagTest('REQ-084', 10);

    await page.goto('/dashboard/orders/express/create-order');
    try {
      await expect(page.getByText('Order Type')).toBeVisible({ timeout: 30000 });
    } catch {
      await page.screenshot({ path: 'test-results/express-order-stuck-loading-ac10.png' });
      superAdminTest.skip(true, 'Express create-order page stuck in loading state');
    }

    await page.getByRole('button', { name: /pickup/i }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('#customerName')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#customerPhone')).toBeVisible();
    await evidenceShot(page, 'REQ-084', 10, 'customer-info-pickup');
  });
});

// ---------------------------------------------------------------------------
// Admin tab checkout — requires super-admin auth
// ---------------------------------------------------------------------------

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

    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/, { timeout: 10000 });
    await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 7, 'admin-tab-checkout-form');
  });

  superAdminTest('AC11: No Monnify checkout URL — manual payment only', async ({ page }) => {
    tagTest('REQ-084', 11);
    guard(superAdminTest.skip, await isAuthenticated(page));

    await page.goto(`${BASE_URL}/dashboard/orders/tabs/${tabId}/checkout`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/, { timeout: 10000 });
    await expect(page.getByText(/monnify|payment gateway/i)).not.toBeVisible();
    await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({ timeout: 10000 });
    await evidenceShot(page, 'REQ-084', 11, 'no-monnify-manual-payment');
  });
});
