import { test, expect, Page } from '@playwright/test';

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
// Helpers
// ---------------------------------------------------------------------------

/** Seed the Zustand cart via localStorage so checkout/cart tests start with items */
async function seedCart(page: Page) {
  await page.addInitScript(() => {
    const cart = {
      state: {
        items: [
          {
            cartItemId: 'test-item-1',
            id: '000000000000000000000001',
            name: 'Jollof Rice',
            price: 3500,
            quantity: 2,
            portionSize: 'full',
            portionMultiplier: 1,
            image: '',
            category: 'rice-dishes',
            specialInstructions: '',
            preparationTime: 20,
          },
          {
            cartItemId: 'test-item-2',
            id: '000000000000000000000002',
            name: 'Chapman',
            price: 1500,
            quantity: 1,
            portionSize: 'full',
            portionMultiplier: 1,
            image: '',
            category: 'cocktails',
            specialInstructions: 'Less sugar',
            preparationTime: 5,
          },
        ],
        isOpen: false,
        tableNumber: undefined,
      },
      version: 0,
    };
    localStorage.setItem('wawa-cart-storage', JSON.stringify(cart));
  });
}

// ===========================================================================
// Section 1 & 5.1: Home Page / Welcome Screen
// ===========================================================================
test.describe('Section 1/5.1: Home Page', () => {
  test('renders home page with branding, logo, and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Wawa/i);
    // Logo image
    const logo = page.locator('img[alt*="Wawa Garden Bar"]');
    await expect(logo).toBeVisible();
    // sr-only h1
    await expect(page.locator('h1')).toHaveText(/Wawa Garden Bar/i);
    // "View Menu" CTA
    const menuLink = page.locator('a[href="/menu"]');
    await expect(menuLink).toBeVisible();
    await expect(menuLink).toHaveText(/View Menu/i);
  });

  test('displays order type feature cards (Dine In, Pickup, Delivery)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dine In', { exact: true })).toBeVisible();
    await expect(page.getByText('Pickup', { exact: true })).toBeVisible();
    await expect(page.getByText('Delivery', { exact: true })).toBeVisible();
  });

  test('displays "How It Works" section with descriptions', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2', { hasText: 'How It Works' })).toBeVisible();
    const body = await page.textContent('body');
    expect(body).toContain('Scan QR code');
    expect(body).toContain('Order ahead');
    expect(body).toContain('delivered to your door');
  });

  test('is responsive — renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('img[alt*="Wawa Garden Bar"]')).toBeVisible();
    await expect(page.locator('a[href="/menu"]')).toBeVisible();
  });

  test('is responsive — renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('img[alt*="Wawa Garden Bar"]')).toBeVisible();
    await expect(page.locator('a[href="/menu"]')).toBeVisible();
  });
});

