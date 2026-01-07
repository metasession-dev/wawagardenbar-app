# Playwright Implementation Plan - Wawa Garden Bar

## Overview

This document provides a detailed, phased implementation plan for Playwright E2E testing. The plan is structured to deliver value incrementally while building a comprehensive test suite.

---

## Phase 1: Setup & Infrastructure (Week 1)

### 1.1 Install Dependencies

```bash
npm install -D @playwright/test
npm install -D dotenv
npx playwright install
```

### 1.2 Create Playwright Configuration

**File: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 1.3 Environment Configuration

**File: `.env.test`**

```bash
# Test Environment Variables
NODE_ENV=test
TEST_BASE_URL=http://localhost:3000

# Test Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=wawa_garden_bar_test

# Test Monnify Credentials (Sandbox)
MONNIFY_API_KEY=test_api_key
MONNIFY_SECRET_KEY=test_secret_key
MONNIFY_CONTRACT_CODE=test_contract_code
MONNIFY_BASE_URL=https://sandbox.monnify.com

# Test Email (Mock)
EMAIL_FROM=test@wawagardenbar.com
SMTP_HOST=localhost
SMTP_PORT=1025

# Session Secret
SESSION_SECRET=test_session_secret_key_for_testing_only

# Feature Flags
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=true
```

### 1.4 Test Database Setup Script

**File: `tests/setup/db-setup.ts`**

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export async function setupTestDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri || !dbName) {
    throw new Error('Test database configuration missing');
  }

  await mongoose.connect(mongoUri, { dbName });
  console.log(`Connected to test database: ${dbName}`);
}

export async function cleanupTestDatabase() {
  const collections = await mongoose.connection.db.collections();
  
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  
  console.log('Test database cleaned');
}

export async function closeTestDatabase() {
  await mongoose.connection.close();
  console.log('Test database connection closed');
}
```

### 1.5 Test Data Seeders

**File: `tests/setup/seed-test-data.ts`**

```typescript
import UserModel from '@/models/user-model';
import MenuItemModel from '@/models/menu-item-model';
import CategoryModel from '@/models/category-model';
import { setupTestDatabase, cleanupTestDatabase } from './db-setup';

export async function seedTestUsers() {
  const users = [
    {
      email: 'customer@test.com',
      name: 'Test Customer',
      role: 'customer',
      emailVerified: true,
      phone: '+234 800 000 0001',
    },
    {
      email: 'admin@test.com',
      name: 'Test Admin',
      role: 'admin',
      emailVerified: true,
      phone: '+234 800 000 0002',
    },
    {
      email: 'superadmin@test.com',
      name: 'Test Super Admin',
      role: 'super-admin',
      emailVerified: true,
      phone: '+234 800 000 0003',
    },
  ];

  await UserModel.insertMany(users);
  console.log(`Seeded ${users.length} test users`);
}

export async function seedTestMenuItems() {
  // Create categories
  const foodCategory = await CategoryModel.create({
    name: 'Food',
    slug: 'food',
    description: 'Delicious food items',
    displayOrder: 1,
  });

  const drinkCategory = await CategoryModel.create({
    name: 'Drinks',
    slug: 'drinks',
    description: 'Refreshing beverages',
    displayOrder: 2,
  });

  // Create menu items
  const menuItems = [
    {
      name: 'Jollof Rice',
      slug: 'jollof-rice',
      description: 'Traditional Nigerian jollof rice',
      category: foodCategory._id,
      subcategory: 'Main Course',
      price: 2500,
      available: true,
      preparationTime: 20,
      images: ['/uploads/menu/jollof-rice.jpg'],
    },
    {
      name: 'Chicken Wings',
      slug: 'chicken-wings',
      description: 'Crispy chicken wings',
      category: foodCategory._id,
      subcategory: 'Starters',
      price: 1500,
      available: true,
      preparationTime: 15,
      images: ['/uploads/menu/chicken-wings.jpg'],
    },
    {
      name: 'Star Beer',
      slug: 'star-beer',
      description: 'Local Nigerian beer',
      category: drinkCategory._id,
      subcategory: 'Beer',
      price: 500,
      available: true,
      preparationTime: 2,
      images: ['/uploads/menu/star-beer.jpg'],
    },
    {
      name: 'Chapman',
      slug: 'chapman',
      description: 'Nigerian cocktail',
      category: drinkCategory._id,
      subcategory: 'Soft Drinks',
      price: 800,
      available: true,
      preparationTime: 5,
      images: ['/uploads/menu/chapman.jpg'],
    },
  ];

  await MenuItemModel.insertMany(menuItems);
  console.log(`Seeded ${menuItems.length} test menu items`);
}

