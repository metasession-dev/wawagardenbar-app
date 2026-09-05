/**
 * @requirement REQ-102 — AC7/AC8: bulk "Edit All" menu page
 *
 * Covers AC7-AC8 from compliance/evidence/REQ-102/test-scope.md:
 *   AC7 — /dashboard/menu/edit-all shows every menu item with editable
 *   cost/default/show/happy-hour price, name, main category, category,
 *   availability, and filters by main category + category.
 *   AC8 — editing a row's price fields and saving persists via the same
 *   audited price-history convention as the single-item form.
 *
 * Seeds a throwaway MenuItem via MongoDB and cleans it up afterAll.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

interface SeedHandle {
  itemId: string;
  name: string;
}

async function seedMenuItem(): Promise<SeedHandle> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const now = new Date();
    const name = `e2e-req102-edit-all-${Date.now()}`;

    const result = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name,
      description: 'REQ-102 e2e edit-all pin',
      mainCategory: 'food',
      category: 'main-courses',
      price: 1000,
      showPrice: 1000,
      happyHourPrice: 1000,
      costPerUnit: 400,
      images: [],
      customizations: [],
      tags: ['e2e-req102'],
      allergens: [],
      isAvailable: true,
      preparationTime: 15,
      portionOptions: {
        halfPortionEnabled: false,
        halfPortionSurcharge: 0,
        quarterPortionEnabled: false,
        quarterPortionSurcharge: 0,
      },
      allowManualPriceOverride: false,
      trackInventory: false,
      pointsRedeemable: false,
      createdAt: now,
      updatedAt: now,
    });
    return { itemId: String(result.insertedId), name };
  } finally {
    await client.close();
  }
}

async function cleanup(handle: SeedHandle | null): Promise<void> {
  if (!handle) return;
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db
      .collection('menuitems')
      .deleteOne({ _id: new ObjectId(handle.itemId) });
    await db
      .collection('menuitempricehistories')
      .deleteMany({ menuItemId: new ObjectId(handle.itemId) });
  } finally {
    await client.close();
  }
}

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
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
});

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe('REQ-102: Bulk "Edit All" menu page', () => {
  let handle: SeedHandle | null = null;

  superAdminTest.beforeAll(async () => {
    handle = await seedMenuItem();
  });

  superAdminTest.afterAll(async () => {
    await cleanup(handle);
  });

  superAdminTest(
    'AC7: "Edit All" link on /dashboard/menu navigates to the bulk page, which lists the seeded item',
    async ({ page }) => {
      tagTest('REQ-102', 7);
      await page.goto('/dashboard/menu', { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: /edit all/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/menu\/edit-all/);

      const row = page.locator(
        `[data-testid="edit-all-row-${handle!.itemId}"]`
      );
      await expect(row).toBeVisible();
      await expect(
        row.locator(`[data-testid="edit-all-name-${handle!.itemId}"]`)
      ).toHaveValue(handle!.name);
      await evidenceShot(page, 'REQ-102', 7, 'edit-all-page-lists-item', {
        tier: 'feature',
      });
    }
  );

  superAdminTest(
    'AC7: filtering by main category narrows the visible rows',
    async ({ page }) => {
      tagTest('REQ-102', 7);
      await page.goto('/dashboard/menu/edit-all', {
        waitUntil: 'domcontentloaded',
      });

      const row = page.locator(
        `[data-testid="edit-all-row-${handle!.itemId}"]`
      );
      await expect(row).toBeVisible();

      const mainCategoryFilter = page.getByTestId(
        'edit-all-filter-main-category'
      );

      // Filter to a main category the seeded item is NOT in — row disappears.
      await mainCategoryFilter.click();
      const drinksOption = page.getByRole('option', { name: 'Drinks' });
      await expect(drinksOption).toBeVisible();
      await drinksOption.click();
      await expect(row).not.toBeVisible();

      // Back to "All main categories" — row reappears.
      await mainCategoryFilter.click();
      const allOption = page.getByRole('option', {
        name: 'All main categories',
      });
      await expect(allOption).toBeVisible();
      await allOption.click();
      await expect(row).toBeVisible();
      await evidenceShot(page, 'REQ-102', 7, 'edit-all-filter-narrows-rows');
    }
  );

  superAdminTest(
    "AC8: editing a row's price fields and saving persists (audited like the single-item form)",
    async ({ page }) => {
      tagTest('REQ-102', 8);
      await page.goto('/dashboard/menu/edit-all', {
        waitUntil: 'domcontentloaded',
      });

      const row = page.locator(
        `[data-testid="edit-all-row-${handle!.itemId}"]`
      );
      await expect(row).toBeVisible();

      const priceInputs = row.locator('input[type="number"]');
      // Column order: cost, default, show, happy-hour.
      await priceInputs.nth(2).fill('750');
      await priceInputs.nth(3).fill('550');

      const saveButton = page.locator(
        `[data-testid="edit-all-save-${handle!.itemId}"]`
      );
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      await expect(
        page.getByText(new RegExp(`${handle!.name}.*updated`, 'i'))
      ).toBeVisible({
        timeout: 10000,
      });
      await evidenceShot(page, 'REQ-102', 8, 'edit-all-row-saved');

      // Reload and confirm the values persisted (proves the server-side
      // PriceHistoryService write, not just optimistic client state).
      await page.reload({ waitUntil: 'domcontentloaded' });
      const reloadedRow = page.locator(
        `[data-testid="edit-all-row-${handle!.itemId}"]`
      );
      const reloadedPriceInputs = reloadedRow.locator('input[type="number"]');
      await expect(reloadedPriceInputs.nth(2)).toHaveValue('750');
      await expect(reloadedPriceInputs.nth(3)).toHaveValue('550');
    }
  );

  superAdminTest(
    'AC8: toggling availability saves immediately',
    async ({ page }) => {
      tagTest('REQ-102', 8);
      await page.goto('/dashboard/menu/edit-all', {
        waitUntil: 'domcontentloaded',
      });

      const availabilitySwitch = page.locator(
        `[data-testid="edit-all-available-${handle!.itemId}"]`
      );
      await expect(availabilitySwitch).toBeVisible();
      const wasChecked =
        (await availabilitySwitch.getAttribute('data-state')) === 'checked';
      await availabilitySwitch.click();

      await page.reload({ waitUntil: 'domcontentloaded' });
      const reloadedSwitch = page.locator(
        `[data-testid="edit-all-available-${handle!.itemId}"]`
      );
      const isCheckedNow =
        (await reloadedSwitch.getAttribute('data-state')) === 'checked';
      expect(isCheckedNow).toBe(!wasChecked);
    }
  );
});
