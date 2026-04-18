import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-029: Expenses search field expansion
 *
 * Covers the user-facing search behaviour on /dashboard/finance/expenses:
 * - placeholder advertises the expanded scope
 * - pasting a regex-special string (including the pipe in TRF transfer
 *   references) does not crash the page
 * - clearing the search restores the full date-range list
 * - a known non-matching term renders the empty state
 *
 * AC1 (exact TRF reference returns the matching expense) is covered by
 * the unit tests in __tests__/lib/expense-search.test.ts and
 * __tests__/services/expense-service.search.test.ts which assert the
 * predicate and Mongo query shape against the literal driver string
 * "TRF|2MPTfr482|2045529935434317824". The full end-to-end round-trip is
 * manually verified on UAT per test-scope.md.
 *
 * @requirement REQ-029
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

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed — skipping');
  }
  await page.goto('/dashboard/finance/expenses');
  await page.waitForLoadState('networkidle');
});

function searchInput(page: Page) {
  return page.getByPlaceholder(/Search description, supplier, reference/i);
}

function resultsCount(page: Page) {
  return page.locator('text=/Showing \\d+ of \\d+ expenses/');
}

superAdminTest.describe('REQ-029: Expenses search — extended fields', () => {
  superAdminTest(
    'placeholder advertises the expanded search scope',
    async ({ page }) => {
      await expect(searchInput(page)).toBeVisible();
    }
  );

  superAdminTest(
    'typing a regex-special term with pipes does not break the page',
    async ({ page }) => {
      const input = searchInput(page);
      await input.fill('TRF|2MPTfr482|2045529935434317824');
      // The page must still render the results count (not crash); the term
      // is escaped so an unrelated expense does not accidentally match.
      await expect(resultsCount(page)).toBeVisible();
    }
  );

  superAdminTest(
    'typing characters that are regex alternation does not match literal TRF',
    async ({ page }) => {
      const input = searchInput(page);
      // If escape were broken, the pattern "TRF|xxxxxxxx" would alternate
      // and match any expense description containing "TRF". With the escape
      // in place, the literal substring must be present on the row for a
      // match. A unique-nonsense TRF-style string produces zero matches.
      await input.fill('TRF|ZZZZZZZZZZZZZ|0000000000000000000');
      // Wait for either the "No expenses found" empty state or a count of 0.
      const empty = page.locator('text=/No expenses found/i');
      const count0 = page.locator('text=/Showing 0 of /');
      await expect(empty.or(count0)).toBeVisible();
    }
  );

  superAdminTest(
    'clearing the search restores the full date-range list',
    async ({ page }) => {
      const input = searchInput(page);
      await expect(resultsCount(page)).toBeVisible();
      const initial = (await resultsCount(page).textContent()) ?? '';
      await input.fill('zzunique-gibberish-xyzzy-' + Date.now());
      const narrowed = (await resultsCount(page).textContent()) ?? '';
      await input.fill('');
      await expect(async () => {
        const restored = (await resultsCount(page).textContent()) ?? '';
        expect(restored).toBe(initial);
      }).toPass();
      // and narrowing was actually applied
      expect(narrowed).not.toBe(initial);
    }
  );

  superAdminTest(
    'numeric search term does not break the page',
    async ({ page }) => {
      const input = searchInput(page);
      await input.fill('15000');
      await expect(resultsCount(page)).toBeVisible();
    }
  );
});
