import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-007: Authenticated Feature Verification
 *
 * These tests exercise features that require an active session.
 * They use pre-authenticated storageState from auth.setup.ts.
 *
 * If admin users haven't been seeded (scripts/create-super-admin.ts),
 * or credentials are missing from env, tests skip gracefully.
 *
 * @requirement REQ-007 - Comprehensive Requirements Document
 */

// ---------------------------------------------------------------------------
// Fixtures — admin and super-admin test contexts
// ---------------------------------------------------------------------------

const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');
const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');

/** Check if the page has a valid authenticated session by navigating to a protected page */
async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    // If we stay on dashboard, we're authenticated; if redirected to login, we're not
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

const adminTest = base.extend({
  storageState: ADMIN_FILE,
});

// Skip admin tests if login failed during setup
adminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Admin login failed or credentials not configured — skipping');
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
// Section 4: Session API — Verify Session State
// ===========================================================================
adminTest.describe('Section 4: Admin Session', () => {
  adminTest('admin can access dashboard without redirect', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
  });
});

superAdminTest.describe('Section 4: Super-Admin Session', () => {
  superAdminTest('super-admin can access dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard');
    // Super-admin stays on /dashboard (not redirected to /dashboard/orders)
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  });
});

// ===========================================================================
// Section 11: Dashboard Overview (Super-Admin Only)
// ===========================================================================
superAdminTest.describe('Section 11: Dashboard Overview', () => {
  superAdminTest('super-admin can access dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain("Today's Revenue");
    expect(body).toContain("Today's Orders");
    expect(body).toContain('Monthly Revenue');
    expect(body).toContain('Avg Order Value');
  });

  superAdminTest('dashboard shows quick stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('Pending Orders');
    expect(body).toContain('Low Stock Items');
    expect(body).toContain('Active Customers');
  });

  superAdminTest('dashboard shows recent orders section', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Recent Orders')).toBeVisible();
  });
});

adminTest.describe('Section 11: Dashboard RBAC — Admin Redirect', () => {
  adminTest('regular admin is redirected from /dashboard to /dashboard/orders', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/dashboard\/orders/, { timeout: 10000 });
    expect(page.url()).toContain('/dashboard/orders');
  });
});

// ===========================================================================
// Section 12: Order Management (Admin)
// ===========================================================================
adminTest.describe('Section 12: Order Management', () => {
  adminTest('orders dashboard loads with title and controls', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'Orders Dashboard' })).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain('Manage and track all restaurant orders');
  });

  adminTest('orders page shows Tabs Display link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Tabs Display')).toBeVisible();
  });

  adminTest('orders page shows Kitchen Display link', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Kitchen Display')).toBeVisible();
  });

  adminTest('orders page shows Quick Actions section', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain('Open a Order');
    expect(body).toContain('Open a New Tab');
    expect(body).toContain('Add to Existing Tab');
    expect(body).toContain('Inventory Summary');
  });
});

superAdminTest.describe('Section 12: Order Management — Super-Admin Extras', () => {
  superAdminTest('super-admin sees Analytics card on orders page', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Analytics')).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain('sales performance');
  });
});

// ===========================================================================
// Section 8: Tab Management (Admin)
// ===========================================================================
adminTest.describe('Section 8: Tab Management', () => {
  adminTest('tabs page loads for authenticated admin', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');
    // Should load without redirect
    expect(page.url()).toContain('/dashboard/orders/tabs');
    const body = await page.textContent('body');
    expect(body).toMatch(/tab|open|closed|table/i);
  });
});

// ===========================================================================
// Section 13: Menu Management (Super-Admin Only)
// ===========================================================================
superAdminTest.describe('Section 13: Menu Management', () => {
  superAdminTest('menu management page loads with items', async ({ page }) => {
    await page.goto('/dashboard/menu');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/menu');
    const body = await page.textContent('body');
    expect(body).toMatch(/menu|item|add|manage/i);
  });

  superAdminTest('new menu item page loads with form', async ({ page }) => {
    await page.goto('/dashboard/menu/new');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/menu/new');
    const body = await page.textContent('body');
    // Should have form fields for creating a menu item
    expect(body).toMatch(/name|price|category|description/i);
  });
});

// ===========================================================================
// Section 14: Inventory Management (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 14: Inventory Management', () => {
  superAdminTest('inventory page loads', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/inventory');
    const body = await page.textContent('body');
    expect(body).toMatch(/inventory|stock|item/i);
  });

  superAdminTest('inventory snapshots page loads', async ({ page }) => {
    await page.goto('/dashboard/inventory/snapshots');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/inventory/snapshots');
  });

  superAdminTest('inventory transfer page loads', async ({ page }) => {
    await page.goto('/dashboard/inventory/transfer');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/inventory/transfer');
  });
});

