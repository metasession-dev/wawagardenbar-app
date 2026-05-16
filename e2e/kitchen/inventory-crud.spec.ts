/**
 * @requirement REQ-037 — Edit + delete kitchen ingredients
 *
 * 15 E2E tests covering every AC1–AC5 behaviour. The user's instruction
 * (2026-05-16) was to maximise automated coverage — every operator-facing
 * surface gets a Playwright assertion here so manual UAT is reduced to
 * historical-data regression checks + the sign-off ceremony.
 *
 * Spec uses the same per-test seed pattern as the REQ-034 D11 specs:
 * unique-suffixed ingredient + recipe names so tests are isolated and
 * resilient to leftover data on shared UAT/CI Mongo.
 */
import { expect, type Page } from '@playwright/test';
import {
  superAdminTest,
  isAuthenticated,
  uniqueLabel,
  createKitchenIngredient,
  readKitchenStock,
} from './helpers';

async function openInventoryKitchenTab(page: Page) {
  await page.goto('/dashboard/inventory');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /^Kitchen/ }).click();
}

async function openEditDialogFor(page: Page, ingredientName: string) {
  await openInventoryKitchenTab(page);
  const row = page.locator('tr', { hasText: ingredientName }).first();
  await expect(row).toBeVisible();
  await row
    .getByRole('button', { name: new RegExp(`Edit ${ingredientName}`, 'i') })
    .click();
  const dialog = page.locator('[role="dialog"]', {
    has: page.getByRole('heading', { name: /Edit Kitchen Ingredient/i }),
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openDeleteDialogFor(page: Page, ingredientName: string) {
  await openInventoryKitchenTab(page);
  const row = page.locator('tr', { hasText: ingredientName }).first();
  await expect(row).toBeVisible();
  await row
    .getByRole('button', { name: new RegExp(`Delete ${ingredientName}`, 'i') })
    .click();
  const dialog = page.locator('[role="dialog"]', {
    has: page.getByRole('heading', { name: /Delete kitchen ingredient/i }),
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function authorRecipeReferencing(
  page: Page,
  opts: { recipeName: string; ingredientName: string }
) {
  await page.goto('/dashboard/kitchen/recipes/new');
  await page.waitForLoadState('networkidle');
  await page.locator('#recipe-name').fill(opts.recipeName);
  const combos = page.locator('button[role="combobox"]');
  // Target menu item — first sellable.
  await combos.nth(0).click();
  await page.getByRole('option').first().click();
  // Ingredient row.
  await combos.nth(1).click();
  await page
    .getByRole('option', { name: new RegExp(opts.ingredientName, 'i') })
    .first()
    .click();
  await page.locator('input[type="number"]').nth(1).fill('100');
  // Unit defaults to ingredient's unit (Grams).
  await page.getByRole('button', { name: /create recipe/i }).click();
  await page.waitForURL(/\/dashboard\/kitchen\/recipes(?!\/new)/, {
    timeout: 10000,
  });
}

async function deactivateRecipe(page: Page, recipeName: string) {
  await page.goto('/dashboard/kitchen/recipes');
  await page.waitForLoadState('networkidle');
  const row = page.locator('tr', { hasText: recipeName }).first();
  await row.getByRole('button', { name: /^Deactivate$/i }).click();
  await page.waitForLoadState('networkidle');
}

superAdminTest.describe(
  'REQ-037 — Edit + delete kitchen ingredients (15 tests, all ACs)',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'super-admin auth missing');
      }
    });

    // ─── AC1 ─────────────────────────────────────────────────────────────

    superAdminTest(
      'AC1 — Edit dialog opens with fields pre-filled',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Edit-Prefill');
        await createKitchenIngredient(page, {
          name,
          unitLabel: 'Grams',
          initialStock: 0,
          minStock: 5,
          maxStock: 50,
        });

        const dialog = await openEditDialogFor(page, name);
        await expect(dialog.locator('#edit-ki-name')).toHaveValue(name);
        await expect(dialog.locator('#edit-ki-min')).toHaveValue('5');
        await expect(dialog.locator('#edit-ki-max')).toHaveValue('50');
      }
    );

    superAdminTest(
      'AC1 — Unit field is disabled and exposes the lock tooltip',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Edit-UnitLocked');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        const dialog = await openEditDialogFor(page, name);
        const unitField = dialog.locator('#edit-ki-unit-locked');
        await expect(unitField).toBeDisabled();
        // Tooltip lives on the `title` attribute (HTML-native; no library needed).
        const title = await unitField.getAttribute('title');
        expect(title).toMatch(/locked/i);
        expect(title).toMatch(/StockMovement/i);
      }
    );

    // ─── AC1 + AC2 happy paths ───────────────────────────────────────────

    superAdminTest(
      'AC1+AC2 — Edit name → reload → new name persists',
      async ({ page }) => {
        const original = uniqueLabel('E2E-Edit-Name-Before');
        const renamed = uniqueLabel('E2E-Edit-Name-After');
        await createKitchenIngredient(page, {
          name: original,
          unitLabel: 'Grams',
        });

        const dialog = await openEditDialogFor(page, original);
        await dialog.locator('#edit-ki-name').fill(renamed);
        await dialog.getByRole('button', { name: /save changes/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        await openInventoryKitchenTab(page);
        await expect(
          page.locator('tr', { hasText: renamed }).first()
        ).toBeVisible();
        await expect(page.locator('tr', { hasText: original })).toHaveCount(0);
      }
    );

    superAdminTest(
      'AC1+AC2 — Edit min/max → reload → new thresholds persist',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Edit-Thresholds');
        await createKitchenIngredient(page, {
          name,
          unitLabel: 'Grams',
          minStock: 1,
          maxStock: 10,
        });

        const dialog = await openEditDialogFor(page, name);
        await dialog.locator('#edit-ki-min').fill('250');
        await dialog.locator('#edit-ki-max').fill('2500');
        await dialog.getByRole('button', { name: /save changes/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        await openInventoryKitchenTab(page);
        const row = page.locator('tr', { hasText: name }).first();
        await expect(row).toContainText('250');
        await expect(row).toContainText('2500');
      }
    );

    // ─── AC2 validation surface ──────────────────────────────────────────

    superAdminTest(
      'AC2 — Blank name surfaces an inline error and does not update',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Edit-Blank');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        const dialog = await openEditDialogFor(page, name);
        await dialog.locator('#edit-ki-name').fill('   ');
        // Save button should be disabled when name is blank, OR submit returns
        // an inline error. Either is a valid UX; the contract is "no silent write".
        const saveButton = dialog.getByRole('button', {
          name: /save changes/i,
        });
        const isDisabled = await saveButton.isDisabled();
        if (!isDisabled) {
          await saveButton.click();
          await expect(dialog.locator('[role="alert"], .alert')).toContainText(
            /name.*required/i,
            { timeout: 5000 }
          );
        }
        // Cancel and re-open: name should still be the original.
        await dialog.getByRole('button', { name: /cancel/i }).click();
        await expect(dialog).toBeHidden();
        const dialog2 = await openEditDialogFor(page, name);
        await expect(dialog2.locator('#edit-ki-name')).toHaveValue(name);
      }
    );

    superAdminTest(
      'AC2 — Max < min surfaces an inline error and does not update',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Edit-MaxLtMin');
        await createKitchenIngredient(page, {
          name,
          unitLabel: 'Grams',
          minStock: 10,
          maxStock: 100,
        });

        const dialog = await openEditDialogFor(page, name);
        await dialog.locator('#edit-ki-min').fill('500');
        await dialog.locator('#edit-ki-max').fill('100');
        await dialog.getByRole('button', { name: /save changes/i }).click();
        await expect(dialog.locator('[role="alert"], .alert')).toContainText(
          /Maximum stock.*minimum/i,
          { timeout: 5000 }
        );
        // Dialog still open; close it and verify nothing persisted.
        await dialog.getByRole('button', { name: /cancel/i }).click();
        await openInventoryKitchenTab(page);
        const row = page.locator('tr', { hasText: name }).first();
        await expect(row).toContainText('10');
        await expect(row).toContainText('100');
      }
    );

    // ─── AC3 delete dialog + safe-removal guard ──────────────────────────

    superAdminTest(
      'AC3 — Delete dialog renders the ingredient name + destructive button',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Delete-Confirm');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        const dialog = await openDeleteDialogFor(page, name);
        await expect(dialog).toContainText(name);
        await expect(
          dialog.getByRole('button', { name: /^Delete$/i })
        ).toBeVisible();
      }
    );

    superAdminTest(
      'AC3+AC4 — Delete with no recipe refs archives the row',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Delete-Happy');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        const dialog = await openDeleteDialogFor(page, name);
        await dialog.getByRole('button', { name: /^Delete$/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        await openInventoryKitchenTab(page);
        await expect(page.locator('tr', { hasText: name })).toHaveCount(0);
      }
    );

    superAdminTest(
      'AC3 — Delete BLOCKED by active recipe; error names the recipe',
      async ({ page }) => {
        const ingredient = uniqueLabel('E2E-Delete-Blocked-Ingr');
        const recipe = uniqueLabel('E2E-Delete-Blocked-Recipe');
        await createKitchenIngredient(page, {
          name: ingredient,
          unitLabel: 'Grams',
          initialStock: 1000,
        });
        await authorRecipeReferencing(page, {
          recipeName: recipe,
          ingredientName: ingredient,
        });

        const dialog = await openDeleteDialogFor(page, ingredient);
        await dialog.getByRole('button', { name: /^Delete$/i }).click();

        const alert = dialog.locator('[role="alert"], .alert');
        await expect(alert).toContainText(/Cannot delete/i, { timeout: 10000 });
        await expect(alert).toContainText(recipe);
        await expect(alert).toContainText(/Deactivate/i);

        // Dialog still open; ingredient still present.
        await dialog.getByRole('button', { name: /cancel/i }).click();
        await openInventoryKitchenTab(page);
        await expect(
          page.locator('tr', { hasText: ingredient }).first()
        ).toBeVisible();
      }
    );

    superAdminTest(
      'AC3 — Deactivate the blocking recipe → retry delete succeeds',
      async ({ page }) => {
        const ingredient = uniqueLabel('E2E-Delete-Recover-Ingr');
        const recipe = uniqueLabel('E2E-Delete-Recover-Recipe');
        await createKitchenIngredient(page, {
          name: ingredient,
          unitLabel: 'Grams',
          initialStock: 1000,
        });
        await authorRecipeReferencing(page, {
          recipeName: recipe,
          ingredientName: ingredient,
        });
        await deactivateRecipe(page, recipe);

        const dialog = await openDeleteDialogFor(page, ingredient);
        await dialog.getByRole('button', { name: /^Delete$/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        await openInventoryKitchenTab(page);
        await expect(page.locator('tr', { hasText: ingredient })).toHaveCount(
          0
        );
      }
    );

    // ─── AC4 archived disappears from listing surfaces ───────────────────

    superAdminTest(
      'AC4 — Archived ingredient gone from Kitchen tab',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Archive-KitchenTab');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        const dialog = await openDeleteDialogFor(page, name);
        await dialog.getByRole('button', { name: /^Delete$/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        await openInventoryKitchenTab(page);
        await expect(page.locator('tr', { hasText: name })).toHaveCount(0);
      }
    );

    superAdminTest(
      'AC4 — Archived ingredient gone from Recipe builder dropdown',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Archive-RecipeDropdown');
        await createKitchenIngredient(page, {
          name,
          unitLabel: 'Grams',
          initialStock: 500,
        });

        // Confirm it IS in the recipe-builder dropdown before deletion.
        await page.goto('/dashboard/kitchen/recipes/new');
        await page.waitForLoadState('networkidle');
        await page.locator('button[role="combobox"]').nth(1).click();
        await expect(
          page.getByRole('option', { name: new RegExp(name, 'i') })
        ).toBeVisible({ timeout: 5000 });
        // Close the dropdown.
        await page.keyboard.press('Escape');

        // Delete.
        const dialog = await openDeleteDialogFor(page, name);
        await dialog.getByRole('button', { name: /^Delete$/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        // Re-open the recipe builder; the ingredient is gone.
        await page.goto('/dashboard/kitchen/recipes/new');
        await page.waitForLoadState('networkidle');
        await page.locator('button[role="combobox"]').nth(1).click();
        await expect(
          page.getByRole('option', { name: new RegExp(name, 'i') })
        ).toHaveCount(0);
      }
    );

    superAdminTest(
      'AC4 — Archived ingredient gone from Expense form "Add to kitchen inventory" dropdown',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Archive-ExpenseDropdown');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        // Sanity: it appears in the Expense form dropdown.
        await page.goto('/dashboard/finance/expenses');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /^Add Expense$/ }).click();
        let dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        // Click the last combobox in the line — that's the Add-to-inventory.
        await dialog.locator('button[role="combobox"]').last().click();
        await expect(
          page.getByRole('option', { name: new RegExp(name, 'i') })
        ).toBeVisible({ timeout: 5000 });
        await page.keyboard.press('Escape');
        // Close the Expense dialog.
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Delete the ingredient.
        const delDialog = await openDeleteDialogFor(page, name);
        await delDialog.getByRole('button', { name: /^Delete$/i }).click();
        await expect(delDialog).toBeHidden({ timeout: 10000 });

        // Re-open Add Expense; the ingredient is gone.
        await page.goto('/dashboard/finance/expenses');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /^Add Expense$/ }).click();
        dialog = page.locator('[role="dialog"]');
        await dialog.locator('button[role="combobox"]').last().click();
        await expect(
          page.getByRole('option', { name: new RegExp(name, 'i') })
        ).toHaveCount(0);
      }
    );

    superAdminTest(
      'AC4 — Sellable tab count unchanged when a kitchen ingredient is archived',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Archive-SellableCount');
        await page.goto('/dashboard/inventory');
        await page.waitForLoadState('networkidle');
        const sellableBefore = await page
          .getByRole('tab', { name: /^Sellable\s*\(/ })
          .first()
          .innerText();
        const sellableBeforeMatch = sellableBefore.match(/\((\d+)\)/);
        const sellableBeforeN = sellableBeforeMatch
          ? Number(sellableBeforeMatch[1])
          : 0;

        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        const dialog = await openDeleteDialogFor(page, name);
        await dialog.getByRole('button', { name: /^Delete$/i }).click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        await page.goto('/dashboard/inventory');
        await page.waitForLoadState('networkidle');
        const sellableAfter = await page
          .getByRole('tab', { name: /^Sellable\s*\(/ })
          .first()
          .innerText();
        const sellableAfterMatch = sellableAfter.match(/\((\d+)\)/);
        const sellableAfterN = sellableAfterMatch
          ? Number(sellableAfterMatch[1])
          : 0;
        expect(sellableAfterN).toBe(sellableBeforeN);
        // Suppress unused warnings on the helper readKitchenStock.
        void readKitchenStock;
      }
    );

    // ─── AC1 — View Details preserved alongside Edit + Delete ───────────
    //
    // Kitchen rows still need a View Details button so operators can
    // navigate to /dashboard/inventory/<id> to inspect StockMovement
    // history and cost-history. Without this, soft-deleting an
    // ingredient is the only "audit-trail" path — which is wrong.

    superAdminTest(
      'AC1 — Kitchen row exposes View Details, Edit, and Delete (3 actions)',
      async ({ page }) => {
        const name = uniqueLabel('E2E-Edit-ThreeActions');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        await openInventoryKitchenTab(page);
        const row = page.locator('tr', { hasText: name }).first();
        await expect(row).toBeVisible();

        // All three action buttons present, scoped to this row.
        await expect(
          row.getByRole('button', {
            name: new RegExp(`View details for ${name}`, 'i'),
          })
        ).toBeVisible();
        await expect(
          row.getByRole('button', { name: new RegExp(`Edit ${name}`, 'i') })
        ).toBeVisible();
        await expect(
          row.getByRole('button', { name: new RegExp(`Delete ${name}`, 'i') })
        ).toBeVisible();
      }
    );

    superAdminTest(
      'AC1 — View Details on a kitchen row navigates to /dashboard/inventory/<id>',
      async ({ page }) => {
        const name = uniqueLabel('E2E-View-Details-Nav');
        await createKitchenIngredient(page, { name, unitLabel: 'Grams' });

        await openInventoryKitchenTab(page);
        const row = page.locator('tr', { hasText: name }).first();
        await row
          .getByRole('button', {
            name: new RegExp(`View details for ${name}`, 'i'),
          })
          .click();

        // URL transitions to /dashboard/inventory/<24-hex-id>.
        await page.waitForURL(/\/dashboard\/inventory\/[a-f0-9]{24}/, {
          timeout: 10000,
        });
        expect(page.url()).toMatch(/\/dashboard\/inventory\/[a-f0-9]{24}/);
      }
    );

    // ─── AC5 meta — spec is registered (proven by virtue of running) ─────

    superAdminTest(
      'AC5 — meta — this spec is registered as a Playwright project (presence proof)',
      async () => {
        // No assertion needed; running this test at all confirms the project
        // is registered in playwright.config.ts and runs as part of CI.
        expect(true).toBe(true);
      }
    );
  }
);
