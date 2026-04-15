import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-027: Admin User Deletion and Re-creation
 *
 * Validates that after a super-admin deletes an admin user via the
 * dashboard, the credentials (username, email) are freed and a new
 * admin can be created with the same credentials without errors.
 *
 * Test data lifecycle:
 *   Setup:    Create admin via "Create Admin" dialog
 *   Test:     Delete admin via actions dropdown, then recreate via dialog
 *   Teardown: Delete the recreated admin to leave clean state
 *
 * @requirement REQ-027 - User re-creation after admin deletion
 */

const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');
const ADMINS_URL = '/dashboard/settings/admins';
const TEST_USERNAME = `e2ereq027${Date.now().toString().slice(-6)}`;
const TEST_PASSWORD = 'E2eTest1!pass';

/**
 * Dismiss the Next.js dev hydration error overlay if present.
 * This overlay can intercept clicks on the underlying page.
 */
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

/**
 * Create an admin via the "Create Admin" dialog.
 * Fills username, password, role=admin, then submits.
 */
async function createAdminViaUI(page: Page, username: string): Promise<void> {
  await page.goto(ADMINS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);

  // Click "Create Admin" button
  await page.getByRole('button', { name: 'Create Admin' }).click();

  // Wait for dialog — use title to distinguish from any error overlays
  const dialog = page.getByRole('dialog', { name: 'Create Admin User' });
  await expect(dialog).toBeVisible();

  // Fill form
  await dialog.getByLabel(/^Username/).fill(username);
  await dialog
    .getByLabel(/^Password \*/)
    .first()
    .fill(TEST_PASSWORD);
  await dialog.getByLabel(/^Confirm Password/).fill(TEST_PASSWORD);

  // Role defaults to "admin" — no change needed

  // Submit
  await dialog.getByRole('button', { name: 'Create Admin' }).click();

  // Wait for page reload (CreateAdminDialog calls window.location.reload)
  await page.waitForLoadState('networkidle');

  // Verify admin appears in the list
  await expect(page.getByText(username)).toBeVisible({ timeout: 10_000 });
}

/**
 * Delete an admin via the actions dropdown on the admin list page.
 */
async function deleteAdminViaUI(page: Page, username: string): Promise<void> {
  await page.goto(ADMINS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);

  // Find the row with our admin's username
  const adminRow = page.locator('tr', { hasText: username });
  await expect(adminRow).toBeVisible({ timeout: 10_000 });

  // Open actions dropdown (last cell has the button with MoreHorizontal icon)
  const actionsButton = adminRow.locator('td').last().locator('button');
  await actionsButton.click();

  // Click "Delete Admin" in the dropdown menu
  await page.getByRole('menuitem', { name: 'Delete Admin' }).click();

  // Confirm in alert dialog — use title to distinguish from error overlays
  const alertDialog = page.getByRole('alertdialog', {
    name: 'Delete Admin User',
  });
  await expect(alertDialog).toBeVisible();
  await expect(alertDialog.getByText(username)).toBeVisible();

  await alertDialog.getByRole('button', { name: 'Delete Admin' }).click();

  // AlertDialogAction auto-closes the dialog; wait for the async delete
  await expect(alertDialog).not.toBeVisible({ timeout: 10_000 });

  // Wait for the async delete + list refresh, then verify via page reload
  await page.waitForTimeout(2000);
  await page.goto(ADMINS_URL);
  await page.waitForLoadState('networkidle');
  await dismissErrorOverlay(page);
  await expect(page.locator('tr', { hasText: username })).not.toBeVisible({
    timeout: 10_000,
  });
}

// ---------------------------------------------------------------------------
// Test fixture with super-admin session
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
      // Step 1: Create an admin
      await createAdminViaUI(page, TEST_USERNAME);

      // Step 2: Delete the admin via UI
      await deleteAdminViaUI(page, TEST_USERNAME);

      // Step 3: Recreate admin with the SAME username
      await createAdminViaUI(page, TEST_USERNAME);

      // Step 4: Teardown — delete the recreated admin
      await deleteAdminViaUI(page, TEST_USERNAME);
    }
  );
});
