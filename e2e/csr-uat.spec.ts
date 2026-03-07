import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * UAT Tests — CSR (Customer Service Representative) Role
 *
 * Validates that the CSR role has correct access controls:
 *   - Can access: Orders, Customers, Rewards
 *   - Cannot access: Menu, Inventory, Expenses, Reports, Audit Logs, Settings
 *   - Redirected from /dashboard to /dashboard/orders
 *   - Shows CSR badge in sidebar
 *   - Nav only shows permitted items
 */

const CSR_FILE = path.join(__dirname, '../.auth/csr.json');
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

const csrTest = base.extend({
  storageState: CSR_FILE,
});

csrTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'CSR login failed or credentials not configured — skipping');
  }
});

const superAdminTest = base.extend({
  storageState: SUPER_ADMIN_FILE,
});

superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed or credentials not configured — skipping');
  }
});

// ===========================================================================
// UAT: CSR Login & Redirect
// ===========================================================================
csrTest.describe('UAT: CSR Login & Redirect', () => {
  csrTest('CSR is redirected from /dashboard to /dashboard/orders', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard\/orders/, { timeout: 10000 });
    expect(page.url()).toContain('/dashboard/orders');
  });

  csrTest('CSR can access orders dashboard', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/orders');
    await expect(page.locator('h1', { hasText: 'Orders Dashboard' })).toBeVisible();
  });
});

// ===========================================================================
// UAT: CSR Navigation — Permitted Items
// ===========================================================================
csrTest.describe('UAT: CSR Navigation — Permitted Items', () => {
  csrTest('CSR sidebar shows Orders link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    // Use nav-scoped selector to avoid matching breadcrumb links
    await expect(page.locator('nav a[href="/dashboard/orders"]')).toBeVisible();
  });

  csrTest('CSR sidebar shows Customers link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Customers' })).toBeVisible();
  });

  csrTest('CSR sidebar shows Rewards link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Rewards' })).toBeVisible();
  });

  csrTest('CSR sidebar shows CSR badge', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=CSR').first()).toBeVisible();
  });
});

// ===========================================================================
// UAT: CSR Navigation — Restricted Items Hidden
// ===========================================================================
csrTest.describe('UAT: CSR Navigation — Restricted Items Hidden', () => {
  csrTest('CSR sidebar does NOT show Overview link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    // Overview link goes to /dashboard (exact), but CSR has Orders link too
    // Check that the "Overview" text nav item is not present
    const overviewLink = page.locator('nav a', { hasText: 'Overview' });
    await expect(overviewLink).toHaveCount(0);
  });

  csrTest('CSR sidebar does NOT show Menu link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    const menuLink = page.locator('nav a[href="/dashboard/menu"]');
    await expect(menuLink).toHaveCount(0);
  });

  csrTest('CSR sidebar does NOT show Inventory link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    const inventoryLink = page.locator('nav a[href="/dashboard/inventory"]');
    await expect(inventoryLink).toHaveCount(0);
  });

  csrTest('CSR sidebar does NOT show Settings link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    const settingsLink = page.locator('nav a[href="/dashboard/settings"]');
    await expect(settingsLink).toHaveCount(0);
  });

  csrTest('CSR sidebar does NOT show Reports link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    const reportsLink = page.locator('nav a[href="/dashboard/reports"]');
    await expect(reportsLink).toHaveCount(0);
  });

  csrTest('CSR sidebar does NOT show Audit Logs link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    const auditLink = page.locator('nav a[href="/dashboard/audit-logs"]');
    await expect(auditLink).toHaveCount(0);
  });

  csrTest('CSR sidebar does NOT show Expenses link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    const expensesLink = page.locator('nav a[href="/dashboard/finance/expenses"]');
    await expect(expensesLink).toHaveCount(0);
  });
});

// ===========================================================================
// UAT: CSR Access — Permitted Pages
// ===========================================================================
csrTest.describe('UAT: CSR Access — Permitted Pages', () => {
  csrTest('CSR can access customers page', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/customers');
    const body = await page.textContent('body');
    expect(body).toMatch(/customer|user|email|phone/i);
  });

  csrTest('CSR can access rewards page', async ({ page }) => {
    await page.goto('/dashboard/rewards');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/rewards');
    const body = await page.textContent('body');
    expect(body).toMatch(/reward|rule|issued|template/i);
  });

  csrTest('CSR can access tabs page', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/orders/tabs');
    const body = await page.textContent('body');
    expect(body).toMatch(/tab|open|closed|table/i);
  });
});

// ===========================================================================
// UAT: CSR Access — Restricted Pages (should redirect to forbidden)
// ===========================================================================
csrTest.describe('UAT: CSR Access — Restricted Pages', () => {
  csrTest('CSR cannot access settings page', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    // Should be redirected to forbidden
    expect(page.url()).toContain('/forbidden');
  });

  csrTest('CSR cannot access menu management', async ({ page }) => {
    await page.goto('/dashboard/menu');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/forbidden');
  });

  csrTest('CSR cannot access inventory page', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/forbidden');
  });

  csrTest('CSR cannot access audit logs', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/forbidden');
  });

  csrTest('CSR cannot access reports', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/forbidden');
  });

  csrTest('CSR cannot access expenses', async ({ page }) => {
    await page.goto('/dashboard/finance/expenses');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/forbidden');
  });
});

// ===========================================================================
// UAT: Admin list shows CSR role (super-admin verifies)
// ===========================================================================
superAdminTest.describe('UAT: Admin List — CSR Role Visible', () => {
  superAdminTest('admin management page shows CSR user', async ({ page }) => {
    await page.goto('/dashboard/settings/admins');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('e2e-csr');
  });

  superAdminTest('admin list CSR role filter works', async ({ page }) => {
    await page.goto('/dashboard/settings/admins');
    await page.waitForLoadState('networkidle');
    // Open the role filter dropdown — it's a Radix Select trigger
    await page.locator('button[role="combobox"]', { hasText: /All Roles/ }).click();
    await page.locator('[role="option"]', { hasText: 'CSR' }).click();
    // Wait for the list to re-fetch
    await page.waitForTimeout(1000);
    // The CSR user should appear
    const body = await page.textContent('body');
    expect(body).toContain('e2e-csr');
  });

  superAdminTest('create admin dialog shows CSR role option', async ({ page }) => {
    await page.goto('/dashboard/settings/admins');
    await page.waitForLoadState('networkidle');
    // Click the create admin button
    await page.locator('button', { hasText: /Create Admin/ }).click();
    // Wait for dialog to open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Scroll dialog to make role selector visible
    const dialog = page.locator('[role="dialog"]');
    await dialog.evaluate((el) => el.scrollTop = el.scrollHeight);
    // Open role selector — it's inside the dialog
    await dialog.locator('button[role="combobox"]').click();
    // CSR option should be visible
    await expect(page.locator('[role="option"]', { hasText: 'Customer Service Rep' })).toBeVisible();
  });
});