export async function seedAllTestData() {
  await setupTestDatabase();
  await cleanupTestDatabase();
  await seedTestUsers();
  await seedTestMenuItems();
  console.log('All test data seeded successfully');
}

// Run if called directly
if (require.main === module) {
  seedAllTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error seeding test data:', error);
      process.exit(1);
    });
}
```

### 1.6 Test Fixtures & Helpers

**File: `tests/fixtures/auth.fixture.ts`**

```typescript
import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  superAdminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login as customer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'customer@test.com');
    await page.click('button:has-text("Request PIN")');
    
    // In test environment, PIN is logged or returned
    // For now, we'll mock the PIN verification
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Verify")');
    
    await page.waitForURL('/');
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    await use(page);
  },

  superAdminPage: async ({ page }, use) => {
    // Login as super-admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'superadmin@test.com');
    await page.fill('input[name="password"]', 'superadmin123');
    await page.click('button:has-text("Login")');
    
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

**File: `tests/helpers/cart.helper.ts`**

```typescript
import { Page } from '@playwright/test';

export class CartHelper {
  constructor(private page: Page) {}

  async addItemToCart(itemName: string) {
    await this.page.click(`[data-testid="menu-item-${itemName}"]`);
    await this.page.click('button:has-text("Add to Cart")');
  }

  async openCart() {
    await this.page.click('[data-testid="cart-button"]');
  }

  async getCartItemCount(): Promise<number> {
    const countText = await this.page.textContent('[data-testid="cart-count"]');
    return parseInt(countText || '0', 10);
  }

  async clearCart() {
    await this.openCart();
    await this.page.click('button:has-text("Clear Cart")');
    await this.page.click('button:has-text("Confirm")');
  }

  async proceedToCheckout() {
    await this.openCart();
    await this.page.click('button:has-text("Checkout")');
  }
}
```

**File: `tests/helpers/order.helper.ts`**

```typescript
import { Page } from '@playwright/test';

export class OrderHelper {
  constructor(private page: Page) {}

  async selectOrderType(type: 'dine-in' | 'pickup' | 'delivery') {
    await this.page.click(`[data-testid="order-type-${type}"]`);
  }

  async enterTableNumber(tableNumber: string) {
    await this.page.fill('input[name="tableNumber"]', tableNumber);
  }

  async enterDeliveryAddress(address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  }) {
    await this.page.fill('input[name="street"]', address.street);
    await this.page.fill('input[name="city"]', address.city);
    await this.page.fill('input[name="state"]', address.state);
    await this.page.fill('input[name="postalCode"]', address.postalCode);
  }

  async completeOrder() {
    await this.page.click('button:has-text("Place Order")');
  }

  async getOrderNumber(): Promise<string> {
    const orderNumber = await this.page.textContent('[data-testid="order-number"]');
    return orderNumber || '';
  }
}
```

### 1.7 Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report",
    "test:seed": "tsx tests/setup/seed-test-data.ts",
    "test:db:clean": "tsx tests/setup/db-cleanup.ts"
  }
}
```

---

## Phase 2: Critical Path Tests (Week 2)

### Priority: Authentication & Order Flow

**File: `tests/e2e/auth/customer-login.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Customer Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('AUTH-001: User can request PIN via email', async ({ page }) => {
    await page.fill('input[name="email"]', 'customer@test.com');
    await page.click('button:has-text("Request PIN")');
    
    await expect(page.locator('text=PIN sent to your email')).toBeVisible();
  });

  test('AUTH-002: User can login with valid PIN', async ({ page }) => {
    await page.fill('input[name="email"]', 'customer@test.com');
    await page.click('button:has-text("Request PIN")');
    
    // Mock PIN entry (in test environment)
    await page.fill('input[name="pin"]', '1234');
    await page.click('button:has-text("Verify")');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('AUTH-003: User cannot login with invalid PIN', async ({ page }) => {
    await page.fill('input[name="email"]', 'customer@test.com');
    await page.click('button:has-text("Request PIN")');
    
    await page.fill('input[name="pin"]', '9999');
    await page.click('button:has-text("Verify")');
    
    await expect(page.locator('text=Invalid PIN')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('AUTH-004: Guest checkout flow', async ({ page }) => {
    await page.goto('/menu');
    await page.click('[data-testid="menu-item-jollof-rice"]');
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-button"]');
    await page.click('button:has-text("Checkout")');
    
    // Guest checkout should allow email entry
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await page.fill('input[name="email"]', 'guest@example.com');
    
    // Complete order as guest
    await page.click('[data-testid="order-type-pickup"]');
    await page.fill('input[name="phone"]', '+234 800 000 9999');
    await page.click('button:has-text("Place Order")');
    
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });
});
```

**File: `tests/e2e/orders/dine-in-order.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth.fixture';
import { CartHelper } from '../helpers/cart.helper';
import { OrderHelper } from '../helpers/order.helper';

test.describe('Dine-In Orders', () => {
  test('ORDER-001: Place dine-in order with table number', async ({ authenticatedPage }) => {
    const cart = new CartHelper(authenticatedPage);
    const order = new OrderHelper(authenticatedPage);

    // Navigate to menu and add items
    await authenticatedPage.goto('/menu');
    await cart.addItemToCart('jollof-rice');
    await cart.addItemToCart('star-beer');

    // Proceed to checkout
    await cart.proceedToCheckout();

    // Select dine-in and enter table number
    await order.selectOrderType('dine-in');
    await order.enterTableNumber('12');

    // Complete order
    await order.completeOrder();

    // Verify order confirmation
    await expect(authenticatedPage.locator('text=Order Confirmed')).toBeVisible();
    const orderNumber = await order.getOrderNumber();
    expect(orderNumber).toMatch(/^ORD-\d+$/);
  });

  test('ORDER-002: Open a tab for dine-in', async ({ authenticatedPage }) => {
    const cart = new CartHelper(authenticatedPage);
    const order = new OrderHelper(authenticatedPage);

    await authenticatedPage.goto('/menu');
    await cart.addItemToCart('jollof-rice');
    await cart.proceedToCheckout();

    await order.selectOrderType('dine-in');
    await authenticatedPage.click('input[name="openTab"]');
    await order.enterTableNumber('5');
    await order.completeOrder();

    // Verify tab created
    await expect(authenticatedPage.locator('text=Tab Opened')).toBeVisible();
    
    // Add more items to tab
    await authenticatedPage.goto('/menu');
    await cart.addItemToCart('chicken-wings');
    await cart.proceedToCheckout();
    
    // Verify existing tab is shown
    await expect(authenticatedPage.locator('text=Add to existing tab')).toBeVisible();
  });
});
```

**File: `tests/e2e/orders/payment.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth.fixture';
import { CartHelper } from '../helpers/cart.helper';
import { OrderHelper } from '../helpers/order.helper';

test.describe('Payment Integration', () => {
  test('PAY-001: Initiate payment with card', async ({ authenticatedPage }) => {
    const cart = new CartHelper(authenticatedPage);
    const order = new OrderHelper(authenticatedPage);

    // Create order
    await authenticatedPage.goto('/menu');
    await cart.addItemToCart('jollof-rice');
    await cart.proceedToCheckout();
    await order.selectOrderType('pickup');
    await authenticatedPage.fill('input[name="phone"]', '+234 800 000 0001');
    await order.completeOrder();

    // Initiate payment
    await authenticatedPage.click('button:has-text("Pay with Card")');

    // Verify Monnify modal opens (or payment page)
    await expect(authenticatedPage.locator('[data-testid="payment-modal"]')).toBeVisible();
  });

  test('PAY-003: Failed payment handling', async ({ authenticatedPage }) => {
    const cart = new CartHelper(authenticatedPage);
    const order = new OrderHelper(authenticatedPage);

    await authenticatedPage.goto('/menu');
    await cart.addItemToCart('star-beer');
    await cart.proceedToCheckout();
    await order.selectOrderType('pickup');
    await authenticatedPage.fill('input[name="phone"]', '+234 800 000 0001');
    await order.completeOrder();

    // Simulate payment failure
    await authenticatedPage.click('button:has-text("Pay with Card")');
    // Mock payment failure response
    await authenticatedPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('payment-failed'));
    });

    await expect(authenticatedPage.locator('text=Payment Failed')).toBeVisible();
    await expect(authenticatedPage.locator('button:has-text("Retry Payment")')).toBeVisible();
  });
});
```

---

## Phase 3: Order Management & Tab Workflows (Week 3)

Scope: Kitchen order queue, tab lifecycle, and admin order controls. This replaces menu/inventory specs with richer operational coverage.

### Helpers & Fixtures
- **KitchenQueueHelper** (`tests/helpers/kitchen-queue.helper.ts`)
  - `setStatusFilters(statuses: string[])`
  - `searchOrders(query: string)`
  - `clearSearch()`
  - `toggleBulkSelect(rowTestId: string)`
  - Quick actions: `startPreparing(orderNumber)`, `markReady(orderNumber)`, `completeOrder(orderNumber)`, `cancelOrder(orderNumber)`
  - Assertions: `expectStatsSnapshot`, `expectOrderInColumn`
- **TabHelper** (`tests/helpers/tab.helper.ts`)
  - `openTab(tableNumber)`, `addOrderToTab(tabNumber, items)`, `settleTab(tabId)`
- **Fixtures**
  - `adminKitchenPage` → logs in + lands on `/dashboard/orders`
  - `superAdminTabsPage` → logs in + lands on `/dashboard/orders/tabs`
  - Reuse `customerPage` for verifying tab settlement flows end-to-end

### Data Requirements
- Extend test seed script with:
  - At least 2 orders per status (pending, confirmed, preparing, ready)
  - Known order numbers (e.g., `ORD-PENDING-001`) referenced by specs
  - Tabs: open, settling, closed states with consistent IDs
  - Bulk-ready orders for multi-select tests

### Planned Specs

**File: `tests/e2e/admin/kitchen-queue.spec.ts`**

| ID | Scenario | Assertions |
|----|----------|------------|
| `KITCHEN-001` | Filter queue by status | Stats cards + visible rows shrink/grow accordingly |
| `KITCHEN-002` | Search by order number/customer name | Only matching row remains, no-results state handled |
| `KITCHEN-003` | Progress order status via quick actions | Pending → Preparing → Ready with toasts + column change |
| `KITCHEN-004` | Bulk update (Mark Preparing) | Select multiple pending orders, confirm bulk modal, rows move |
| `KITCHEN-005` | Cancel order with reason | Dialog validation + status badge shows Cancelled |

**File: `tests/e2e/admin/tab-management.spec.ts`** (next wave)

| ID | Scenario | Assertions |
|----|----------|------------|
| `TABS-001` | View open tabs + filter by status | Tab cards + totals reflect filter |
| `TABS-002` | Admin adds dine-in order to existing tab | Checkout form auto-locks to existing tab |
| `TABS-003` | Tab settlement flow reaches payment mock | Uses tab checkout page + `/payments/mock` redirect |
| `TABS-004` | Close tab after payment | Status badge moves to Closed, tab disappears from Open list |

### Execution Plan
1. **Helpers + Seed Enhancements** – build KitchenQueueHelper & update seed script.
2. **Spec Implementation (Kitchen)** – start with `KITCHEN-001`→`KITCHEN-003`, then bulk/cancel.
3. **Tab Helper + Specs** – once kitchen flow stable.
4. **Docs & CI** – update Quick Start & README to mention admin spec commands, ensure CI job runs new suites.

### Commands
- `npx playwright test tests/e2e/admin/kitchen-queue.spec.ts`
- `npm run test:e2e -- --grep "KITCHEN"`
- Future: `npm run test:e2e -- --grep "TABS"`

---

---

## Phase 4: Real-Time Features & Advanced Tests (Week 4)

**File: `tests/e2e/realtime/socket-updates.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Real-Time Updates', () => {
  test('SOCKET-001: Real-time order status updates', async ({ browser }) => {
    // Create two contexts: customer and admin
    const customerContext = await browser.newContext();
    const adminContext = await browser.newContext();
    
    const customerPage = await customerContext.newPage();
    const adminPage = await adminContext.newPage();
    
    // Customer logs in and places order
    await customerPage.goto('/login');
    await customerPage.fill('input[name="email"]', 'customer@test.com');
    await customerPage.click('button:has-text("Request PIN")');
    await customerPage.fill('input[name="pin"]', '1234');
    await customerPage.click('button:has-text("Verify")');
    
    // Place order
    await customerPage.goto('/menu');
    await customerPage.click('[data-testid="menu-item-jollof-rice"]');
    await customerPage.click('button:has-text("Add to Cart")');
    await customerPage.click('[data-testid="cart-button"]');
    await customerPage.click('button:has-text("Checkout")');
    await customerPage.click('[data-testid="order-type-pickup"]');
    await customerPage.click('button:has-text("Place Order")');
    
    const orderNumber = await customerPage.textContent('[data-testid="order-number"]');
    
    // Admin logs in
    await adminPage.goto('/admin/login');
    await adminPage.fill('input[name="email"]', 'admin@test.com');
    await adminPage.fill('input[name="password"]', 'admin123');
    await adminPage.click('button:has-text("Login")');
    
    // Admin updates order status
    await adminPage.goto('/dashboard/orders');
    await adminPage.click(`[data-testid="order-${orderNumber}"]`);
    await adminPage.click('button:has-text("Start Preparing")');
    
    // Verify customer sees update in real-time
    await customerPage.goto(`/orders/${orderNumber}`);
    await expect(customerPage.locator('text=Preparing')).toBeVisible({ timeout: 5000 });
    
    await customerContext.close();
    await adminContext.close();
  });
});
```

**File: `tests/e2e/reports/financial-reports.spec.ts`**

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Financial Reports', () => {
  test('ADMIN-017: Generate daily financial report', async ({ superAdminPage }) => {
    await superAdminPage.goto('/dashboard/reports/daily');
    
    // Select today's date
    await superAdminPage.click('button:has-text("Today")');
    await superAdminPage.click('button:has-text("Generate Report")');
    
    // Verify report sections displayed
    await expect(superAdminPage.locator('text=Total Revenue')).toBeVisible();
    await expect(superAdminPage.locator('text=Gross Profit')).toBeVisible();
    await expect(superAdminPage.locator('text=Net Profit')).toBeVisible();
  });

  test('ADMIN-018: Export report as PDF', async ({ superAdminPage }) => {
    await superAdminPage.goto('/dashboard/reports/daily');
    await superAdminPage.click('button:has-text("Today")');
    await superAdminPage.click('button:has-text("Generate Report")');
    
    // Set up download listener
    const downloadPromise = superAdminPage.waitForEvent('download');
    await superAdminPage.click('button:has-text("Export as PDF")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/daily-report-\d{4}-\d{2}-\d{2}\.pdf/);
  });

  test('ADMIN-019: Export report as Excel', async ({ superAdminPage }) => {
    await superAdminPage.goto('/dashboard/reports/daily');
    await superAdminPage.click('button:has-text("Today")');
    await superAdminPage.click('button:has-text("Generate Report")');
    
    const downloadPromise = superAdminPage.waitForEvent('download');
    await superAdminPage.click('button:has-text("Export as Excel")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/daily-report-\d{4}-\d{2}-\d{2}\.xlsx/);
  });
});
```

