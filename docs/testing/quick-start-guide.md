# Playwright Testing Quick Start Guide

## Prerequisites

Before running tests, ensure you have:

1. **Node.js 18+** installed
2. **MongoDB** running locally or accessible remotely
3. **Test environment variables** configured
4. **Test data** seeded in database

---

## Initial Setup

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Create Test Environment File

Create `.env.test` in the root directory:

```bash
# Copy from .env.example and modify for testing
cp .env.example .env.test
```

Update `.env.test`:

```bash
NODE_ENV=test
TEST_BASE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=wawa_garden_bar_test
SESSION_SECRET=test_session_secret
```

### 3. Seed Test Database

```bash
npm run test:seed
```

This will:
- Create test users (customer, admin, super-admin)
- Seed menu items
- Create test categories
- Set up initial test data

---

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

This opens an interactive UI where you can:
- See all tests
- Run individual tests
- Watch tests execute in real-time
- Debug failures

### Run Specific Test File

```bash
npx playwright test tests/e2e/auth/customer-login.spec.ts
```

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug a Specific Test

```bash
npm run test:e2e:debug -- tests/e2e/auth/customer-login.spec.ts
```

### Run Tests on Specific Browser

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Mobile Chrome
npx playwright test --project="Mobile Chrome"
```

---

## Test Structure

### Directory Layout

```
tests/
├── e2e/                          # End-to-end tests
│   ├── auth/                     # Authentication tests
│   │   ├── customer-login.spec.ts
│   │   └── admin-login.spec.ts
│   ├── orders/                   # Order flow tests
│   │   ├── dine-in-order.spec.ts
│   │   ├── pickup-order.spec.ts
│   │   └── delivery-order.spec.ts
│   ├── admin/                    # Admin dashboard tests
│   │   ├── menu-management.spec.ts
│   │   └── order-management.spec.ts
│   └── realtime/                 # Real-time feature tests
│       └── socket-updates.spec.ts
├── fixtures/                     # Test fixtures
│   └── auth.fixture.ts
├── helpers/                      # Test helpers
│   ├── cart.helper.ts
│   └── order.helper.ts
└── setup/                        # Setup scripts
    ├── db-setup.ts
    └── seed-test-data.ts
```

---

## Writing Your First Test

### Basic Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Menu Browsing', () => {
  test('should display menu items', async ({ page }) => {
    // Navigate to menu page
    await page.goto('/menu');
    
    // Verify menu items are visible
    await expect(page.locator('[data-testid="menu-item"]')).toHaveCount(4);
    
    // Click on an item
    await page.click('[data-testid="menu-item-jollof-rice"]');
    
    // Verify details modal opens
    await expect(page.locator('[data-testid="item-details-modal"]')).toBeVisible();
  });
});
```

### Using Fixtures for Authentication

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Authenticated User Actions', () => {
  test('should view order history', async ({ authenticatedPage }) => {
    // User is already logged in via fixture
    await authenticatedPage.goto('/orders/history');
    
    await expect(authenticatedPage.locator('h1:has-text("Order History")')).toBeVisible();
  });
});
```

### Using Helpers

```typescript
import { test, expect } from '../fixtures/auth.fixture';
import { CartHelper } from '../helpers/cart.helper';

test.describe('Shopping Cart', () => {
  test('should add items to cart', async ({ authenticatedPage }) => {
    const cart = new CartHelper(authenticatedPage);
    
    await authenticatedPage.goto('/menu');
    await cart.addItemToCart('jollof-rice');
    
    const count = await cart.getCartItemCount();
    expect(count).toBe(1);
  });
});
```

---

## Common Test Patterns

### 1. Waiting for Elements

```typescript
// Wait for element to be visible
await expect(page.locator('text=Success')).toBeVisible();

// Wait for navigation
await page.waitForURL('/dashboard');

// Wait for API response
await page.waitForResponse(response => 
  response.url().includes('/api/orders') && response.status() === 200
);
```

### 2. Filling Forms

```typescript
// Fill input
await page.fill('input[name="email"]', 'test@example.com');

// Select dropdown
await page.selectOption('select[name="category"]', 'Food');

// Check checkbox
await page.check('input[type="checkbox"]');

// Click button
await page.click('button:has-text("Submit")');
```

### 3. Assertions

```typescript
// Element visibility
await expect(page.locator('text=Welcome')).toBeVisible();

// Element count
await expect(page.locator('[data-testid="item"]')).toHaveCount(5);

// Text content
await expect(page.locator('h1')).toHaveText('Dashboard');

// URL
await expect(page).toHaveURL('/dashboard');

// Attribute
await expect(page.locator('button')).toHaveAttribute('disabled', '');
```

### 4. Handling Dialogs

```typescript
// Accept confirmation dialog
page.on('dialog', dialog => dialog.accept());
await page.click('button:has-text("Delete")');

// Dismiss dialog
page.on('dialog', dialog => dialog.dismiss());
```

### 5. File Downloads

```typescript
const downloadPromise = page.waitForEvent('download');
await page.click('button:has-text("Export PDF")');
const download = await downloadPromise;

// Verify filename
expect(download.suggestedFilename()).toBe('report.pdf');

