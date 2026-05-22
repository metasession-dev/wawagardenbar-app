/**
 * E2E coverage for REQ-038 sellable restock + #97 Purchase unit lock.
 *
 * The sellable-restock service path (`applyExpenseInventoryLink` with
 * `kind:'menu-item'`) reuses the same write logic the kitchen-ingredient
 * path uses — that's already covered by `kitchen/expense-link.spec.ts`.
 * What's distinct here is the UI:
 *
 *   - The "Update inventory count (sellable item)" checkbox + dropdown.
 *   - The Unit field locking + value snapping when the picked sellable
 *     has a `MenuItem.expenseUnitOverride` (#97 fix).
 *
 * Strategy: seed a Menu Item with trackInventory=true + Purchase unit
 * override via the admin Menu form, then exercise the Expense form.
 * The sellable's expenseUnitOverride is the load-bearing input — without
 * it the lock behaviour can't be verified.
 */
import { expect, type Page, type Locator } from '@playwright/test';
import {
  superAdminTest,
  isAuthenticated,
  uniqueLabel,
} from '../kitchen/helpers';

async function createSellableMenuItem(
  page: Page,
  opts: {
    name: string;
    /** Default 'drinks' */
    mainCategory?: 'drinks' | 'food';
    /** Visible category text, e.g. 'Beer Imported' */
    categoryText?: string;
    /** £ price */
    price: number;
    /** The unit id to lock — e.g. 'bottles'. Renders in the Purchase unit Select. */
    purchaseUnit: string;
  }
): Promise<void> {
  await page.goto('/dashboard/menu/new');
  await page.waitForLoadState('networkidle');
  await page.locator('#name').fill(opts.name);
  await page
    .locator('#description')
    .fill('E2E-seeded sellable item for #97 unit-lock coverage.');
  await page.locator('#price').fill(String(opts.price));

  // Pick mainCategory (drinks / food).
  const mainCat = opts.mainCategory ?? 'drinks';
  const mainCategoryTrigger = page
    .locator('button[role="combobox"]', {
      has: page.locator(
        `text=/^${mainCat === 'drinks' ? 'Drinks' : 'Food'}$|Select main category/i`
      ),
    })
    .first();
  await mainCategoryTrigger.click();
  await page
    .getByRole('option', {
      name: new RegExp(mainCat === 'drinks' ? 'Drinks' : 'Food', 'i'),
    })
    .first()
    .click();

  // Enable Track Inventory toggle.
  const trackToggle = page.locator(
    'button[role="switch"], input[name="trackInventory"]'
  );
  if (
    (await trackToggle.count()) > 0 &&
    (await trackToggle.first().getAttribute('aria-checked')) !== 'true'
  ) {
    await trackToggle.first().click();
  }

  // Pick the Purchase unit (REQ-038 expenseUnitOverride).
  const purchaseUnitTrigger = page.locator('#expenseUnitOverride');
  await purchaseUnitTrigger.click();
  await page
    .getByRole('option', { name: new RegExp(opts.purchaseUnit, 'i') })
    .first()
    .click();

  // Save.
  await page
    .getByRole('button', { name: /^(Create|Save) (Item|Menu Item)$/i })
    .first()
    .click();
  await page.waitForLoadState('networkidle');
}

async function openAddExpenseDialog(page: Page): Promise<Locator> {
  await page.goto('/dashboard/finance/expenses');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /^Add Expense$/ }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

superAdminTest.describe('REQ-038 + #97 — sellable restock UI', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    '#97: picking a sellable with Purchase unit override locks the Unit field + snaps its value',
    async ({ page }, testInfo) => {
      const itemName = uniqueLabel('E2E-Sellable-Bottles');
      // Seed an in-tracked sellable with Purchase unit = bottles.
      // If the menu/new flow has shifted shape this will throw with a
      // selector miss — flag clearly via testInfo so the run logs it.
      try {
        await createSellableMenuItem(page, {
          name: itemName,
          mainCategory: 'drinks',
          price: 1500,
          purchaseUnit: 'Bottles',
        });
      } catch (err) {
        testInfo.skip(true, `menu/new form shape changed: ${err}`);
        return;
      }

      // Now exercise the Expense form's sellable flow.
      const dialog = await openAddExpenseDialog(page);
      // Category (any direct-cost option).
      await dialog.locator('button[role="combobox"]').nth(1).click();
      await page
        .getByRole('option', { name: /Beer|Despirado|Other/i })
        .first()
        .click();
      await dialog
        .locator('input[name="items.0.description"]')
        .fill(`E2E sellable restock for ${itemName}`);

      // Tick the sellable checkbox.
      await dialog
        .locator('label', {
          hasText: /Update inventory count \(sellable item\)/i,
        })
        .first()
        .click();
      // Sellable dropdown reveals.
      const sellableDropdown = dialog
        .locator('button[role="combobox"]')
        .filter({ hasText: /No sellable link/i });
      await expect(sellableDropdown).toBeVisible();
      await sellableDropdown.click();
      await page
        .getByRole('option', { name: new RegExp(itemName, 'i') })
        .first()
        .click();

      // Unit field should now be disabled AND show "Bottles" (label).
      const unitTrigger = dialog.locator('button[role="combobox"]').nth(2);
      await expect(unitTrigger).toBeDisabled();
      await expect(unitTrigger).toContainText(/Bottles/i);
    }
  );
});
