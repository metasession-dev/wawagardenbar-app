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
  const category = page.getByRole('combobox', { name: 'Category' });
  await category.click();
  await page.getByRole('option', { name: 'Local Beer' }).click();
  await expect(category).toContainText('Local Beer');
  await expect(category).toBeEnabled();
  await expect(page.getByText('Total Revenue', { exact: true })).toBeVisible();
  await expect(page.getByText('Revenue vs Cost vs Profit', { exact: true })).toBeVisible();
  await expect(page.getByText('Profitability by Order Type', { exact: true })).toBeVisible();
  const categoryBreakdown = page.getByLabel('Profitability category breakdown');
  await expect(categoryBreakdown).toBeVisible();
  await expect(categoryBreakdown).not.toContainText('No category data available');
  await expect(categoryBreakdown).toContainText('beer-local');
  await evidenceShot(page, 'REQ-094', 3, 'profitability-category-filter');
});
