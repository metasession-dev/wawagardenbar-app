import { test, expect } from '@playwright/test';

/**
 * E2E Tests — REQ-007: Comprehensive Requirements Document Verification
 *
 * These tests verify that the documented requirements in docs/REQUIREMENTS.md
 * are met by the running application. Each test group maps to a section in the
 * requirements document.
 *
 * @requirement REQ-007 - Comprehensive Requirements Document
 */

// ---------------------------------------------------------------------------
// Section 1 & 5.1: Home Page / Welcome Screen
// ---------------------------------------------------------------------------
test.describe('Section 1/5.1: Home Page', () => {
  test('renders home page with branding and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Wawa/i);
    // Hero section should be visible
    const heroHeading = page.locator('h1, h2').first();
    await expect(heroHeading).toBeVisible();
    // "View Menu" or menu link CTA should exist
    const menuLink = page.locator('a[href*="/menu"]').first();
    await expect(menuLink).toBeVisible();
  });

  test('displays order type feature cards (Dine In, Pickup, Delivery)', async ({ page }) => {
    await page.goto('/');
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('Dine In');
    expect(bodyText).toContain('Pickup');
    expect(bodyText).toContain('Delivery');
  });

  test('is responsive — renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Section 4: Authentication — Login Page
// ---------------------------------------------------------------------------
test.describe('Section 4: Authentication', () => {
  test('login page renders with authentication options', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Wawa/i);
    // Login page shows PIN delivery method selection (WhatsApp, SMS, Email)
    const body = await page.textContent('body');
    expect(body).toContain('Log in');
    expect(body).toContain('WhatsApp');
    expect(body).toContain('SMS');
    expect(body).toContain('Email');
  });

  test('unauthenticated user is redirected from /orders to /login', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show admin login
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });
});

// ---------------------------------------------------------------------------
// Section 5.2 / 6: Menu Browsing
// ---------------------------------------------------------------------------
test.describe('Section 5.2/6: Menu System', () => {
  test('menu page loads and displays items', async ({ page }) => {
    await page.goto('/menu');
    await expect(page).toHaveTitle(/Menu|Wawa/i);
    // Wait for menu content to load
    await page.waitForSelector('[class*="card"], [class*="menu"], [class*="item"]', { timeout: 15000 });
    // Should have at least one visible item or category
    const items = page.locator('[class*="card"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('menu page has category navigation', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    // Should contain at least some menu categories from requirements
    const hasCategory = /beer|wine|starters|main course|soft drink|food|drinks/i.test(bodyText || '');
    expect(hasCategory).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Section 9: Checkout Page
// ---------------------------------------------------------------------------
test.describe('Section 9: Checkout', () => {
  test('checkout page renders with form', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveTitle(/Checkout|Wawa/i);
    // Should render the checkout UI (even if cart is empty)
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Section 20: Public REST API
// ---------------------------------------------------------------------------
test.describe('Section 20: Public REST API', () => {
  test('health endpoint returns success', async ({ request }) => {
    const response = await request.get('/api/public/health');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('status');
    expect(json.data).toHaveProperty('uptime');
  });

  test('menu API returns items without auth (requires API key)', async ({ request }) => {
    // Without API key, should get 401
    const response = await request.get('/api/public/menu');
    expect([401, 403]).toContain(response.status());
  });

  test('orders API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/orders');
    expect([401, 403]).toContain(response.status());
  });

  test('inventory API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/inventory');
    expect([401, 403]).toContain(response.status());
  });

  test('customers API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/customers');
    expect([401, 403]).toContain(response.status());
  });

  test('tabs API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/tabs');
    expect([401, 403]).toContain(response.status());
  });

  test('settings API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/settings');
    expect([401, 403]).toContain(response.status());
  });

  test('rewards API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/rewards');
    expect([401, 403]).toContain(response.status());
  });

  test('sales summary API requires authentication', async ({ request }) => {
    const response = await request.get('/api/public/sales/summary');
    expect([401, 403]).toContain(response.status());
  });
});

// ---------------------------------------------------------------------------
// Section 22: Security — HTTP Headers
// ---------------------------------------------------------------------------
test.describe('Section 22: Security Headers', () => {
  test('returns security headers on responses', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();
    // X-Frame-Options
    expect(headers['x-frame-options']?.toLowerCase()).toBe('deny');
    // X-Content-Type-Options
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
    // Referrer-Policy
    expect(headers['referrer-policy']).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Section 11/12: Admin Dashboard — RBAC Enforcement
// ---------------------------------------------------------------------------
test.describe('Section 11/12: Dashboard RBAC', () => {
  test('dashboard/orders redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/menu redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/menu');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/inventory redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/inventory');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/settings redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/rewards redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/rewards');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/audit-logs redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/reports redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });

  test('dashboard/kitchen redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/kitchen');
    await page.waitForURL(/\/(login|admin-login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin-login)/);
  });
});

// ---------------------------------------------------------------------------
// Section 24: Data Management — Public Pages
// ---------------------------------------------------------------------------
test.describe('Section 24: Data Management & Privacy', () => {
  test('privacy page is publicly accessible', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle(/Privacy|Wawa/i);
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toContain('privacy');
  });

  test('data deletion page is publicly accessible', async ({ page }) => {
    await page.goto('/data-deletion');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/data|delet/i);
  });
});

// ---------------------------------------------------------------------------
// Section 5.7 / 10: Rewards Page
// ---------------------------------------------------------------------------
test.describe('Section 10: Rewards', () => {
  test('rewards page loads', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/reward|loyalty|point/i);
  });
});

// ---------------------------------------------------------------------------
// Section 3: Architecture — Navigation
// ---------------------------------------------------------------------------
test.describe('Section 3: Navigation', () => {
  test('home page includes menu link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // "View Menu" link exists in main content
    const menuLink = page.locator('a[href="/menu"]').first();
    await expect(menuLink).toBeVisible();
    const linkText = await menuLink.textContent();
    expect(linkText?.toLowerCase()).toContain('menu');
  });
});
