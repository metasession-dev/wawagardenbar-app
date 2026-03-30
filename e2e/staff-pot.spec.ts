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
      await expect(page.getByLabel('Incentive Start Date')).toBeVisible();

      // Inventory loss deduction fields
      await expect(
        page.getByLabel('Enable Inventory Loss Deduction')
      ).toBeVisible();
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

// ═══════════════════════════════════════════════════════════════════════════
// Role-based view split (#20)
// ═══════════════════════════════════════════════════════════════════════════
adminTest.describe('REQ-015: Staff Pot — Admin View (no revenue)', () => {
  adminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page, 'admin'))) {
      testInfo.skip(true, 'Admin login failed');
    }
  });

  adminTest(
    'admin does NOT see revenue/target/surplus columns',
    async ({ page }) => {
      await page.goto('/dashboard/staff-pot');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Calculating staff pot...'))
        .toBeHidden({ timeout: 30000 })
        .catch(() => {});

      // Should NOT see "Daily Breakdown" heading (that's super-admin)
      await expect(page.getByText('Daily Breakdown')).toHaveCount(0);

      // Should NOT see revenue table headers
      await expect(page.locator('th', { hasText: 'Revenue' })).toHaveCount(0);
      await expect(page.locator('th', { hasText: 'Surplus' })).toHaveCount(0);
    }
  );

  adminTest('admin sees qualifying days calendar grid', async ({ page }) => {
    await page.goto('/dashboard/staff-pot');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Calculating staff pot...'))
      .toBeHidden({ timeout: 30000 })
      .catch(() => {});

    // Should see the grid of day indicators (grid-cols-7)
    const grid = page.locator('.grid-cols-7');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Grid should contain day numbers
    const dayItems = grid.locator('div');
    expect(await dayItems.count()).toBeGreaterThan(0);
  });

  adminTest('admin sees simplified How It Works', async ({ page }) => {
    await page.goto('/dashboard/staff-pot');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Calculating staff pot...'))
      .toBeHidden({ timeout: 30000 })
      .catch(() => {});

    await expect(page.getByText('How It Works')).toBeVisible({
      timeout: 15000,
    });

    // Should NOT see "Daily Target:" label (that's super-admin only)
    await expect(page.getByText('Daily Target:')).toHaveCount(0);

    // Should see motivational text instead
    await expect(page.getByText(/Hit more qualifying days/i)).toBeVisible();
  });
});

superAdminTest.describe(
  'REQ-015: Staff Pot — Super-Admin View (full details)',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page, 'super-admin'))) {
        testInfo.skip(true, 'Super-admin login failed');
      }
    });

    superAdminTest(
      'super-admin sees full daily breakdown with revenue columns',
      async ({ page }) => {
        await page.goto('/dashboard/staff-pot');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Calculating staff pot...'))
          .toBeHidden({ timeout: 30000 })
          .catch(() => {});

        // Should see "Daily Breakdown" heading
        await expect(page.getByText('Daily Breakdown')).toBeVisible({
          timeout: 15000,
        });

        // Should see revenue table headers
        await expect(page.locator('th', { hasText: 'Revenue' })).toBeVisible();
        await expect(page.locator('th', { hasText: 'Target' })).toBeVisible();
        await expect(
          page.locator('th', { hasText: 'Surplus / Deficit' })
        ).toBeVisible();
      }
    );

    superAdminTest(
      'super-admin sees detailed How It Works with config values',
      async ({ page }) => {
        await page.goto('/dashboard/staff-pot');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Calculating staff pot...'))
          .toBeHidden({ timeout: 30000 })
          .catch(() => {});

        await expect(page.getByText('Daily Target:')).toBeVisible({
          timeout: 15000,
        });
        await expect(page.getByText('Bonus Rate:')).toBeVisible();
        await expect(page.getByText('Split:')).toBeVisible();
      }
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Start Date Configuration (#21)
// ═══════════════════════════════════════════════════════════════════════════
superAdminTest.describe('REQ-015: Staff Pot — Start Date', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page, 'super-admin'))) {
      testInfo.skip(true, 'Super-admin login failed');
    }
  });

  superAdminTest('start date field visible in config', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Incentive Start Date')).toBeVisible();

    await expect(
      page.getByText(/Only days from this date onward count toward the pot/i)
    ).toBeVisible();
  });

  superAdminTest('start date saves and persists', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // Set start date
    const startDateInput = page.getByLabel('Incentive Start Date');
    await startDateInput.fill('2026-03-15');

    await page.locator('button', { hasText: 'Save Configuration' }).click();
    await expect(
      page.getByText('Staff Pot configuration updated').first()
    ).toBeVisible({ timeout: 10000 });

    // Reload and verify
    await page.reload();
    await page.waitForLoadState('networkidle');

    const value = await page.getByLabel('Incentive Start Date').inputValue();
    expect(value).toBe('2026-03-15');

    // Clear start date to restore default
    await page.getByLabel('Incentive Start Date').fill('');
    await page.locator('button', { hasText: 'Save Configuration' }).click();
    await expect(
      page.getByText('Staff Pot configuration updated').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
