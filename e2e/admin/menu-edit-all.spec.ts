/**
 * @requirement REQ-102 — AC7/AC8: bulk "Edit All" menu page
 * @requirement REQ-103 — AC1/AC2/AC5: menuManagement-permitted admin can
 * save Edit All rows (non-price + price fields); a session without the
 * permission is still blocked at the page level.
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
const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const CSR_FILE = path.join(__dirname, '../../.auth/csr.json');

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

      // .first() — the toast text is duplicated by an aria-live
      // announcer span, so the bare regex matches two elements and a
      // strict-mode toBeVisible() would throw.
      await expect(
        page.getByText(new RegExp(`${handle!.name}.*updated`, 'i')).first()
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

/**
 * REQ-103 — AC1/AC2: `updateMenuItemRowAction` previously hard-coded
 * `role !== 'super-admin'`, rejecting the whole row save for any
 * `menuManagement`-permitted admin. `e2e-admin` (`.auth/admin.json`) is
 * seeded with role `admin` + `permissions.menuManagement: true` (see
 * `scripts/seed-e2e-admins.ts`) — exactly the account class this fix
 * unblocks.
 */
const adminTest = base.extend({ storageState: ADMIN_FILE });
adminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Admin login failed — skipping');
  }
});

adminTest.describe(
  'REQ-103: Edit All save — menuManagement-permitted admin (non-super-admin)',
  () => {
    adminTest.describe.configure({ mode: 'serial' });

    let handle: SeedHandle | null = null;

    adminTest.beforeAll(async () => {
      handle = await seedMenuItem();
    });

    adminTest.afterAll(async () => {
      await cleanup(handle);
    });

    adminTest(
      'AC1: a menuManagement-permitted admin can save a non-price field',
      async ({ page }) => {
        tagTest('REQ-103', 1);
        await page.goto('/dashboard/menu/edit-all', {
          waitUntil: 'domcontentloaded',
        });

        const row = page.locator(
          `[data-testid="edit-all-row-${handle!.itemId}"]`
        );
        await expect(row).toBeVisible();

        const nameInput = row.locator(
          `[data-testid="edit-all-name-${handle!.itemId}"]`
        );
        const newName = `${handle!.name}-renamed`;
        await nameInput.fill(newName);

        const saveButton = page.locator(
          `[data-testid="edit-all-save-${handle!.itemId}"]`
        );
        await saveButton.click();

        await expect(
          page.getByText(new RegExp(`${handle!.name}.*updated`, 'i')).first()
        ).toBeVisible({ timeout: 10000 });
        await evidenceShot(
          page,
          'REQ-103',
          1,
          'menu-management-admin-non-price-save'
        );
        handle!.name = newName;
      }
    );

    adminTest(
      'AC2: a menuManagement-permitted admin can save a price field',
      async ({ page }) => {
        tagTest('REQ-103', 2);
        await page.goto('/dashboard/menu/edit-all', {
          waitUntil: 'domcontentloaded',
        });

        const row = page.locator(
          `[data-testid="edit-all-row-${handle!.itemId}"]`
        );
        await expect(row).toBeVisible();

        const priceInputs = row.locator('input[type="number"]');
        await priceInputs.nth(1).fill('1200');

        const saveButton = page.locator(
          `[data-testid="edit-all-save-${handle!.itemId}"]`
        );
        await saveButton.click();

        await expect(
          page.getByText(new RegExp(`${handle!.name}.*updated`, 'i')).first()
        ).toBeVisible({ timeout: 10000 });
        await evidenceShot(
          page,
          'REQ-103',
          2,
          'menu-management-admin-price-save'
        );

        await page.reload({ waitUntil: 'domcontentloaded' });
        const reloadedRow = page.locator(
          `[data-testid="edit-all-row-${handle!.itemId}"]`
        );
        const reloadedPriceInputs = reloadedRow.locator('input[type="number"]');
        await expect(reloadedPriceInputs.nth(1)).toHaveValue('1200');
      }
    );
  }
);

/**
 * REQ-103 — AC5 (negative, page-level defense-in-depth): a session with
 * neither `super-admin` nor `menuManagement` must still be unable to reach
 * the save surface at all. This is the pre-existing, unchanged
 * `routePermissions['/dashboard/menu']` gate in `proxy.ts` — the actual
 * save-action gate this REQ fixes (`hasSessionPermission`) is proven
 * directly by unit tests (`__tests__/actions/admin/menu-actions.edit-all-row.test.ts`),
 * since a session blocked here never reaches the save form to exercise it.
 */
const csrTest = base.extend({ storageState: CSR_FILE });
csrTest.beforeEach(async ({ page }, testInfo) => {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
    if (!page.url().includes('/dashboard')) {
      testInfo.skip(true, 'CSR login failed — skipping');
    }
  } catch {
    testInfo.skip(true, 'CSR login failed — skipping');
  }
});

csrTest(
  'REQ-103 AC5: a session without menuManagement is redirected away from Edit All',
  async ({ page }) => {
    tagTest('REQ-103', 5);
    await page.goto('/dashboard/menu/edit-all', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/dashboard\/forbidden/);
    await evidenceShot(
      page,
      'REQ-103',
      5,
      'no-menu-management-blocked-edit-all'
    );
  }
);