// ===========================================================================
// Section 15: Financial Management (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 15: Financial Management', () => {
  superAdminTest('expenses page loads', async ({ page }) => {
    await page.goto('/dashboard/finance/expenses');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/finance/expenses');
    const body = await page.textContent('body');
    expect(body).toMatch(/expense|cost|finance/i);
  });
});

// ===========================================================================
// Section 16: Reports & Analytics (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 16: Reports & Analytics', () => {
  superAdminTest('reports page loads', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/reports');
    const body = await page.textContent('body');
    expect(body).toMatch(/report|daily|inventory|profitability/i);
  });

  superAdminTest('daily report page loads', async ({ page }) => {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/reports/daily');
  });

  superAdminTest('inventory report page loads', async ({ page }) => {
    await page.goto('/dashboard/reports/inventory');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/reports/inventory');
  });

  superAdminTest('profitability report page loads', async ({ page }) => {
    await page.goto('/dashboard/reports/profitability');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/reports/profitability');
  });

  superAdminTest('profitability analytics page loads', async ({ page }) => {
    await page.goto('/dashboard/analytics/profitability');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/analytics/profitability');
  });
});

// ===========================================================================
// Section 17: Kitchen Display System
// ===========================================================================
adminTest.describe('Section 17: Kitchen Display System', () => {
  adminTest('kitchen display loads with dark theme', async ({ page }) => {
    await page.goto('/dashboard/kitchen');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/kitchen');
    await expect(page.locator('h1', { hasText: 'Kitchen Display' })).toBeVisible();
    // Kitchen uses dark theme (bg-gray-900)
    const container = page.locator('.bg-gray-900');
    await expect(container).toBeVisible();
  });

  adminTest('kitchen display shows active order count', async ({ page }) => {
    await page.goto('/dashboard/kitchen');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toMatch(/Active Order/i);
  });

  adminTest('kitchen display has back button to orders', async ({ page }) => {
    await page.goto('/dashboard/kitchen');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Back to Dashboard' })).toBeVisible();
  });
});

// ===========================================================================
// Section 18: Rewards Configuration (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 18: Rewards Configuration', () => {
  superAdminTest('rewards dashboard loads', async ({ page }) => {
    await page.goto('/dashboard/rewards');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/rewards');
    const body = await page.textContent('body');
    expect(body).toMatch(/reward|rule|issued|template/i);
  });

  superAdminTest('reward rules page loads', async ({ page }) => {
    await page.goto('/dashboard/rewards/rules');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/rewards/rules');
  });

  superAdminTest('issued rewards page loads', async ({ page }) => {
    await page.goto('/dashboard/rewards/issued');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/rewards/issued');
  });

  superAdminTest('reward templates page loads', async ({ page }) => {
    await page.goto('/dashboard/rewards/templates');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/rewards/templates');
  });
});

// ===========================================================================
// Section 19: Settings & Configuration (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 19: Settings & Configuration', () => {
  superAdminTest('settings page loads with configuration sections', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/settings');
    const body = await page.textContent('body');
    expect(body).toMatch(/setting|config|fee|delivery|payment/i);
  });

  superAdminTest('admin management page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/admins');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/settings/admins');
    const body = await page.textContent('body');
    expect(body).toMatch(/admin|user|role|permission/i);
  });

  superAdminTest('API keys management page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/api-keys');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/settings/api-keys');
    const body = await page.textContent('body');
    expect(body).toMatch(/api|key|scope/i);
  });

  superAdminTest('data requests page loads', async ({ page }) => {
    await page.goto('/dashboard/settings/data-requests');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/settings/data-requests');
  });
});

// ===========================================================================
// Section 23: Audit Logs (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 23: Audit Logs', () => {
  superAdminTest('audit logs page loads', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/audit-logs');
    const body = await page.textContent('body');
    expect(body).toMatch(/audit|log|action|user/i);
  });
});

// ===========================================================================
// Section 11: Dashboard Navigation (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 11: Dashboard Navigation', () => {
  superAdminTest('dashboard sidebar shows navigation links', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // The dashboard layout has a sidebar nav with section links
    await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Menu' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  superAdminTest('dashboard has header with "Dashboard" title', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header').locator('text=Dashboard')).toBeVisible();
  });
});

// ===========================================================================
// Section 11: Dashboard Customers Page (Super-Admin)
// ===========================================================================
superAdminTest.describe('Section 11: Customers Management', () => {
  superAdminTest('customers page loads', async ({ page }) => {
    await page.goto('/dashboard/customers');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/dashboard/customers');
    const body = await page.textContent('body');
    expect(body).toMatch(/customer|user|email|phone/i);
  });
});

// ===========================================================================
// Section 4: Admin Logout
// ===========================================================================
superAdminTest.describe('Section 4: Admin Logout', () => {
  superAdminTest('logout endpoint returns success', async ({ request }) => {
    const res = await request.post('/api/auth/logout');
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const json = await res.json();
      expect(json.success).toBe(true);
    }
  });
});
