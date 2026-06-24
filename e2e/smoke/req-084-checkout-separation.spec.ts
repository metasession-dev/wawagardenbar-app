/**
 * @requirement REQ-084 — Separate customer and admin checkout paths;
 * extend Express Create Order to support pickup/delivery.
 *
 * Covers E2E-testable acceptance criteria:
 *   AC1  — "Continuing as Guest" banner visible for unauthenticated users
 *   AC2  — Guest checkout submission creates an order without authentication
 *   AC3  — Only Monnify gateway options on customer checkout (no manual)
 *   AC4  — Express create order: pickup time field appears when Pickup selected
 *   AC5  — Express create order: delivery address fields appear when Delivery selected
 *   AC7  — Admin tab checkout renders AdminTabCheckoutForm (no redirect)
 *   AC10 — Express create order: customer info fields appear for pickup/delivery
 *   AC11 — Admin tab checkout: no Monnify URL, manual payment
 *
 * NOTE on the express create-order flow:
 *   The page has TWO steps. It loads on the `menu` step (category cascade +
 *   item grid). The "Order Type" selector (Dine-in/Pickup/Delivery/Pay Now)
 *   only renders on the `checkout` step, which is reached by (1) adding an
 *   item to the cart and (2) clicking the "Checkout (N)" button. Earlier
 *   versions of this spec waited for "Order Type" while still on the menu
 *   step, which never appears there — hence the false "stuck loading" skips.
 *   We now follow the proven pattern from e2e/menu-category-cascade.spec.ts.
 */
import { test, expect, type Page } from '@playwright/test';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { MongoClient, ObjectId } from 'mongodb';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI)
    throw new Error(
      'Expected an authenticated session in CI but none was present'
    );
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
      tableNumber: 'T-084',
      status: 'open',
      paymentStatus: 'unpaid',
      items: [
        {
          name: 'E2E Test Item',
          price: 500,
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          subtotal: 500,
        },
      ],
      total: 500,
      orders: [],
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
 * Seed a real menu item in the database so the order API accepts it.
 * Returns the ObjectId string to use in the cart.
 */
async function seedMenuItem(): Promise<string> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const itemId = new ObjectId();
    await db.collection('menuitems').insertOne({
      _id: itemId,
      name: 'E2E Test Item',
      description: 'Test item for E2E',
      price: 500,
      category: 'food',
      subcategory: 'starters',
      isAvailable: true,
      isOutOfStock: false,
      preparationTime: 20,
      displayPriority: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return itemId.toString();
  } finally {
    await client.close();
  }
}

async function cleanupMenuItem(itemId: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.collection('menuitems').deleteOne({
      _id: new ObjectId(itemId),
    });
  } finally {
    await client.close();
  }
}

/**
 * Inject a cart item directly into localStorage (Zustand persist)
 * so the /checkout page doesn't redirect to /menu for empty cart.
 * Uses a real menu item ObjectId so the order API accepts it.
 */
async function injectCart(page: Page, menuItemId?: string) {
  const id = menuItemId || 'e2e-dummy-item';
  await page.addInitScript((cartId: string) => {
    const cartItem = {
      cartItemId: 'e2e-test-item-1',
      id: cartId,
      menuItemId: cartId,
      name: 'E2E Test Item',
      price: 500,
      quantity: 1,
      portionSize: 'full',
      portionMultiplier: 1.0,
      subtotal: 500,
      image: '',
      category: 'food',
      specialInstructions: '',
      preparationTime: 20,
      customizations: undefined,
    };
    const cartState = {
      state: { items: [cartItem], isOpen: false, tableNumber: undefined },
      version: 0,
    };
    window.localStorage.setItem('wawa-cart-storage', JSON.stringify(cartState));
  }, id);
}

/**
 * Drive the express create-order page from the menu step to the checkout
 * step so the "Order Type" selector is rendered.
 *
 * Returns false (so the caller can skip) if no in-stock items are seeded.
 * Mirrors the proven flow in e2e/menu-category-cascade.spec.ts.
 */