---

## Phase 5: Mobile & Accessibility Tests (Week 5)

**File: `tests/e2e/mobile/responsive.spec.ts`**

```typescript
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 12'] });

  test('MOBILE-001: Menu browsing on mobile', async ({ page }) => {
    await page.goto('/menu');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="menu-item-jollof-rice"]');
    await expect(page.locator('[data-testid="item-details-modal"]')).toBeVisible();
  });

  test('MOBILE-002: Checkout flow on mobile', async ({ page }) => {
    await page.goto('/menu');
    await page.tap('[data-testid="menu-item-star-beer"]');
    await page.tap('button:has-text("Add to Cart")');
    await page.tap('[data-testid="cart-button"]');
    await page.tap('button:has-text("Checkout")');
    
    // Verify form is accessible on mobile
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });
});
```

**File: `tests/e2e/accessibility/keyboard-navigation.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('A11Y-001: Navigate menu with keyboard', async ({ page }) => {
    await page.goto('/menu');
    
    // Tab through menu items
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus indicator visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Press Enter to select
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="item-details-modal"]')).toBeVisible();
  });

  test('A11Y-002: Screen reader compatibility', async ({ page }) => {
    await page.goto('/menu');
    
    // Check for ARIA labels
    const menuItems = await page.locator('[role="button"]').all();
    for (const item of menuItems) {
      const ariaLabel = await item.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});
```