// Save file
await download.saveAs('/path/to/save/report.pdf');
```

---

## Debugging Tests

### 1. Use Playwright Inspector

```bash
npm run test:e2e:debug
```

This opens the Playwright Inspector where you can:
- Step through test execution
- Inspect DOM
- View console logs
- See network requests

### 2. Add Debug Statements

```typescript
test('debug example', async ({ page }) => {
  await page.goto('/menu');
  
  // Pause execution and open inspector
  await page.pause();
  
  // Continue with test...
});
```

### 3. Take Screenshots

```typescript
test('screenshot example', async ({ page }) => {
  await page.goto('/menu');
  
  // Take screenshot
  await page.screenshot({ path: 'menu-page.png' });
  
  // Screenshot specific element
  await page.locator('[data-testid="menu-item"]').screenshot({ 
    path: 'menu-item.png' 
  });
});
```

### 4. View Console Logs

```typescript
test('console logs', async ({ page }) => {
  page.on('console', msg => console.log('Browser log:', msg.text()));
  
  await page.goto('/menu');
});
```

---

## Test Data Management

### Clean Database Before Tests

```typescript
import { test } from '@playwright/test';
import { cleanupTestDatabase, setupTestDatabase } from '../setup/db-setup';

test.beforeAll(async () => {
  await setupTestDatabase();
  await cleanupTestDatabase();
  // Seed fresh data
});

test.afterAll(async () => {
  await cleanupTestDatabase();
});
```

### Create Test Data in Test

```typescript
test('order with specific items', async ({ page }) => {
  // Create test menu item via API
  await page.request.post('/api/admin/menu', {
    data: {
      name: 'Test Item',
      price: 1000,
      category: 'Food'
    }
  });
  
  // Use in test
  await page.goto('/menu');
  await page.click('[data-testid="menu-item-test-item"]');
});
```

---

## Viewing Test Reports

### HTML Report

After running tests:

```bash
npm run test:e2e:report
```

This opens an HTML report showing:
- Test results
- Screenshots on failure
- Videos on failure
- Execution timeline

### CI/CD Reports

In GitHub Actions, reports are uploaded as artifacts:
1. Go to Actions tab
2. Click on workflow run
3. Download **playwright-report** for the interactive HTML view
4. Download **test-results** for raw JSON + JUnit files (attach in PR comments or parse in dashboards)

---

## Best Practices

### 1. Use Data Test IDs

Always use `data-testid` for selecting elements:

```typescript
// Good
await page.click('[data-testid="submit-button"]');

// Avoid
await page.click('button.btn-primary');
```

### 2. Avoid Hardcoded Waits

```typescript
// Bad
await page.waitForTimeout(3000);

// Good
await expect(page.locator('text=Success')).toBeVisible();
```

### 3. Test Isolation

Each test should be independent:

```typescript
test.beforeEach(async ({ page }) => {
  // Reset state before each test
  await page.goto('/');
  // Clear cookies/storage if needed
  await page.context().clearCookies();
});
```

### 4. Descriptive Test Names

```typescript
// Good
test('should display error when email is invalid', async ({ page }) => {
  // ...
});

// Bad
test('test 1', async ({ page }) => {
  // ...
});
```

### 5. Group Related Tests

```typescript
test.describe('User Authentication', () => {
  test.describe('Login', () => {
    test('with valid credentials', async ({ page }) => {});
    test('with invalid credentials', async ({ page }) => {});
  });
  
  test.describe('Registration', () => {
    test('with valid data', async ({ page }) => {});
  });
});
```

---

## Troubleshooting

### Tests Failing Locally

1. **Check database connection**
   ```bash
   # Verify MongoDB is running
   mongosh
   ```

2. **Verify test data is seeded**
   ```bash
   npm run test:seed
   ```

3. **Check environment variables**
   ```bash
   cat .env.test
   ```

### Tests Timing Out

- Increase timeout in `playwright.config.ts`:
  ```typescript
  use: {
    actionTimeout: 10000, // 10 seconds
  }
  ```

### Element Not Found

- Add explicit waits:
  ```typescript
  await page.waitForSelector('[data-testid="element"]');
  ```

- Check if element is in iframe:
  ```typescript
  const frame = page.frameLocator('iframe');
  await frame.locator('button').click();
  ```

### Flaky Tests

- Use `toPass` for retrying assertions:
  ```typescript
  await expect(async () => {
    const count = await page.locator('[data-testid="item"]').count();
    expect(count).toBe(5);
  }).toPass();
  ```

---

## Useful Commands Cheat Sheet

```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific file
npx playwright test auth/customer-login.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"

# Run in headed mode
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Generate code
npx playwright codegen http://localhost:3000

# Show report
npm run test:e2e:report

# Update snapshots
npx playwright test --update-snapshots

# Run on specific browser
npx playwright test --project=chromium
```

---

## Getting Help

- **Playwright Documentation**: https://playwright.dev
- **Project Test Documentation**: See `PLAYWRIGHT-TEST-REQUIREMENTS.md`
- **Implementation Plan**: See `PLAYWRIGHT-IMPLEMENTATION-PLAN.md`

---

## Next Steps

1. Review test requirements document
2. Set up test environment
3. Run existing tests
4. Write your first test
5. Integrate with CI/CD