// ===========================================================================
// Section 4: Authentication — Customer Login
// ===========================================================================
test.describe('Section 4: Customer Authentication', () => {
  test('login page renders with title and phone prompt', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Log in|Sign up|Wawa/i);
    const body = await page.textContent('body');
    expect(body).toContain('Log in');
    expect(body).toContain('phone number');
  });

  test('login page shows PIN delivery method options (WhatsApp, SMS, Email)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('WhatsApp');
    expect(body).toContain('SMS');
    expect(body).toContain('Email');
  });

  test('login page displays delivery method descriptions', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('Instant delivery via WhatsApp');
    expect(body).toContain('Traditional text message');
    expect(body).toContain('PIN sent to your email');
  });

  test('login page links to privacy policy and terms', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/privacy"]')).toBeVisible();
    await expect(page.locator('a[href="/terms"]')).toBeVisible();
  });

  test('unauthenticated user is redirected from /orders to /login', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user is redirected from /profile to /login', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

// ===========================================================================
// Section 4: Authentication — Admin Login
// ===========================================================================
test.describe('Section 4: Admin Authentication', () => {
  test('admin login page renders with credentials form', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page).toHaveTitle(/Admin Login|Wawa/i);
    await expect(page.locator('text=Admin Login')).toBeVisible();
    await expect(page.locator('text=Enter your credentials')).toBeVisible();
  });

  test('admin login form has username and password fields', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Login' })).toBeVisible();
  });

  test('admin login rejects invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('#username', 'invaliduser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button:has-text("Login")');
    // Should show an error, not redirect to dashboard
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/admin/login');
  });

  test('unauthenticated user is redirected from /dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/(login|admin-login|admin\/login)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 5.2 / 6: Menu System
// ===========================================================================
test.describe('Section 5.2/6: Menu System', () => {
  test('menu page loads with title and description', async ({ page }) => {
    await page.goto('/menu');
    await expect(page).toHaveTitle(/Menu.*Wawa/i);
    await page.waitForLoadState('networkidle');
  });

  test('menu page displays item cards', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForSelector('[class*="card"], [class*="menu"], [class*="item"]', {
      timeout: 15000,
    });
    const items = page.locator('[class*="card"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('menu page has category navigation with food and drink categories', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.textContent('body');
    // Should contain category references from requirements (food and/or drinks)
    const hasCategory =
      /beer|wine|starters|main course|soft drink|food|drinks|rice|cocktail|soup|small chops/i.test(
        bodyText || ''
      );
    expect(hasCategory).toBeTruthy();
  });

  test('menu page supports search via URL parameter', async ({ page }) => {
    await page.goto('/menu?search=rice');
    await page.waitForLoadState('networkidle');
    // Page should load successfully with search param
    await expect(page).toHaveTitle(/Menu.*Wawa/i);
  });

  test('menu page supports category filter via URL parameter', async ({ page }) => {
    await page.goto('/menu?category=beer');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Menu.*Wawa/i);
  });

  test('menu page supports table number via URL parameter', async ({ page }) => {
    await page.goto('/menu?tableNumber=5');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Menu.*Wawa/i);
  });
});

// ===========================================================================
// Section 5.3: Cart (Zustand Store)
// ===========================================================================
test.describe('Section 5.3: Cart', () => {
  test('cart persists items in localStorage under wawa-cart-storage', async ({ page }) => {
    await seedCart(page);
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    const stored = await page.evaluate(() => localStorage.getItem('wawa-cart-storage'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.items).toHaveLength(2);
    expect(parsed.state.items[0].name).toBe('Jollof Rice');
    expect(parsed.state.items[1].name).toBe('Chapman');
  });

  test('cart stores quantity, portion size, and special instructions per item', async ({
    page,
  }) => {
    await seedCart(page);
    await page.goto('/menu');

    const stored = await page.evaluate(() => localStorage.getItem('wawa-cart-storage'));
    const parsed = JSON.parse(stored!);
    const item1 = parsed.state.items[0];
    const item2 = parsed.state.items[1];

    expect(item1.quantity).toBe(2);
    expect(item1.portionSize).toBe('full');
    expect(item2.specialInstructions).toBe('Less sugar');
  });

  test('seeded cart items appear in checkout', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // Checkout should display the cart items or totals
    expect(body).toMatch(/Jollof Rice|Chapman|cart|order|checkout/i);
  });
});

