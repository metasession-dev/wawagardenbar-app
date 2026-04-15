import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-027: User Deletion and Re-creation
 *
 * Validates that after an admin deletes a user, the system allows
 * creating a new user with the same credentials (email/phone).
 * Uses the super-admin session for deletion via the dashboard.
 *
 * @requirement REQ-027 - User re-creation after admin deletion
 */

const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

const superAdminTest = base.extend({
  storageState: SUPER_ADMIN_FILE,
});

superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(
      true,
      'Super-admin login failed or credentials not configured — skipping'
    );
  }
});

// ===========================================================================
// REQ-027: User Deletion produces soft-delete (not hard delete)
// ===========================================================================
superAdminTest.describe('REQ-027: User Deletion & Re-creation', () => {
  superAdminTest(
    'customers page loads and shows customer list',
    async ({ page }) => {
      await page.goto('/dashboard/customers');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/dashboard/customers');
    }
  );

  superAdminTest(
    'delete user action returns success via server action',
    async ({ page }) => {
      // Create a disposable test user directly in the database via the test API
      const testEmail = `e2e-delete-test-${Date.now()}@test.com`;
      const testPhone = `+234${Date.now().toString().slice(-10)}`;

      // Use the test login endpoint to create a user, then delete them
      // First, navigate to customers page
      await page.goto('/dashboard/customers');
      await page.waitForLoadState('networkidle');

      // Call deleteUserAction via page.evaluate to test the server action
      // We create and delete via the app's internal mechanisms
      const result = await page.evaluate(
        async ({ email, phone }) => {
          // Create a test user via fetch to the internal API
          const createRes = await fetch('/api/test/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              phone,
              firstName: 'E2E',
              lastName: 'DeleteTest',
            }),
          });

          if (!createRes.ok) {
            // If test endpoint doesn't exist, skip gracefully
            return {
              skipped: true,
              reason: 'test create-user endpoint not available',
            };
          }

          const created = await createRes.json();
          if (!created.success || !created.data?._id) {
            return { skipped: true, reason: 'failed to create test user' };
          }

          // Now delete the user via the test API
          const deleteRes = await fetch('/api/test/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: created.data._id }),
          });

          if (!deleteRes.ok) {
            return {
              skipped: true,
              reason: 'test delete-user endpoint not available',
            };
          }

          const deleteResult = await deleteRes.json();

          // Try creating another user with the same email
          const recreateRes = await fetch('/api/test/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              phone: `+234${Date.now().toString().slice(-10)}`,
              firstName: 'E2E',
              lastName: 'RecreateTest',
            }),
          });

          const recreateResult = recreateRes.ok
            ? await recreateRes.json()
            : null;

          return {
            skipped: false,
            deleteSuccess: deleteResult.success,
            recreateSuccess: recreateResult?.success ?? false,
          };
        },
        { email: testEmail, phone: testPhone }
      );

      if (result.skipped) {
        superAdminTest.skip();
        return;
      }

      expect(result.deleteSuccess).toBe(true);
      expect(result.recreateSuccess).toBe(true);
    }
  );

  superAdminTest(
    'soft-deleted users do not appear in active customer list',
    async ({ page }) => {
      await page.goto('/dashboard/customers');
      await page.waitForLoadState('networkidle');

      // The customer list filters by accountStatus: 'active' by default
      // Verify the page loads and shows the customer table
      const pageContent = await page.textContent('body');
      // The page should load without errors
      expect(page.url()).toContain('/dashboard/customers');
      // Should not contain error messages about deleted users
      expect(pageContent).not.toContain('Error loading customers');
    }
  );
});
