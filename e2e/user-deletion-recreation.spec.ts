import {
  test as base,
  expect,
  Page,
  APIRequestContext,
} from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-027: User Deletion and Re-creation
 *
 * Two test groups:
 *
 * 1. Admin deletion — Create admin via "Create Admin" dialog, delete via
 *    admin management dropdown, recreate with the same username.
 *
 * 2. Customer deletion — Seed a customer via the test API, delete via the
 *    customers page dropdown, verify the customer disappears, then seed
 *    a new customer with the same email/phone to prove credentials are freed.
 *
 * Test data lifecycle uses setup/teardown per test so no stale data remains.
 *
 * @requirement REQ-027 - User re-creation after admin deletion
 */

const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');
const ADMINS_URL = '/dashboard/settings/admins';
const CUSTOMERS_URL = '/dashboard/customers';
const TEST_USERNAME = `e2ereq027${Date.now().toString().slice(-6)}`;
const TEST_PASSWORD = 'E2eTest1!pass';
const CUSTOMER_EMAIL = `e2e-cust-${Date.now()}@test.req027.com`;
const CUSTOMER_PHONE = `+234${Date.now().toString().slice(-10)}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissErrorOverlay(page: Page): Promise<void> {
  const closeButton = page.locator('[data-nextjs-dialog-close-button]');
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
  }
}

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

async function isTestApiAvailable(
  request: APIRequestContext
): Promise<boolean> {
  try {
    const res = await request.post('/api/test/manage-user', {
      data: { action: 'unknown' },
    });
    return res.status() !== 403;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

async function createAdminViaUI(page: Page, username: string): Promise<void> {
  await page.goto(ADMINS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);

  await page.getByRole('button', { name: 'Create Admin' }).click();

  const dialog = page.getByRole('dialog', { name: 'Create Admin User' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel(/^Username/).fill(username);
  await dialog
    .getByLabel(/^Password \*/)
    .first()
    .fill(TEST_PASSWORD);
  await dialog.getByLabel(/^Confirm Password/).fill(TEST_PASSWORD);

  await dialog.getByRole('button', { name: 'Create Admin' }).click();

  await page.waitForLoadState('networkidle');
  await expect(page.getByText(username)).toBeVisible({ timeout: 10_000 });
}

async function deleteAdminViaUI(page: Page, username: string): Promise<void> {
  await page.goto(ADMINS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);

  const adminRow = page.locator('tr', { hasText: username });
  await expect(adminRow).toBeVisible({ timeout: 10_000 });

  await adminRow.locator('td').last().locator('button').click();
  await page.getByRole('menuitem', { name: 'Delete Admin' }).click();

  const alertDialog = page.getByRole('alertdialog', {
    name: 'Delete Admin User',
  });
  await expect(alertDialog).toBeVisible();
  await alertDialog.getByRole('button', { name: 'Delete Admin' }).click();
  await expect(alertDialog).not.toBeVisible({ timeout: 10_000 });

  await page.waitForTimeout(2000);
  await page.goto(ADMINS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);
  await expect(page.locator('tr', { hasText: username })).not.toBeVisible({
    timeout: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Customer helpers
// ---------------------------------------------------------------------------

async function seedCustomer(
  request: APIRequestContext,
  email: string,
  phone: string
): Promise<string> {
  const res = await request.post('/api/test/manage-user', {
    data: {
      action: 'create',
      email,
      phone,
      firstName: 'E2E',
      lastName: 'Customer',
    },
  });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.success).toBe(true);
  return body.data._id;
}

async function cleanupTestCustomers(request: APIRequestContext): Promise<void> {
  // Clean up by email pattern — catches both original and mangled emails
  await request.post('/api/test/manage-user', {
    data: {
      action: 'cleanup',
      emailPattern: 'e2e-cust-.*@test\\.req027\\.com',
    },
  });
  // Also clean up any mangled del_*@deleted records from this test
  await request.post('/api/test/manage-user', {
    data: { action: 'cleanup', emailPattern: 'del_.*@deleted' },
  });
}

async function deleteCustomerViaUI(page: Page, email: string): Promise<void> {
  await page.goto(CUSTOMERS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);

  const customerRow = page.locator('tr', { hasText: email });
  await expect(customerRow).toBeVisible({ timeout: 10_000 });

  // Open the actions dropdown (button with sr-only "Open menu")
  const actionsButton = customerRow.locator('button').filter({
    has: page.locator('.sr-only', { hasText: 'Open menu' }),
  });
  await actionsButton.click();

  // Click "Delete User" in the dropdown
  await page.getByText('Delete User').first().click();

  // Confirm in the dialog
  const dialog = page.getByRole('dialog', { name: 'Delete User' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete User' }).click();

  // Wait for success toast (shadcn useToast — renders in the DOM)
  await expect(page.getByText('User Deleted', { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  // Verify customer no longer in the list
  await page.goto(CUSTOMERS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);
  await expect(page.locator('tr', { hasText: email })).not.toBeVisible({
    timeout: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

const superAdminTest = base.extend({
  storageState: SUPER_ADMIN_FILE,
});

superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(
      true,
      'Super-admin login failed or credentials not configured'
    );
  }
});

// ---------------------------------------------------------------------------
// REQ-027: Admin Deletion & Re-creation
// ---------------------------------------------------------------------------

superAdminTest.describe('REQ-027: Admin Deletion & Re-creation', () => {
  superAdminTest(
    'can delete admin and recreate with same username',
    async ({ page }) => {
      await createAdminViaUI(page, TEST_USERNAME);
      await deleteAdminViaUI(page, TEST_USERNAME);
      await createAdminViaUI(page, TEST_USERNAME);
      // Teardown
      await deleteAdminViaUI(page, TEST_USERNAME);
    }
  );
});

// ---------------------------------------------------------------------------
// REQ-027: Customer Deletion & Re-creation
// ---------------------------------------------------------------------------

superAdminTest.describe('REQ-027: Customer Deletion & Re-creation', () => {
  superAdminTest(
    'can delete customer and recreate with same email and phone',
    async ({ page, request }) => {
      if (!(await isTestApiAvailable(request))) {
        superAdminTest.skip(true, 'Test API not enabled');
        return;
      }

      // Cleanup any leftovers from previous runs
      await cleanupTestCustomers(request);

      // Step 1: Seed a customer
      await seedCustomer(request, CUSTOMER_EMAIL, CUSTOMER_PHONE);

      // Step 2: Verify customer appears on the customers page
      await page.goto(CUSTOMERS_URL);
      await page.waitForLoadState('networkidle');
      await dismissErrorOverlay(page);
      await expect(page.locator('tr', { hasText: CUSTOMER_EMAIL })).toBeVisible(
        { timeout: 10_000 }
      );

      // Step 3: Delete via UI
      await deleteCustomerViaUI(page, CUSTOMER_EMAIL);

      // Step 4: Recreate with the SAME email and phone
      await seedCustomer(request, CUSTOMER_EMAIL, CUSTOMER_PHONE);

      // Step 5: Verify new customer appears
      await page.goto(CUSTOMERS_URL);
      await page.waitForLoadState('networkidle');
      await dismissErrorOverlay(page);
      await expect(page.locator('tr', { hasText: CUSTOMER_EMAIL })).toBeVisible(
        { timeout: 10_000 }
      );

      // Teardown
      await cleanupTestCustomers(request);
    }
  );
});
