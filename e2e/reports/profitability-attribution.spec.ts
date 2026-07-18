/**
 * @requirement REQ-094 — Authenticated reviewer evidence for profitability
 * attribution/filter controls. Regression tier: financial-report review is
 * important but does not create or mutate production-like financial records.
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const test = base.extend({
  storageState: path.join(__dirname, '../../.auth/admin.json'),
});

async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/dashboard/reports/profitability');
  await page.waitForLoadState('networkidle');
  return page.url().includes('/dashboard/reports/profitability');
}

test('REQ-094 profitability reviewer can select a named category filter', async ({
  page,
}, testInfo) => {
  tagTest('REQ-094', 3);
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Admin login failed or credentials are not configured');
  }

  await expect(
    page.getByRole('heading', { name: 'Profitability Report' })
  ).toBeVisible();
  const category = page.getByLabel('Category');
  await category.click();
  await page.getByRole('option', { name: 'Local Beer' }).click();
  await expect(category).toContainText('Local Beer');
  await evidenceShot(page, 'REQ-094', 3, 'profitability-category-filter');
});
