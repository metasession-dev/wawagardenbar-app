/**
 * @requirement REQ-022 - E2E: Cost snapshot integrity
 *
 * Verifies:
 * - Menu item edit form does NOT show a Cost Per Unit field in the inventory section
 * - Price Management section still has the cost field (single source of truth)
 * - Daily report page loads and shows cost/profit data
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { withMongo } from '../helpers/db-assertions';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');

const test = base.extend({
  storageState: SUPER_ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

async function openSeededMenuItemEditor(page: Page): Promise<void> {
  const itemId = await withMongo(async (db) => {
    const item = await db
      .collection('menuitems')
      .findOne({ kind: 'menu-item' }, { projection: { _id: 1 } });
    return item ? String(item._id) : null;
  });
  expect(
    itemId,
    'seeded menu item missing — run the e2e seed scripts (sdlc-config e2e_setup_command)'
  ).toBeTruthy();
  await page.goto(`/dashboard/menu/${itemId}/edit`);
  await page.waitForLoadState('networkidle');
}

// ═══════════════════════════════════════════════════════════════════════════
// Menu Item Edit Form — Cost Per Unit field removal
// ═══════════════════════════════════════════════════════════════════════════
test.describe('REQ-022: Cost Per Unit field removed from inventory section', () => {
  test.beforeEach(async ({ page }) => {
    expect(await isAuthenticated(page), 'super-admin session unavailable').toBe(
      true
    );
  });

  test('menu item edit form does not have Cost Per Unit in inventory section', async ({
    page,
  }) => {
    // Navigate to menu page and find the first editable item
    await page.goto('/dashboard/menu');
    await page.waitForLoadState('networkidle');

    // Find and click the first edit link/button for a menu item
    // REQ-102: `$=` (ends-with), not `*=` (contains) — the new "Edit All"
    // link at /dashboard/menu/edit-all otherwise also matches `*="/edit"`
    // and, being first in DOM order, shadows every real item edit link.
    const editLink = page.locator('a[href*="/menu/"][href$="/edit"]').first();
    const editExists = await editLink.count();

    if (editExists === 0) {
      // Try the new item form if no existing items
      await page.goto('/dashboard/menu/new');
      await page.waitForLoadState('networkidle');
    } else {
      await editLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Look for the Inventory Tracking section
    const inventorySection = page.getByText('Inventory Tracking');
    const hasInventory = await inventorySection.count();

    if (hasInventory > 0) {
      // Enable inventory tracking if there's a toggle
      const trackToggle = page.locator('#trackInventory');
      if (await trackToggle.count()) {
        const isChecked = await trackToggle.isChecked();
        if (!isChecked) {
          await trackToggle.click();
          // Wait for inventory fields to appear
          await page.waitForTimeout(1000);
        }
      }

      // The inventory section should NOT have a Cost Per Unit field
      const costLabel = page.locator('label[for="costPerUnit"]');
      await expect(costLabel).toHaveCount(0);

      // Verify other inventory fields are still present (when visible)
      const supplierLabel = page.locator('label[for="supplier"]');
      if (await supplierLabel.count()) {
        await expect(page.locator('label[for="minimumStock"]')).toHaveCount(1);
        await expect(page.locator('label[for="maximumStock"]')).toHaveCount(1);
      }
    }
  });

  test('Price Management section still has cost field', async ({ page }) => {
    // REQ-116 (AC13) — the menu table opens the editor from a dropdown
    // action (router.push), not an <a href>, so the old link selector matched
    // nothing and these tests silently self-skipped. Navigate to the editor
    // of a seeded item directly; a missing seed is a failure, not a skip.
    await openSeededMenuItemEditor(page);

    // Price Management section should exist with its own cost field
    await expect(page.getByText('Price Management').first()).toBeVisible();
    // The Price Management form has New Cost Per Unit field
    const body = await page.textContent('body');
    expect(body).toMatch(/New Cost Per Unit|Cost Per Unit.*₦|Update Price/i);
  });

  test('price field in Basic Information is read-only', async ({ page }) => {
    // REQ-116 (AC13) — the menu table opens the editor from a dropdown
    // action (router.push), not an <a href>, so the old link selector matched
    // nothing and these tests silently self-skipped. Navigate to the editor
    // of a seeded item directly; a missing seed is a failure, not a skip.
    await openSeededMenuItemEditor(page);

    // Price field should be read-only in the edit form
    // The page also renders the Price Management form, which reuses id="price";
    // Basic Information comes first in the DOM.
    const priceInput = page.locator('#price').first();
    await expect(priceInput).toHaveAttribute('readonly', '');

    // Should show helper text pointing to Price Management
    const helperText = page.getByText('Use Price Management below to update');
    await expect(helperText).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Daily Report — Cost data rendered from order snapshots
// ═══════════════════════════════════════════════════════════════════════════
test.describe('REQ-022: Daily report cost data integrity', () => {
  test.beforeEach(async ({ page }) => {
    expect(await isAuthenticated(page), 'super-admin session unavailable').toBe(
      true
    );
  });

  test('daily report loads with cost breakdown section', async ({ page }) => {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/dashboard/reports/daily');

    // Report should display cost-related content
    const body = await page.textContent('body');
    expect(body).toMatch(/cost|profit|margin|revenue/i);
  });
});