---

## Phase 6: CI/CD Integration (Week 6)

### GitHub Actions Workflow

**File: `.github/workflows/playwright.yml`**

```yaml
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Seed test database
        run: npm run test:seed
        env:
          MONGODB_URI: mongodb://localhost:27017
          MONGODB_DB_NAME: wawa_garden_bar_test
      
      - name: Run Playwright tests
        run: npm run test:e2e
        env:
          TEST_BASE_URL: http://localhost:3000
          MONGODB_URI: mongodb://localhost:27017
          MONGODB_DB_NAME: wawa_garden_bar_test
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
          retention-days: 30
```

---

## Test Maintenance Guidelines

### 1. Test Data Management
- Always clean up test data after each test
- Use unique identifiers for test data
- Avoid hardcoded IDs

### 2. Flaky Test Prevention
- Use explicit waits instead of timeouts
- Avoid race conditions
- Ensure proper test isolation

### 3. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow naming convention: `CATEGORY-XXX: Description`

### 4. Performance Optimization
- Run tests in parallel where possible
- Use fixtures to share setup logic
- Cache authentication states

---

## Success Metrics

### Coverage Targets
- **Critical Paths**: 100% by end of Phase 2
- **Admin Features**: 90% by end of Phase 3
- **Real-Time Features**: 85% by end of Phase 4
- **Mobile/A11y**: 75% by end of Phase 5

### Quality Metrics
- Test execution time: < 10 minutes for full suite
- Flaky test rate: < 2%
- Test maintenance time: < 10% of development time

---

## Timeline Summary

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| 1 | Week 1 | Setup & Infrastructure | Config, fixtures, helpers, seeders |
| 2 | Week 2 | Critical Paths | Auth, orders, payment tests |
| 3 | Week 3 | Admin Dashboard | Menu, orders, inventory tests |
| 4 | Week 4 | Advanced Features | Real-time, reports, rewards tests |
| 5 | Week 5 | Mobile & A11y | Responsive, keyboard, screen reader tests |
| 6 | Week 6 | CI/CD | GitHub Actions, reporting, monitoring |

**Total Duration**: 6 weeks

---

## Next Steps

1. Review and approve this implementation plan
2. Set up test environment and database
3. Install Playwright and dependencies
4. Begin Phase 1 implementation
5. Schedule weekly test review meetings
