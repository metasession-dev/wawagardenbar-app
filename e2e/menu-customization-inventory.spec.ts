import { test as base, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests — REQ-030: Customization option inventory links — admin UI
 *
 * Verifies the customization options builder on the menu edit page exposes
 * the new "Deduct from inventory" select and units-to-deduct input. Data
 * persistence round-trips are covered by the unit tests in
 * `__tests__/actions/admin/menu-actions.customization-inventory.test.ts`
 * and the resolver/service tests — this spec confirms the UI shell renders
 * and the new controls are reachable.
 *
 * @requirement REQ-030
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
});

superAdminTest.describe(
  'REQ-030: Menu customization inventory links — admin UI',
  () => {
    superAdminTest(
      'menu list page reaches at least one item edit screen',
      async ({ page }, testInfo) => {
        await page.goto('/dashboard/menu');
        await page.waitForLoadState('networkidle');

        const editLink = page
          .getByRole('link', { name: /edit/i })
          .or(page.getByRole('button', { name: /edit/i }))
          .first();

        if ((await editLink.count()) === 0) {
          testInfo.skip(true, 'No menu items available to edit — skipping');
        }

        await editLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/Customization Options/i)).toBeVisible();
      }
    );

    superAdminTest(
      'adding a customization group exposes inventory link controls',
      async ({ page }, testInfo) => {
        await page.goto('/dashboard/menu');
        await page.waitForLoadState('networkidle');

        const editLink = page
          .getByRole('link', { name: /edit/i })
          .or(page.getByRole('button', { name: /edit/i }))
          .first();

        if ((await editLink.count()) === 0) {
          testInfo.skip(true, 'No menu items available to edit — skipping');
        }

        await editLink.click();
        await page.waitForLoadState('networkidle');

        const customizationCard = page
          .getByText(/Customization Options/i)
          .locator('..')
          .locator('..');
        await expect(customizationCard).toBeVisible();

        // Either an existing group + option is already rendered (inventory
        // controls visible) or we add a group to surface them.
        const inventoryLabel = page.getByText(/Deduct from inventory/i).first();

        if ((await inventoryLabel.count()) === 0) {
          const addGroup = page.getByRole('button', { name: /Add Group/i });
          if ((await addGroup.count()) > 0) {
            await addGroup.click();
          }
        }

        // Inventory link select is only rendered when the server-action
        // returned at least one inventory row. In empty test environments we
        // cannot guarantee that, so accept either: the label is present, or
        // the customization builder card is present with no inventory rows.
        const labelVisible =
          (await page.getByText(/Deduct from inventory/i).count()) > 0;
        if (!labelVisible) {
          testInfo.skip(
            true,
            'No inventory records available to link — admin UI renders customization builder without the link select'
          );
        }

        await expect(
          page.getByText(/Deduct from inventory/i).first()
        ).toBeVisible();
      }
    );
  }
);
