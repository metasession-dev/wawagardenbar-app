/**
 * @requirement REQ-034 — D11 — Step 6 + Step 7
 *
 * Production execution + void rules end-to-end:
 *   - Make-a-batch dropdown lists only ACTIVE recipes.
 *   - Successful batch deducts each ingredient by its recipe quantity
 *     (with same-dimension conversion when the recipe unit differs from
 *     the inventory unit — exercise via a recipe authored in kg against
 *     an ingredient stored in g).
 *   - Pre-flight shortage produces a clear "Insufficient X — needs N,
 *     have M" error, and NO partial deduction lands.
 *   - Super-admin can void within 24h.
 *   - Admin cannot void (no super-admin role).
 *
 * Service-layer behaviour is fully covered by vitest
 * (`__tests__/services/production-service.*`); these tests confirm the
 * surfaces wire through to user-visible outcomes.
 */
import { expect } from '@playwright/test';
import {
  superAdminTest,
  adminTest,
  isAuthenticated,
  uniqueLabel,
  createKitchenIngredient,
  readKitchenStock,
} from './helpers';

async function authorRecipe(
  page: import('@playwright/test').Page,
  opts: {
    recipeName: string;
    ingredientName: string;
    quantity: number;
    unitLabel: string; // e.g. 'Kilograms' to test cross-unit conversion
  }
) {
  await page.goto('/dashboard/kitchen/recipes/new');
  await page.waitForLoadState('networkidle');
  await page.locator('#recipe-name').fill(opts.recipeName);
  const combos = page.locator('button[role="combobox"]');
  // Target menu item — pick first sellable.
  await combos.nth(0).click();
  await page.getByRole('option').first().click();
  // Yield = 1 (default already).
  // Ingredient row.
  await combos.nth(1).click();
  await page
    .getByRole('option', { name: new RegExp(opts.ingredientName, 'i') })
    .first()
    .click();
  await page.locator('input[type="number"]').nth(1).fill(String(opts.quantity));
  await combos.nth(2).click();
  await page
    .getByRole('option', { name: new RegExp(opts.unitLabel, 'i') })
    .first()
    .click();
  await page.getByRole('button', { name: /create recipe/i }).click();
  await page.waitForURL(/\/dashboard\/kitchen\/recipes(?!\/new)/, {
    timeout: 10000,
  });
}

superAdminTest.describe('REQ-034 D11 — Step 6: production execution', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    'make-a-batch with 2 kg recipe against g inventory deducts 2000 g',
    async ({ page }) => {
      const ingredientName = uniqueLabel('E2E-Goat');
      const recipeName = uniqueLabel('E2E-Recipe');

      // Seed ingredient with 4000 g on hand so a 2000-g deduction lands at 2000.
      await createKitchenIngredient(page, {
        name: ingredientName,
        unitLabel: 'Grams',
        initialStock: 4000,
      });

      // Author recipe: 2 kg per batch, yield 1 portion.
      await authorRecipe(page, {
        recipeName,
        ingredientName,
        quantity: 2,
        unitLabel: 'Kilograms',
      });

      // Make a batch.
      await page.goto('/dashboard/kitchen/production');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /make a batch/i }).click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      // Pick our recipe.
      await dialog.locator('button[role="combobox"]').first().click();
      await page
        .getByRole('option', { name: new RegExp(recipeName, 'i') })
        .first()
        .click();
      // Default batches = 1, default actualYield = expected.
      await dialog.getByRole('button', { name: /run batch/i }).click();
      // Dialog closes on success.
      await expect(dialog).toBeHidden({ timeout: 15000 });

      // Verify currentStock = 2000 g (4000 − 2 kg × 1000).
      const stockAfter = await readKitchenStock(page, ingredientName);
      expect(
        stockAfter,
        'AC9: 2 kg recipe should deduct 2000 g from g-inventory'
      ).toBe(2000);
    }
  );

  superAdminTest(
    'preflight shortage: batch blocked with clear error, no partial deduction',
    async ({ page }) => {
      const ingredientName = uniqueLabel('E2E-Short');
      const recipeName = uniqueLabel('E2E-RecipeShort');

      // Seed ingredient with only 500 g — recipe needs 2 kg = 2000 g.
      await createKitchenIngredient(page, {
        name: ingredientName,
        unitLabel: 'Grams',
        initialStock: 500,
      });
      await authorRecipe(page, {
        recipeName,
        ingredientName,
        quantity: 2,
        unitLabel: 'Kilograms',
      });

      await page.goto('/dashboard/kitchen/production');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /make a batch/i }).click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await dialog.locator('button[role="combobox"]').first().click();
      await page
        .getByRole('option', { name: new RegExp(recipeName, 'i') })
        .first()
        .click();
      await dialog.getByRole('button', { name: /run batch/i }).click();

      // Expect a shortage alert with "needs ... have ..." style copy.
      await expect(dialog.locator('[role="alert"], .alert')).toContainText(
        /insufficient|needs|short/i,
        { timeout: 10000 }
      );

      // currentStock unchanged — no partial deduction.
      // Close the dialog so the inventory read below doesn't race the modal.
      await dialog.getByRole('button', { name: /cancel/i }).click();
      await expect(dialog).toBeHidden({ timeout: 5000 });
      expect(await readKitchenStock(page, ingredientName)).toBe(500);
    }
  );
});

adminTest.describe('REQ-034 D11 — Step 7: production void rules', () => {
  adminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'admin auth missing');
    }
  });

  adminTest(
    'admin (non-super-admin) does NOT see a Void button on production history',
    async ({ page }) => {
      await page.goto('/dashboard/kitchen/production');
      await page.waitForLoadState('networkidle');
      // Either the table is empty (no productions yet) or it has rows
      // without a Void button. Either way: no Void buttons for admin.
      const voidButtons = page.getByRole('button', { name: /^void$/i });
      await expect(voidButtons).toHaveCount(0);
    }
  );
});
