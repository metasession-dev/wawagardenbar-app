/**
 * @requirement REQ-015 - E2E: Staff Pot tracker and configuration
 *
 * Verifies:
 * - Staff Pot nav link visible for admin/super-admin
 * - Tracker page loads with monthly countdown, summary cards, daily table
 * - Configuration form visible in settings (super-admin only)
 * - Configuration persists after save
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json');
const SUPER_ADMIN_FILE = path.join(__dirname, '../.auth/super-admin.json');

const adminTest = base.extend({
  storageState: ADMIN_FILE,
});

const superAdminTest = base.extend({
  storageState: SUPER_ADMIN_FILE,
});

async function isAuthenticated(
  page: Page,
  role: 'admin' | 'super-admin'
): Promise<boolean> {
  try {
    const target = role === 'super-admin' ? '/dashboard' : '/dashboard/orders';
    await page.goto(target);
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════════════════════
adminTest.describe('REQ-015: Staff Pot — Navigation', () => {
  adminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page, 'admin'))) {
      testInfo.skip(true, 'Admin login failed');
    }
  });

  adminTest('Staff Pot link visible in sidebar for admin', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    const navLink = page.locator('nav a[href="/dashboard/staff-pot"]');
    await expect(navLink).toBeVisible();
  });

  adminTest('Staff Pot page loads for admin', async ({ page }) => {
    await page.goto('/dashboard/staff-pot');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/dashboard/staff-pot');
    await expect(page.locator('h2', { hasText: 'Staff Pot' })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tracker Page
// ═══════════════════════════════════════════════════════════════════════════
superAdminTest.describe('REQ-015: Staff Pot — Tracker Page', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page, 'super-admin'))) {
      testInfo.skip(true, 'Super-admin login failed');
    }
  });

  superAdminTest('tracker page shows monthly countdown', async ({ page }) => {
    await page.goto('/dashboard/staff-pot');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await expect(page.getByText('Calculating staff pot...'))
      .toBeHidden({ timeout: 30000 })
      .catch(() => {});

    // Current month name should be visible
    const now = new Date();
    const monthName = now.toLocaleString('en', { month: 'long' });
    await expect(page.getByText(monthName, { exact: false })).toBeVisible({
      timeout: 15000,
    });

    // Countdown text: "Day X of Y"
    await expect(page.getByText(/Day \d+ of \d+/i)).toBeVisible();

    // "days remaining" text
    await expect(page.getByText(/\d+ days remaining/i)).toBeVisible();
  });

  superAdminTest('tracker page shows summary cards', async ({ page }) => {
    await page.goto('/dashboard/staff-pot');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Calculating staff pot...'))
      .toBeHidden({ timeout: 30000 })
      .catch(() => {});

    // Summary cards
    await expect(page.getByText('Total Pot')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Qualifying Days')).toBeVisible();
    await expect(page.getByText('Kitchen Team')).toBeVisible();
    await expect(page.getByText('Bar Team')).toBeVisible();
  });

  superAdminTest(
    'tracker page shows daily breakdown table',
    async ({ page }) => {
      await page.goto('/dashboard/staff-pot');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Calculating staff pot...'))
        .toBeHidden({ timeout: 30000 })
        .catch(() => {});

      await expect(page.getByText('Daily Breakdown')).toBeVisible({
        timeout: 15000,
      });

      // Table headers
      await expect(page.locator('th', { hasText: 'Revenue' })).toBeVisible();
      await expect(page.locator('th', { hasText: 'Target' })).toBeVisible();
      await expect(
        page.locator('th', { hasText: 'Pot Contribution' })
      ).toBeVisible();
    }
  );

  superAdminTest(
    'tracker page shows How It Works section',
    async ({ page }) => {
      await page.goto('/dashboard/staff-pot');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Calculating staff pot...'))
        .toBeHidden({ timeout: 30000 })
        .catch(() => {});

      await expect(page.getByText('How It Works')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Daily Target:')).toBeVisible();
      await expect(page.getByText('Bonus Rate:')).toBeVisible();
      await expect(page.getByText('Split:')).toBeVisible();
    }
  );

  superAdminTest('tracker page supports month navigation', async ({ page }) => {
    await page.goto('/dashboard/staff-pot');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Calculating staff pot...'))
      .toBeHidden({ timeout: 30000 })
      .catch(() => {});

    // Get the current month heading
    const monthHeading = page.locator('h3.text-2xl');
    const currentText = await monthHeading.textContent();

    // The prev month button is next to the month heading, inside the same card
    // Find it by locating the heading's parent and getting the first button
    const monthCard = monthHeading
      .locator('xpath=ancestor::div[contains(@class, "rounded")]')
      .first();
    const prevBtn = monthCard.locator('button').first();
    await prevBtn.click();

    // Wait for new data to load
    await expect(page.getByText('Calculating staff pot...'))
      .toBeHidden({ timeout: 30000 })
      .catch(() => {});

    // Month heading should have changed
    await expect(monthHeading).not.toHaveText(currentText || '', {
      timeout: 15000,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Configuration (Super-Admin only)
// ═══════════════════════════════════════════════════════════════════════════
superAdminTest.describe('REQ-015: Staff Pot — Configuration', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page, 'super-admin'))) {
      testInfo.skip(true, 'Super-admin login failed');
    }
  });

  superAdminTest(
    'config form visible in settings for super-admin',
    async ({ page }) => {
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Staff Pot (Team Bonus)')).toBeVisible();

      // Config fields should be present
      await expect(page.getByLabel('Daily Revenue Target')).toBeVisible();
      await expect(page.getByLabel('Bonus Percentage')).toBeVisible();
      await expect(page.getByLabel('Kitchen Split')).toBeVisible();
      await expect(page.getByLabel('Bar Split')).toBeVisible();
      await expect(page.getByLabel('Kitchen Staff Count')).toBeVisible();
      await expect(page.getByLabel('Bar Staff Count')).toBeVisible();
    }
  );

  superAdminTest('config saves and persists', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Set a specific target value
    const targetInput = page.getByLabel('Daily Revenue Target');
    await targetInput.clear();
    await targetInput.fill('75000');

    // Save
    const saveBtn = page.locator('button', { hasText: 'Save Configuration' });
    await saveBtn.click();

    // Wait for success toast
    await expect(
      page.getByText('Staff Pot configuration updated').first()
    ).toBeVisible({ timeout: 10000 });

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    const value = await page.getByLabel('Daily Revenue Target').inputValue();
    expect(value).toBe('75000');

    // Restore default
    await page.getByLabel('Daily Revenue Target').clear();
    await page.getByLabel('Daily Revenue Target').fill('50000');
    await page.locator('button', { hasText: 'Save Configuration' }).click();
    await expect(
      page.getByText('Staff Pot configuration updated').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