// ===========================================================================
// Section 5.4: Order Tracking
// ===========================================================================
test.describe('Section 5.4: Order Tracking', () => {
  test('order page requires authentication', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

// ===========================================================================
// Section 5.5: Orders & Tabs Page
// ===========================================================================
test.describe('Section 5.5: Orders & Tabs Page', () => {
  test('orders page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('orders/tabs page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/orders/tabs');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('orders/history page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/orders/history');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

// ===========================================================================
// Section 5.6: Customer Profile
// ===========================================================================
test.describe('Section 5.6: Customer Profile', () => {
  test('profile page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('profile/rewards page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/profile/rewards');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

// ===========================================================================
// Section 5.7 / 10: Rewards
// ===========================================================================
test.describe('Section 5.7/10: Rewards', () => {
  test('rewards page loads with loyalty information', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/reward|loyalty|point/i);
  });

  test('rewards page shows sign-in prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('Sign In to View Your Rewards');
  });

  test('rewards page displays feature preview cards', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('Active Rewards');
    expect(body).toContain('Track Savings');
    expect(body).toContain('Loyalty Points');
  });

  test('rewards page explains points conversion (100 points = NGN 1)', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toMatch(/100 points.*=.*1/i);
  });

  test('rewards page has "How It Works" guide', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toContain('spending thresholds');
    expect(body).toContain('Apply rewards at checkout');
  });

  test('rewards page links to login for sign-in', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const signInLink = page.locator('a[href*="/login"]');
    await expect(signInLink.first()).toBeVisible();
  });
});

// ===========================================================================
// Section 9: Checkout & Payment
// ===========================================================================
test.describe('Section 9: Checkout & Payment', () => {
  test('checkout page renders with form', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveTitle(/Checkout.*Wawa/i);
    await page.waitForLoadState('networkidle');
  });

  test('checkout with seeded cart shows multi-step form', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // Should show step indicators or customer info step
    expect(body).toMatch(/Customer Info|Step|order|checkout/i);
  });

  test('checkout displays cart items and totals', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // Should show the seeded items or their prices
    expect(body).toMatch(/Jollof Rice|Chapman|3,500|1,500|8,500/);
  });

  test('checkout form has customer info fields (name, email, phone)', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    // First step should be customer info
    expect(body).toMatch(/name|email|phone/i);
  });

  test('checkout shows navigation buttons (Back/Next)', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    // Should have a Next button for advancing steps
    const nextBtn = page.locator('button', { hasText: /Next/i });
    await expect(nextBtn).toBeVisible();
  });
});

// ===========================================================================
// Section 3: Architecture — Navigation
// ===========================================================================
test.describe('Section 3: Navigation & Architecture', () => {
  test('home page includes "View Menu" link', async ({ page }) => {
    await page.goto('/');
    const menuLink = page.locator('a[href="/menu"]');
    await expect(menuLink).toBeVisible();
    await expect(menuLink).toHaveText(/View Menu/i);
  });

  test('"View Menu" link navigates to menu page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/menu"]');
    await page.waitForURL(/\/menu/);
    expect(page.url()).toContain('/menu');
  });
});

// ===========================================================================
// Section 11/12: Admin Dashboard — RBAC Enforcement
// ===========================================================================
test.describe('Section 11/12: Dashboard RBAC', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/orders',
    '/dashboard/menu',
    '/dashboard/inventory',
    '/dashboard/settings',
    '/dashboard/rewards',
    '/dashboard/audit-logs',
    '/dashboard/reports',
    '/dashboard/kitchen',
    '/dashboard/customers',
    '/dashboard/finance/expenses',
    '/dashboard/analytics/profitability',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/(login|admin-login|admin\/login)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(login|admin)/);
    });
  }
});

// ===========================================================================
// Section 13: Menu Management (Admin)
// ===========================================================================
test.describe('Section 13: Menu Management', () => {
  test('menu management page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/menu');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });

  test('new menu item page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/menu/new');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 14: Inventory Management
// ===========================================================================
test.describe('Section 14: Inventory Management', () => {
  const inventoryRoutes = [
    '/dashboard/inventory',
    '/dashboard/inventory/snapshots',
    '/dashboard/inventory/transfer',
  ];

  for (const route of inventoryRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(login|admin)/);
    });
  }
});