async function gotoExpressCheckoutStep(page: Page): Promise<boolean> {
  await page.goto('/dashboard/orders/express/create-order');
  await page.waitForLoadState('networkidle');

  // The page loads on the menu step. Wait for the category cascade to render
  // (this is the reliable "page loaded" signal, not the Order Type heading).
  await expect(page.getByTestId('category-cascade')).toBeVisible({
    timeout: 60000,
  });

  // Give the item grid a moment to populate from the categories.
  await page.waitForTimeout(500);
  const inStock = page.locator('[aria-disabled="false"]');
  if ((await inStock.count()) === 0) {
    return false;
  }

  // Add the first in-stock item to the cart.
  await inStock.first().click();

  // Some items open a customization picker dialog instead of adding directly.
  // If the dialog appears, confirm with "Add to Order".
  await page.waitForTimeout(400);
  const addToOrder = page.getByRole('button', { name: /add to order/i });
  if (await addToOrder.isVisible().catch(() => false)) {
    await addToOrder.click();
    await page.waitForTimeout(300);
  }

  // The "Checkout (N)" button appears once the cart has items.
  const checkoutBtn = page.getByRole('button', { name: /Checkout \(/i });
  await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
  await checkoutBtn.click();

  // Now on the checkout step — the Order Type selector is rendered.
  await expect(page.getByText('Order Type')).toBeVisible({ timeout: 10000 });
  return true;
}

// ---------------------------------------------------------------------------
// Customer checkout — unauthenticated
// ---------------------------------------------------------------------------

test.describe('REQ-084 — Customer checkout (unauthenticated)', () => {
  test('AC1: Continuing as Guest banner visible for unauthenticated users', async ({
    page,
  }) => {
    tagTest('REQ-084', 1);

    await injectCart(page);
    await page.goto(`${BASE_URL}/checkout`);
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/menu')) {
      test.skip(true, 'Cart injection failed — checkout redirected to /menu.');
    }

    await expect(page.getByText(/continuing as guest/i)).toBeVisible({
      timeout: 15000,
    });
    // Two "Sign in" links exist (navbar + guest banner) — assert the first.
    await expect(
      page.getByRole('link', { name: /sign in/i }).first()
    ).toBeVisible();
    await evidenceShot(page, 'REQ-084', 1, 'guest-banner-visible');
  });

  test('AC12: Anonymous user can add item to cart and reach checkout without login redirect', async ({
    page,
  }) => {
    tagTest('REQ-084', 12);

    // Start as a completely anonymous user — no cart injection, no auth.
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    // Wait for menu items to render.
    const menuCard = page.locator('[data-testid^="menu-item-"]').first();
    await expect(menuCard).toBeVisible({ timeout: 15000 });

    // Click the first menu item to open the detail modal.
    await menuCard.click();
    await page.waitForTimeout(500);

    // Click "Add to Cart" inside the modal (scoped to dialog to avoid
    // matching the card's "Add to Cart" button which only opens the modal).
    const addToCartBtn = page
      .getByRole('dialog')
      .getByRole('button', { name: /add to cart/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 5000 });
    await addToCartBtn.click();

    // Wait for the cart badge to show 1 item (proves add-to-cart worked).
    await expect(page.locator('[data-testid="cart-button"]')).toContainText(
      '1',
      { timeout: 10000 }
    );

    // Navigate to checkout — should NOT redirect to /login.
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Verify we're on /checkout, not redirected to /login or /menu.
    expect(page.url()).not.toContain('/login');
    expect(page.url()).not.toContain('/menu');

    // Verify the "Continue as Guest" banner is visible.
    await expect(page.getByText(/continuing as guest/i)).toBeVisible({
      timeout: 15000,
    });
    await evidenceShot(page, 'REQ-084', 12, 'anonymous-menu-to-checkout');
  });

  test('AC2: Guest checkout submission creates an order without auth', async ({
    page,
  }) => {
    tagTest('REQ-084', 2);

    const menuItemId = await seedMenuItem();
    try {
      await injectCart(page, menuItemId);
      // Seed cart on /menu so Zustand rehydrates before checkout; going directly
      // to /checkout can trigger the empty-cart redirect before hydration.
      await page.goto('/menu');
      await page.waitForLoadState('networkidle');
      // Wait for the header cart badge to show the seeded item; this proves the
      // Zustand store has rehydrated from localStorage.
      await expect(
        page.getByRole('button', { name: /Shopping cart with/i })
      ).toContainText('1', { timeout: 10000 });
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      if (page.url().includes('/menu')) {
        test.skip(
          true,
          'Cart injection failed — checkout redirected to /menu.'
        );
      }

      // Wait for the auth/session fetch to settle and the skeleton to disappear.
      await page.waitForSelector('input[name="customerName"]', {
        timeout: 15000,
      });

      // Step 1 — Customer info.
      await page.locator('input[name="customerName"]').fill('Guest E2E');
      await page
        .locator('input[name="customerEmail"]')
        .fill('guest-e2e@example.com');
      await page.locator('input[name="customerPhone"]').fill('08011223344');
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Next' }).click();
      await expect(page.locator('form').getByText('Order Details')).toBeVisible(
        {
          timeout: 10000,
        }
      );

      // Step 2 — Order details (dine-in default).
      const tableNumber = `E2E-${Date.now()}`;
      await page.locator('input[name="tableNumber"]').fill(tableNumber);
      // Wait for the debounced tab-occupancy check to complete.
      await page.waitForTimeout(2500);
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Next' }).click();
      await expect(
        page.getByRole('heading', { name: 'Payment Options' })
      ).toBeVisible({ timeout: 10000 });

      // Step 3 — Tab options: open a new tab, then submit.
      await page.locator('label[for="new-tab"]').click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /Add to Tab/i }).click();

      // Order created without authentication; success dialog appears.
      await expect(page.getByText(/Order Added to Tab/i).first()).toBeVisible({
        timeout: 15000,
      });
      await evidenceShot(page, 'REQ-084', 2, 'guest-checkout-submitted');
    } finally {
      await cleanupMenuItem(menuItemId);
    }
  });

  test('AC3: Only Monnify gateway options on customer checkout', async ({
    page,
  }) => {
    tagTest('REQ-084', 3);

    const menuItemId = await seedMenuItem();
    try {
      await injectCart(page, menuItemId);
      await page.goto('/menu');
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('button', { name: /Shopping cart with/i })
      ).toContainText('1', { timeout: 10000 });
      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      if (page.url().includes('/menu')) {
        test.skip(
          true,
          'Cart injection failed — checkout redirected to /menu.'
        );
      }

      // Step 1 — Customer info.
      await page.waitForSelector('input[name="customerName"]', {
        timeout: 15000,
      });
      await page.locator('input[name="customerName"]').fill('Guest E2E');
      await page
        .locator('input[name="customerEmail"]')
        .fill('guest-e2e@example.com');
      await page.locator('input[name="customerPhone"]').fill('08011223344');
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Next' }).click();
      await expect(page.locator('form').getByText('Order Details')).toBeVisible(
        {
          timeout: 10000,
        }
      );

      // Step 2 — Order details: switch to pickup.
      const pickupLabel = page.locator('label[for="pickup"]');
      await pickupLabel.scrollIntoViewIfNeeded();
      await pickupLabel.click();
      await page.waitForTimeout(500);

      // The pickup time may render as a Select dropdown (when slots are
      // available) or as a datetime-local input (fallback). Handle both.
      const datetimeInput = page.locator('input[type="datetime-local"]');
      const selectTrigger = page.locator('[role="combobox"]').first();

      if (await datetimeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await datetimeInput.fill('2026-01-01T12:00');
      } else {
        await selectTrigger.click();
        await page.waitForTimeout(300);
        // Click the first option in the dropdown.
        await page.locator('[role="option"]').first().click();
      }
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Next' }).click();

      // Step 3 — Tip.
      await page.waitForTimeout(500);
      await page.locator('button', { hasText: 'Next' }).click();
      await expect(page.getByText('Select Payment Method')).toBeVisible({
        timeout: 10000,
      });

      // Step 4 — Payment method: Monnify options should be visible.
      await expect(
        page.getByText(
          /manual payment|admin payment|cash on hand|admin checkout|price override/i
        )
      ).not.toBeVisible();
      await expect(page.getByText('Card Payment')).toBeVisible();
      await expect(page.getByText('Bank Transfer')).toBeVisible();
      await expect(page.getByText('USSD', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Phone Number', { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(/processed securely through Monnify/i)
      ).toBeVisible();
      await evidenceShot(page, 'REQ-084', 3, 'monnify-only-options');
    } finally {
      await cleanupMenuItem(menuItemId);
    }
  });
});

