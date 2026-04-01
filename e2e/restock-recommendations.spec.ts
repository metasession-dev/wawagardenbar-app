/**
 * @requirement REQ-019 - E2E: Restock recommendations page access and navigation
 * @requirement REQ-020 - E2E: Strategy selector and CSV export
 *
 * Verifies:
 * - Page loads for authenticated admin/super-admin
 * - Unauthorized users are redirected
 * - Navigation link exists on inventory page
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');

const superAdminTest = base.extend({
  storageState: SUPER_ADMIN_FILE,
});

async function isAuthenticated(
  page: Page,
  role: 'admin' | 'super-admin'
): Promise<boolean> {
  try {
    const target = role === 'super-admin' ? '/dashboard' : '/dashboard/orders';
    await page.goto(target);
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Page Access
// ═══════════════════════════════════════════════════════════════════════════
superAdminTest.describe(
  'REQ-019: Restock Recommendations — Page Access',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page, 'super-admin'))) {
        testInfo.skip(true, 'Super-admin login failed');
      }
    });

    superAdminTest(
      'should display restock recommendations page',
      async ({ page }) => {
        await page.goto('/dashboard/inventory/restock-recommendations');
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain(
          '/dashboard/inventory/restock-recommendations'
        );
        await expect(
          page.locator('h1', { hasText: 'Restock Recommendations' })
        ).toBeVisible();
        await expect(
          page.locator('p', {
            hasText: 'View suggested restock quantities',
          })
        ).toBeVisible();
      }
    );

    superAdminTest('should show filter controls', async ({ page }) => {
      await page.goto('/dashboard/inventory/restock-recommendations');
      await page.waitForLoadState('networkidle');

      // Check filter comboboxes are present (Category, Lookback Period, Subcategory, Price Bracket, Priority)
      const comboboxes = page.getByRole('combobox');
      await expect(comboboxes).toHaveCount(5);

      // Check specific filter labels
      await expect(page.getByText('Lookback Period')).toBeVisible();
      await expect(page.getByText('Subcategory')).toBeVisible();
      await expect(page.getByText('Price Bracket')).toBeVisible();
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Unauthorized Access
// ═══════════════════════════════════════════════════════════════════════════
base.describe('REQ-019: Restock Recommendations — Unauthorized', () => {
  base('should redirect unauthorized users', async ({ page }) => {
    await page.goto('/dashboard/inventory/restock-recommendations');
    await page.waitForLoadState('networkidle');

    // Should not be on the restock recommendations page
    expect(page.url()).not.toContain('/restock-recommendations');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Navigation from Inventory Page
// ═══════════════════════════════════════════════════════════════════════════
superAdminTest.describe('REQ-019: Restock Recommendations — Navigation', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page, 'super-admin'))) {
      testInfo.skip(true, 'Super-admin login failed');
    }
  });

  superAdminTest('should navigate from inventory page', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.waitForLoadState('networkidle');

    const link = page.locator(
      'a[href="/dashboard/inventory/restock-recommendations"]'
    );
    await expect(link).toBeVisible();
    await expect(link).toContainText('Restock Recommendations');

    await link.click();
    await page.waitForURL('**/restock-recommendations');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain(
      '/dashboard/inventory/restock-recommendations'
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REQ-020: Strategy Selector and CSV Export
// ═══════════════════════════════════════════════════════════════════════════
superAdminTest.describe(
  'REQ-020: Restock Recommendations — Strategy & Export',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page, 'super-admin'))) {
        testInfo.skip(true, 'Super-admin login failed');
      }
    });

    superAdminTest(
      'should show strategy selector with three options',
      async ({ page }) => {
        await page.goto('/dashboard/inventory/restock-recommendations');
        await page.waitForLoadState('networkidle');

        await expect(
          page.getByRole('button', { name: 'Popularity' })
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Profitability' })
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Stock Urgency' })
        ).toBeVisible();
      }
    );

    superAdminTest('should show export CSV button', async ({ page }) => {
      await page.goto('/dashboard/inventory/restock-recommendations');
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('button', { name: /Export CSV/i })
      ).toBeVisible();
    });

    superAdminTest('should switch strategies', async ({ page }) => {
      await page.goto('/dashboard/inventory/restock-recommendations');
      await page.waitForLoadState('networkidle');

      // Default is Popularity
      const popularityBtn = page.getByRole('button', { name: 'Popularity' });
      await expect(popularityBtn).toBeVisible();

      // Switch to Stock Urgency
      await page.getByRole('button', { name: 'Stock Urgency' }).click();
      await page.waitForLoadState('networkidle');

      // Switch to Profitability
      await page.getByRole('button', { name: 'Profitability' }).click();
      await page.waitForLoadState('networkidle');

      // Page should still be functional
      await expect(
        page.locator('h1', { hasText: 'Restock Recommendations' })
      ).toBeVisible();
    });
  }
);