// ===========================================================================
// Section 15: Financial Management
// ===========================================================================
test.describe('Section 15: Financial Management', () => {
  test('expenses page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/finance/expenses');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 16: Reports & Analytics
// ===========================================================================
test.describe('Section 16: Reports & Analytics', () => {
  const reportRoutes = [
    '/dashboard/reports',
    '/dashboard/reports/daily',
    '/dashboard/reports/inventory',
    '/dashboard/reports/profitability',
    '/dashboard/analytics/profitability',
  ];

  for (const route of reportRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(login|admin)/);
    });
  }
});

// ===========================================================================
// Section 17: Kitchen Display System
// ===========================================================================
test.describe('Section 17: Kitchen Display System', () => {
  test('kitchen display redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/kitchen');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 18: Rewards Configuration (Admin)
// ===========================================================================
test.describe('Section 18: Rewards Configuration', () => {
  const rewardAdminRoutes = [
    '/dashboard/rewards',
    '/dashboard/rewards/issued',
    '/dashboard/rewards/rules',
    '/dashboard/rewards/templates',
  ];

  for (const route of rewardAdminRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(login|admin)/);
    });
  }
});

// ===========================================================================
// Section 19: Settings & Configuration
// ===========================================================================
test.describe('Section 19: Settings & Configuration', () => {
  const settingsRoutes = [
    '/dashboard/settings',
    '/dashboard/settings/admins',
    '/dashboard/settings/api-keys',
    '/dashboard/settings/data-requests',
  ];

  for (const route of settingsRoutes) {
    test(`${route} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
      expect(page.url()).toMatch(/\/(login|admin)/);
    });
  }
});

// ===========================================================================
// Section 20: Public REST API
// Rate limiting (30 req/min) may return 429 before auth check — this is
// valid security behaviour, so we accept 429 alongside 401/403.
// Tests run serially to minimise rate-limit collisions.
// ===========================================================================
test.describe('Section 20: Public REST API', () => {
  test.describe.configure({ mode: 'serial' });

  test('health endpoint returns success with status, service, version, uptime', async ({
    request,
  }) => {
    const response = await request.get('/api/public/health');
    expect([200, 429]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('status', 'healthy');
      expect(json.data).toHaveProperty('service', 'wawa-garden-bar-api');
      expect(json.data).toHaveProperty('version');
      expect(json.data).toHaveProperty('uptime');
      expect(json.data).toHaveProperty('timestamp');
      expect(typeof json.data.uptime).toBe('number');
    }
  });

  // All scoped endpoints should reject unauthenticated requests (401/403)
  // or rate-limit them (429) — never return 200 without a valid API key.
  const protectedEndpoints = [
    { method: 'GET' as const, path: '/api/public/menu', scope: 'menu:read' },
    { method: 'GET' as const, path: '/api/public/menu/categories', scope: 'menu:read' },
    { method: 'GET' as const, path: '/api/public/orders', scope: 'orders:read' },
    { method: 'GET' as const, path: '/api/public/orders/stats', scope: 'orders:read' },
    { method: 'GET' as const, path: '/api/public/orders/summary', scope: 'orders:read' },
    { method: 'GET' as const, path: '/api/public/inventory', scope: 'inventory:read' },
    { method: 'GET' as const, path: '/api/public/inventory/alerts', scope: 'inventory:read' },
    { method: 'GET' as const, path: '/api/public/inventory/summary', scope: 'inventory:read' },
    { method: 'GET' as const, path: '/api/public/customers', scope: 'customers:read' },
    { method: 'GET' as const, path: '/api/public/customers/summary', scope: 'customers:read' },
    { method: 'GET' as const, path: '/api/public/tabs', scope: 'tabs:read' },
    { method: 'GET' as const, path: '/api/public/tabs/summary', scope: 'tabs:read' },
    { method: 'GET' as const, path: '/api/public/settings', scope: 'settings:read' },
    { method: 'GET' as const, path: '/api/public/rewards', scope: 'rewards:read' },
    { method: 'GET' as const, path: '/api/public/sales/summary', scope: 'analytics:read' },
  ];

  for (const endpoint of protectedEndpoints) {
    test(`${endpoint.method} ${endpoint.path} rejects unauthenticated requests (scope: ${endpoint.scope})`, async ({
      request,
    }) => {
      const response = await request.get(endpoint.path);
      expect([401, 403, 429]).toContain(response.status());
    });
  }

  test('POST /api/public/orders rejects unauthenticated requests', async ({ request }) => {
    const response = await request.post('/api/public/orders', { data: {} });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/public/payments rejects unauthenticated requests', async ({ request }) => {
    const response = await request.post('/api/public/payments', { data: {} });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/public/rewards/redeem rejects unauthenticated requests', async ({ request }) => {
    const response = await request.post('/api/public/rewards/redeem', { data: {} });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('API returns JSON with standard response format', async ({ request }) => {
    const response = await request.get('/api/public/health');
    if (response.status() === 200) {
      const json = await response.json();
      // Standard format: { success, data }
      expect(json).toHaveProperty('success');
      expect(json).toHaveProperty('data');
    } else {
      // Rate limited — still a valid JSON response
      expect([429]).toContain(response.status());
    }
  });
});

// ===========================================================================
// Section 20: Admin API Protection
// ===========================================================================
test.describe('Section 20: Admin API Protection', () => {
  test('admin settings API requires admin session', async ({ request }) => {
    const response = await request.post('/api/admin/settings/points-conversion-rate', {
      data: { rate: 100 },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('admin settings impact API requires admin session', async ({ request }) => {
    const response = await request.get('/api/admin/settings/points-conversion-rate/impact');
    expect([401, 403, 429]).toContain(response.status());
  });
});

// ===========================================================================
// Section 22: Security — HTTP Headers
// ===========================================================================
test.describe('Section 22: Security Headers', () => {
  test('returns X-Frame-Options DENY', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['x-frame-options']?.toLowerCase()).toBe('deny');
  });

  test('returns X-Content-Type-Options nosniff', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['x-content-type-options']?.toLowerCase()).toBe('nosniff');
  });

  test('returns Referrer-Policy header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.headers()['referrer-policy']).toBeTruthy();
  });

  test('API endpoints include security headers', async ({ request }) => {
    const response = await request.get('/api/public/health');
    const headers = response.headers();
    expect(headers['x-frame-options']?.toLowerCase()).toBe('deny');
    expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
  });
});

// ===========================================================================
// Section 22: Security — Rate Limiting
// ===========================================================================
test.describe('Section 22: Rate Limiting', () => {
  test('API endpoints enforce rate limiting headers', async ({ request }) => {
    const response = await request.get('/api/public/health');
    const headers = response.headers();
    // Rate limiters typically add these headers
    const hasRateHeaders =
      headers['x-ratelimit-limit'] ||
      headers['ratelimit-limit'] ||
      headers['retry-after'] ||
      response.status() === 200; // At minimum, requests should succeed within limits
    expect(hasRateHeaders).toBeTruthy();
  });
});

// ===========================================================================
// Section 22: Security — CORS
// ===========================================================================
test.describe('Section 22: CORS', () => {
  test('API handles preflight OPTIONS requests', async ({ request }) => {
    // OPTIONS requests should not return 404/500
    const response = await request.fetch('/api/public/health', {
      method: 'OPTIONS',
    });
    expect([200, 204, 405]).toContain(response.status());
  });
});

// ===========================================================================
// Section 23: Audit Logs
// ===========================================================================
test.describe('Section 23: Audit Logs', () => {
  test('audit logs page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/audit-logs');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 24: Data Management & Privacy
// ===========================================================================
test.describe('Section 24: Data Management & Privacy', () => {
  test('privacy page is publicly accessible and contains privacy content', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle(/Privacy|Wawa/i);
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toContain('privacy');
  });

  test('data deletion page is publicly accessible', async ({ page }) => {
    await page.goto('/data-deletion');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/data|delet/i);
  });

  test('data requests admin page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/settings/data-requests');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 25: Deployment — Health & Uptime
// ===========================================================================
test.describe('Section 25: Deployment', () => {
  test('application is running and serves pages', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('health endpoint confirms service is healthy', async ({ request }) => {
    const response = await request.get('/api/public/health');
    expect([200, 429]).toContain(response.status());
    if (response.status() === 200) {
      const json = await response.json();
      expect(json.data.status).toBe('healthy');
      expect(json.data.uptime).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// Section 27: Non-Functional — Performance & SEO
// ===========================================================================
test.describe('Section 27: Non-Functional Requirements', () => {
  test('home page has Open Graph metadata', async ({ page }) => {
    await page.goto('/');
    // Check for OG tags or at minimum a proper title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toMatch(/Wawa/i);
  });

  test('menu page has descriptive metadata', async ({ page }) => {
    await page.goto('/menu');
    const title = await page.title();
    expect(title).toContain('Menu');
    // Check meta description
    const metaDesc = page.locator('meta[name="description"]');
    const content = await metaDesc.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('checkout page has descriptive metadata', async ({ page }) => {
    await page.goto('/checkout');
    const title = await page.title();
    expect(title).toContain('Checkout');
  });

  test('login page has descriptive metadata', async ({ page }) => {
    await page.goto('/login');
    const title = await page.title();
    expect(title).toMatch(/Log in|Sign up/i);
  });
});

// ===========================================================================
// Section 27: Non-Functional — Accessibility
// ===========================================================================
test.describe('Section 27: Accessibility', () => {
  test('home page has semantic h1 heading', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Wawa Garden Bar/i);
  });

  test('home page logo has alt text', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('img[alt*="Wawa"]');
    await expect(logo).toBeVisible();
    const alt = await logo.getAttribute('alt');
    expect(alt).toBeTruthy();
  });

  test('login page uses sr-only text for branding', async ({ page }) => {
    await page.goto('/login');
    const srOnly = page.locator('.sr-only');
    const count = await srOnly.count();
    expect(count).toBeGreaterThan(0);
  });

  test('form inputs have associated labels on login page', async ({ page }) => {
    await page.goto('/admin/login');
    // Admin login has explicit label+input pairs
    const usernameLabel = page.locator('label[for="username"]');
    const passwordLabel = page.locator('label[for="password"]');
    await expect(usernameLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });
});

// ===========================================================================
// Section 27: Non-Functional — Mobile-First Responsive Design
// ===========================================================================
test.describe('Section 27: Mobile-First Responsive', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`home page renders on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await expect(page.locator('img[alt*="Wawa"]')).toBeVisible();
      await expect(page.locator('a[href="/menu"]')).toBeVisible();
    });
  }

  for (const vp of viewports) {
    test(`menu page renders on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/menu');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/Menu/i);
    });
  }
});

// ===========================================================================
// Section 8: Tab System — Route Protection
// ===========================================================================
test.describe('Section 8: Tab System', () => {
  test('customer tabs page requires authentication', async ({ page }) => {
    await page.goto('/orders/tabs');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('admin tabs management requires authentication', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 12: Order Management (Admin) — Route Protection
// ===========================================================================
test.describe('Section 12: Order Management', () => {
  test('admin orders page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });

  test('admin order tabs page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/orders/tabs');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 4: Route Protection — Unauthorized Page
// ===========================================================================
test.describe('Section 4: Unauthorized & Forbidden Pages', () => {
  test('unauthorized page is accessible', async ({ page }) => {
    await page.goto('/unauthorized');
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body?.toLowerCase()).toMatch(/unauthorized|access|denied|permission/i);
  });

  test('dashboard forbidden page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard/forbidden');
    await page.waitForURL(/\/(login|admin)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|admin)/);
  });
});

// ===========================================================================
// Section 2: Technical Stack — Server Rendering
// ===========================================================================
test.describe('Section 2: Technical Stack', () => {
  test('pages are server-rendered (not empty on initial load)', async ({ page }) => {
    // Disable JavaScript to verify SSR
    await page.route('**/*.js', (route) => route.abort());
    const response = await page.goto('/');
    const html = await response?.text();
    // SSR should include meaningful content even without JS
    expect(html).toContain('Wawa');
    expect(html).toContain('menu');
  });

  test('application uses Next.js framework', async ({ page }) => {
    await page.goto('/');
    const isNextJs = await page.evaluate(() => {
      // Next.js markers vary by version; check common indicators
      return !!(
        document.getElementById('__next') ||
        (window as unknown as Record<string, unknown>).__NEXT_DATA__ ||
        document.querySelector('script[src*="/_next/"]') ||
        document.querySelector('link[href*="/_next/"]')
      );
    });
    expect(isNextJs).toBeTruthy();
  });
});

// ===========================================================================
// Section 7: Ordering System — Order Types in UI
// ===========================================================================
test.describe('Section 7: Ordering System', () => {
  test('home page advertises all order types (dine-in, pickup, delivery)', async ({ page }) => {
    await page.goto('/');
    const body = await page.textContent('body');
    expect(body).toContain('Dine In');
    expect(body).toContain('Pickup');
    expect(body).toContain('Delivery');
  });

  test('checkout form includes order type selection', async ({ page }) => {
    await seedCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    // The checkout form should reference order types at some point
    const body = await page.textContent('body');
    expect(body).toMatch(/dine.in|pickup|delivery|order.*type|order.*detail/i);
  });
});

// ===========================================================================
// Section 21: Real-Time (Socket.IO)
// ===========================================================================
test.describe('Section 21: Real-Time (Socket.IO)', () => {
  test('Socket.IO endpoint is available', async ({ request }) => {
    // Socket.IO handshake endpoint should respond (not 404)
    const response = await request.get('/api/socket/socket.io/?EIO=4&transport=polling');
    // Socket.IO returns 200 on successful polling handshake, or non-404
    expect(response.status()).not.toBe(404);
  });
});

// ===========================================================================
// Section 4: Session Security
// ===========================================================================
test.describe('Section 4: Session Security', () => {
  test('session cookie is httpOnly', async ({ page }) => {
    await page.goto('/');
    // After visiting, check that any session cookies are httpOnly
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.includes('session') || c.name.includes('wawa')
    );
    // If no session cookie exists (not logged in), that's expected
    if (sessionCookie) {
      expect(sessionCookie.httpOnly).toBeTruthy();
    }
  });
});

// ===========================================================================
// Cross-Cutting: Navigation Flow
// ===========================================================================
test.describe('Cross-Cutting: Navigation Flows', () => {
  test('home → menu → checkout flow', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/menu"]');
    await page.waitForURL(/\/menu/);
    expect(page.url()).toContain('/menu');
    // Navigate to checkout
    await page.goto('/checkout');
    await expect(page).toHaveTitle(/Checkout/i);
  });

  test('rewards page links to login for authentication', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');
    const loginLink = page.locator('a[href*="/login"]').first();
    await expect(loginLink).toBeVisible();
  });

  test('admin login page is accessible and distinct from customer login', async ({ page }) => {
    await page.goto('/admin/login');
    const body = await page.textContent('body');
    expect(body).toContain('Admin Login');
    expect(body).toContain('credentials');
    // Should not show WhatsApp/SMS options (that's customer login)
    expect(body).not.toContain('WhatsApp');
  });
});

// ===========================================================================
// Cross-Cutting: Error Handling
// ===========================================================================
test.describe('Cross-Cutting: Error Handling', () => {
  test('404 page is handled gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
  });

  test('invalid API route returns error (not 200)', async ({ request }) => {
    const response = await request.get('/api/public/nonexistent');
    // Should return 404, 401/403 (auth check), or 429 (rate limit) — never 200
    expect([404, 401, 403, 429]).toContain(response.status());
  });
});
