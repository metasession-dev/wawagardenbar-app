import { test as base, expect, Page } from '@playwright/test';

type AuthFixtures = {
  customerPage: Page;
  adminPage: Page;
  superAdminPage: Page;
};

async function loginViaTestEndpoint(page: Page, user: 'customer' | 'admin' | 'superAdmin') {
  const response = await page.request.post('/api/test/login', {
    data: { user },
  });

  expect(response.ok()).toBeTruthy();
}

export const test = base.extend<AuthFixtures>({
  customerPage: async ({ page }, use) => {
    await loginViaTestEndpoint(page, 'customer');
    await page.goto('/');
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await loginViaTestEndpoint(page, 'admin');
    await page.goto('/dashboard');
    await use(page);
  },
  superAdminPage: async ({ page }, use) => {
    await loginViaTestEndpoint(page, 'superAdmin');
    await page.goto('/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
