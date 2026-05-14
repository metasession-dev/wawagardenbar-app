/**
 * @requirement REQ-034 — D11 — Step 1 (post-D5 walkback)
 *
 * Permission-based gating of `/dashboard/kitchen/*`. The three originally
 * proposed roles (kitchen / bar / waiting) were dropped in D5 in favour
 * of a single `kitchenManagement` feature-permission on the existing
 * csr/admin/super-admin roles.
 *
 * Seeded fixtures (scripts/seed-e2e-admins.ts):
 *   - super-admin: implicitly has kitchenManagement
 *   - admin:       has kitchenManagement=true
 *   - csr:         has kitchenManagement=false
 */
import { expect } from '@playwright/test';
import { superAdminTest, adminTest, csrTest, isAuthenticated } from './helpers';

superAdminTest.describe(
  'REQ-034 D11 — Step 1: permission gating (positive paths)',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'super-admin auth missing');
      }
    });

    superAdminTest(
      'super-admin sees the Recipes + Production sidebar entries',
      async ({ page }) => {
        await page.goto('/dashboard/orders');
        await page.waitForLoadState('networkidle');
        const sidebar = page.locator('nav');
        await expect(
          sidebar.getByRole('link', { name: /^Recipes$/ })
        ).toBeVisible();
        await expect(
          sidebar.getByRole('link', { name: /^Production$/ })
        ).toBeVisible();
      }
    );

    superAdminTest(
      'super-admin reaches /dashboard/kitchen/recipes and /production',
      async ({ page }) => {
        await page.goto('/dashboard/kitchen/recipes');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/dashboard/kitchen/recipes');
        await expect(page.locator('h1', { hasText: 'Recipes' })).toBeVisible();

        await page.goto('/dashboard/kitchen/production');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/dashboard/kitchen/production');
        await expect(
          page.locator('h1', { hasText: 'Production' })
        ).toBeVisible();
      }
    );

    superAdminTest(
      'breadcrumbs read "Kitchen › Recipes" (not "Kitchen Display › Recipes" — D9)',
      async ({ page }) => {
        await page.goto('/dashboard/kitchen/recipes');
        await page.waitForLoadState('networkidle');
        const crumbs = page.locator('nav[aria-label="Breadcrumb"]');
        await expect(crumbs).toContainText(/Kitchen\s*›?\s*Recipes/i);
        // Specifically verify the legacy "Kitchen Display" label is gone here.
        await expect(crumbs).not.toContainText(/Kitchen Display/i);
      }
    );

    superAdminTest(
      'legacy kitchen display still reachable at /dashboard/kitchen-display (D9)',
      async ({ page }) => {
        await page.goto('/dashboard/kitchen-display');
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/dashboard/kitchen-display');
        await expect(
          page.locator('h1', { hasText: 'Kitchen Display' })
        ).toBeVisible();
      }
    );
  }
);

adminTest.describe('REQ-034 D11 — Step 1: admin WITH kitchenManagement', () => {
  adminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'admin auth missing');
    }
  });

  adminTest(
    'admin with permission sees sidebar entries and reaches /kitchen/*',
    async ({ page }) => {
      await page.goto('/dashboard/orders');
      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('nav').getByRole('link', { name: /^Recipes$/ })
      ).toBeVisible();
      await page.goto('/dashboard/kitchen/recipes');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/dashboard/kitchen/recipes');
    }
  );
});

csrTest.describe('REQ-034 D11 — Step 1: csr WITHOUT kitchenManagement', () => {
  csrTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'csr auth missing');
    }
  });

  csrTest(
    'csr does NOT see Recipes / Production in the sidebar',
    async ({ page }) => {
      await page.goto('/dashboard/orders');
      await page.waitForLoadState('networkidle');
      const sidebar = page.locator('nav');
      await expect(
        sidebar.getByRole('link', { name: /^Recipes$/ })
      ).toHaveCount(0);
      await expect(
        sidebar.getByRole('link', { name: /^Production$/ })
      ).toHaveCount(0);
    }
  );

  csrTest(
    'csr hitting /dashboard/kitchen/recipes is bounced (forbidden / unauthorized)',
    async ({ page }) => {
      const resp = await page.goto('/dashboard/kitchen/recipes');
      await page.waitForLoadState('networkidle');
      // proxy.ts redirects csr to /dashboard/forbidden when role lacks the
      // route allowlist; layout-level requirePermission also redirects to
      // the forbidden page. Either landing place is correct.
      expect(page.url()).toMatch(/forbidden|unauthorized/);
      // Reading status from the final navigation is non-deterministic across
      // redirect chains — the URL invariant is what we care about.
      void resp;
    }
  );
});