// ---------------------------------------------------------------------------
// Admin express create order — requires super-admin auth
// ---------------------------------------------------------------------------

superAdminTest.describe(
  'REQ-084 — Express create order order type selector',
  () => {
    superAdminTest.describe.configure({ timeout: 90_000 });

    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        if (process.env.CI)
          throw new Error(
            'Expected an authenticated session in CI but none was present'
          );
        testInfo.skip(true, 'super-admin auth missing (local only)');
      }
    });

    superAdminTest(
      'AC4: Pickup time field appears when Pickup selected',
      async ({ page }) => {
        tagTest('REQ-084', 4);

        if (!(await gotoExpressCheckoutStep(page))) {
          superAdminTest.skip(true, 'No in-stock express items seeded');
        }

        await page.getByRole('button', { name: /pickup/i }).click();
        await page.waitForTimeout(300);

        await expect(page.locator('#pickupTime')).toBeVisible({
          timeout: 10000,
        });
        await evidenceShot(page, 'REQ-084', 4, 'pickup-time-field');
      }
    );

    superAdminTest(
      'AC5: Delivery address fields appear when Delivery selected',
      async ({ page }) => {
        tagTest('REQ-084', 5);

        if (!(await gotoExpressCheckoutStep(page))) {
          superAdminTest.skip(true, 'No in-stock express items seeded');
        }

        await page.getByRole('button', { name: /delivery/i }).click();
        await page.waitForTimeout(300);

        await expect(page.locator('#deliveryStreet')).toBeVisible({
          timeout: 10000,
        });
        await expect(page.locator('#deliveryCity')).toBeVisible();
        await evidenceShot(page, 'REQ-084', 5, 'delivery-address-fields');
      }
    );

    superAdminTest(
      'AC10: Customer info fields appear for pickup/delivery',
      async ({ page }) => {
        tagTest('REQ-084', 10);

        if (!(await gotoExpressCheckoutStep(page))) {
          superAdminTest.skip(true, 'No in-stock express items seeded');
        }

        await page.getByRole('button', { name: /pickup/i }).click();
        await page.waitForTimeout(300);

        await expect(page.locator('#customerName')).toBeVisible({
          timeout: 10000,
        });
        await expect(page.locator('#customerPhone')).toBeVisible();
        await evidenceShot(page, 'REQ-084', 10, 'customer-info-pickup');
      }
    );

    superAdminTest(
      'AC4: Pickup time is required before submission',
      async ({ page }) => {
        tagTest('REQ-084', 4);

        if (!(await gotoExpressCheckoutStep(page))) {
          superAdminTest.skip(true, 'No in-stock express items seeded');
        }

        await page.getByRole('button', { name: /pickup/i }).click();
        await expect(page.locator('#pickupTime')).toBeVisible({
          timeout: 10000,
        });

        // Leave pickup time empty — submit button must be disabled.
        const submitBtn = page.getByRole('button', { name: /Create Order/i });
        await expect(submitBtn).toBeDisabled();

        // Fill the pickup time, customer name, and phone to enable the button.
        await page.locator('#pickupTime').fill('2026-01-01T12:00');
        await page.locator('#customerName').fill('Pickup E2E');
        await page.locator('#customerPhone').fill('08011223344');
        await page.waitForTimeout(500);
        await expect(submitBtn).toBeEnabled({ timeout: 10000 });
        await evidenceShot(page, 'REQ-084', 4, 'pickup-time-required');
      }
    );

    superAdminTest(
      'AC5: Delivery address fields are required before submission',
      async ({ page }) => {
        tagTest('REQ-084', 5);

        if (!(await gotoExpressCheckoutStep(page))) {
          superAdminTest.skip(true, 'No in-stock express items seeded');
        }

        await page.getByRole('button', { name: /delivery/i }).click();
        await expect(page.locator('#deliveryStreet')).toBeVisible({
          timeout: 10000,
        });

        // Submit button is disabled while required delivery/customer fields are empty.
        const submitBtn = page.getByRole('button', { name: /Create Order/i });
        await expect(submitBtn).toBeDisabled();

        // Fill the required fields and assert the button becomes enabled.
        await page.locator('#deliveryStreet').fill('123 Main St');
        await page.locator('#deliveryCity').fill('Lagos');
        await page.locator('#deliveryState').fill('Lagos State');
        await page.locator('#customerName').fill('Delivery E2E');
        await page.locator('#customerPhone').fill('08011223344');
        await page.waitForTimeout(500);
        await expect(submitBtn).toBeEnabled({ timeout: 10000 });
        await evidenceShot(page, 'REQ-084', 5, 'delivery-fields-required');
      }
    );

    superAdminTest(
      'AC10: Customer info fields are required before submission',
      async ({ page }) => {
        tagTest('REQ-084', 10);

        if (!(await gotoExpressCheckoutStep(page))) {
          superAdminTest.skip(true, 'No in-stock express items seeded');
        }

        await page.getByRole('button', { name: /pickup/i }).click();
        await expect(page.locator('#pickupTime')).toBeVisible({
          timeout: 10000,
        });
        await page.locator('#pickupTime').fill('2026-01-01T12:00');

        // Leave customer name and phone empty — submit button must be disabled.
        const submitBtn = page.getByRole('button', { name: /Create Order/i });
        await expect(submitBtn).toBeDisabled();

        // Fill the required customer info and assert the button becomes enabled.
        await page.locator('#customerName').fill('Pickup E2E');
        await page.locator('#customerPhone').fill('08011223344');
        await page.waitForTimeout(500);
        await expect(submitBtn).toBeEnabled({ timeout: 10000 });
        await evidenceShot(page, 'REQ-084', 10, 'customer-info-required');
      }
    );
  }
);

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

  superAdminTest(
    'AC7: AdminTabCheckoutForm renders — no redirect',
    async ({ page }) => {
      tagTest('REQ-084', 7);
      guard(superAdminTest.skip, await isAuthenticated(page));

      await page.goto(`${BASE_URL}/dashboard/orders/tabs/${tabId}/checkout`);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/, {
        timeout: 10000,
      });
      await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({
        timeout: 10000,
      });
      await evidenceShot(page, 'REQ-084', 7, 'admin-tab-checkout-form');
    }
  );

  superAdminTest(
    'AC11: No Monnify checkout URL — manual payment only',
    async ({ page }) => {
      tagTest('REQ-084', 11);
      guard(superAdminTest.skip, await isAuthenticated(page));

      await page.goto(`${BASE_URL}/dashboard/orders/tabs/${tabId}/checkout`);
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/.*\/checkout/, {
        timeout: 10000,
      });
      await expect(
        page.getByText(/monnify|payment gateway/i)
      ).not.toBeVisible();
      await expect(page.getByText(/cash|transfer|card/i).first()).toBeVisible({
        timeout: 10000,
      });

      // Submit the manual payment (cash default) and verify the tab closes
      // without a Monnify redirect.
      await page
        .getByRole('button', { name: /Close Tab/i })
        .first()
        .click();
      await expect(page).toHaveURL(/\/dashboard\/orders\/tabs\/[^/]+\/?$/, {
        timeout: 10000,
      });
      // The success toast text is "Tab Paid & Closed".
      await expect(
        page.getByText('Tab Paid & Closed', { exact: true })
      ).toBeVisible({ timeout: 10000 });
      await evidenceShot(page, 'REQ-084', 11, 'no-monnify-manual-payment');
    }
  );
});
