/**
 * @requirement REQ-034 — D11 — Step 4 (incl. D10 defence)
 *
 * Expense → Inventory link side effects with unit conversion. The D10
 * regression specifically: an expense entered in `kg` linked to an
 * inventory row stored in `g` must increment currentStock by 1000× the
 * entered quantity, not by the raw value.
 *
 * Full flow exercised:
 *   1. Seed a kitchen-ingredient inventory in grams (currentStock = 0).
 *   2. Add Expense (Direct Cost, qty 5, unit kg, linked to the ingredient).
 *      The expense lands as a pending group.
 *   3. Transfer the pending group to confirmed expenses — this fires the
 *      inventory link side effects (StockMovement insert + $inc).
 *   4. Verify the inventory's currentStock now reads 5000 g (D10 fix).
 *      Pre-D10 behaviour would have given 5 g and the test would fail.
 *
 * If the application changes the expense-create / transfer UI in a way
 * that breaks the selectors, the test fails loudly — that's the point:
 * the D10 bug shipped because no test ever exercised this path.
 */
import { expect } from '@playwright/test';
import {
  superAdminTest,
  isAuthenticated,
  uniqueLabel,
  createKitchenIngredient,
  readKitchenStock,
} from './helpers';

superAdminTest.describe(
  'REQ-034 D11 — Step 4 / D10: expense link unit conversion',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'super-admin auth missing');
      }
    });

    superAdminTest(
      '5 kg expense → 5000 g $inc when inventory unit is g (D10 regression)',
      async ({ page }) => {
        const ingredientName = uniqueLabel('E2E-D10-Goat');

        // ── 1. Seed kitchen ingredient in grams, starting at 0.
        await createKitchenIngredient(page, {
          name: ingredientName,
          unitLabel: 'Grams',
          initialStock: 0,
        });
        expect(await readKitchenStock(page, ingredientName)).toBe(0);

        // ── 2. Open Add Expense dialog on /dashboard/finance/expenses.
        await page.goto('/dashboard/finance/expenses');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /^Add Expense$/ }).click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Direct Cost is the default expenseType — no change needed.
        // Pick a category (any will do for the test; use Meat/Protein).
        const categoryTrigger = dialog
          .locator('button[role="combobox"]')
          .nth(1); // 0 = Type, 1 = Category, then per row Unit, etc.
        await categoryTrigger.click();
        await page
          .getByRole('option', { name: /Meat\/Protein/i })
          .first()
          .click();

        // Description.
        await dialog
          .locator('input[name="items.0.description"]')
          .fill(`E2E expense for ${ingredientName}`);

        // Quantity = 5.
        await dialog.locator('input[name="items.0.quantity"]').fill('5');

        // Unit = kg.
        const unitTrigger = dialog.locator('button[role="combobox"]').nth(2);
        await unitTrigger.click();
        await page
          .getByRole('option', { name: /Kilograms/i })
          .first()
          .click();

        // Unit cost (any positive number to clear validation).
        await dialog.locator('input[name="items.0.unitCost"]').fill('200');

        // Link to inventory — the "Add to inventory (optional)" Select renders
        // last on a direct-cost line. Pick by visible ingredient name.
        const linkTrigger = dialog.locator('button[role="combobox"]').last();
        await linkTrigger.click();
        await page
          .getByRole('option', { name: new RegExp(ingredientName, 'i') })
          .first()
          .click();

        // Submit the expense group → moves to pending.
        await dialog
          .getByRole('button', { name: /save|submit|add$|^create/i })
          .last()
          .click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        // ── 3. Approve, then Transfer pending group to confirmed expenses.
        // `pending-expense-group-list.tsx` (GroupRow) gates Approve on
        // `group.status === 'pending'` and Transfer on
        // `group.status === 'approved'` — submission lands the group in
        // 'pending', so we have to Approve it first before Transfer
        // renders. (Earlier #159 failure traced to this missing step.)
        //
        // Note: we can't filter by ingredientName here — GroupRow's
        // collapsed header shows only date / type / item-count; the item
        // description (which carries the ingredient name) is hidden until
        // the row is expanded. Each test creates one fresh pending group
        // and the list is time-sorted newest-first, so `.first()` picks
        // our group.
        await page.goto('/dashboard/finance/expenses/pending');
        await page.waitForLoadState('networkidle');
        // Approve the (most recent) group — Approve button is only shown
        // while status === 'pending' (and to super-admins; test runs
        // as super-admin).
        const approveButton = page
          .getByRole('button', { name: /^Approve$/i })
          .first();
        await expect(approveButton).toBeVisible({ timeout: 5000 });
        await approveButton.click();
        await page.waitForLoadState('networkidle');
        // Trigger the transfer for the now-approved group. UI exposes a
        // "Transfer" action on the group; the bulk-select / single-action
        // paths both work.
        const transferButton = page
          .getByRole('button', { name: /^Transfer/i })
          .first();
        await expect(transferButton).toBeVisible({ timeout: 5000 });
        await transferButton.click();
        // Confirmation dialog. The Confirm Transfer button is
        // `disabled={!transferReference.trim()}` per
        // `components/features/finance/transfer-confirmation-dialog.tsx`,
        // so fill the required Transfer Reference (#transferRef) before
        // clicking.
        const confirmDialog = page.locator('[role="dialog"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
        await confirmDialog
          .locator('#transferRef')
          .fill(`E2E-TRF-${Date.now()}`);
        await confirmDialog
          .getByRole('button', { name: /^Confirm Transfer$/i })
          .click();
        await expect(confirmDialog).toBeHidden({ timeout: 10000 });
        await page.waitForLoadState('networkidle');

        // ── 4. Verify currentStock = 5000 g (the D10 fix). Pre-D10 = 5.
        const stockAfter = await readKitchenStock(page, ingredientName);
        expect(
          stockAfter,
          'D10: 5 kg expense should add 5000 g to inventory'
        ).toBe(5000);
      }
    );

    superAdminTest(
      'identity case: 100 g expense → 100 g $inc when inventory unit also g',
      async ({ page }) => {
        const ingredientName = uniqueLabel('E2E-D10-Identity');
        await createKitchenIngredient(page, {
          name: ingredientName,
          unitLabel: 'Grams',
          initialStock: 0,
        });

        await page.goto('/dashboard/finance/expenses');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /^Add Expense$/ }).click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Category
        await dialog.locator('button[role="combobox"]').nth(1).click();
        await page
          .getByRole('option', { name: /Meat\/Protein/i })
          .first()
          .click();
        // Description / qty / unit / cost
        await dialog
          .locator('input[name="items.0.description"]')
          .fill(`E2E identity expense for ${ingredientName}`);
        await dialog.locator('input[name="items.0.quantity"]').fill('100');
        await dialog.locator('button[role="combobox"]').nth(2).click();
        await page
          .getByRole('option', { name: /^Grams\b/i })
          .first()
          .click();
        await dialog.locator('input[name="items.0.unitCost"]').fill('5');
        // Link to inventory.
        await dialog.locator('button[role="combobox"]').last().click();
        await page
          .getByRole('option', { name: new RegExp(ingredientName, 'i') })
          .first()
          .click();
        // Save.
        await dialog
          .getByRole('button', { name: /save|submit|add$|^create/i })
          .last()
          .click();
        await expect(dialog).toBeHidden({ timeout: 10000 });

        // Approve, then Transfer. Same locator strategy as the 5kg test
        // above — pick the most recent (top-most) pending group by
        // `.first()` rather than filtering on ingredientName (the
        // GroupRow's collapsed header doesn't render item descriptions).
        await page.goto('/dashboard/finance/expenses/pending');
        await page.waitForLoadState('networkidle');
        const approveButton = page
          .getByRole('button', { name: /^Approve$/i })
          .first();
        await expect(approveButton).toBeVisible({ timeout: 5000 });
        await approveButton.click();
        await page.waitForLoadState('networkidle');
        const transferButton = page
          .getByRole('button', { name: /^Transfer/i })
          .first();
        await expect(transferButton).toBeVisible({ timeout: 5000 });
        await transferButton.click();
        // Confirmation dialog — same Transfer Reference gate as the 5kg test
        // above.
        const confirmDialog = page.locator('[role="dialog"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
        await confirmDialog
          .locator('#transferRef')
          .fill(`E2E-TRF-${Date.now()}`);
        await confirmDialog
          .getByRole('button', { name: /^Confirm Transfer$/i })
          .click();
        await expect(confirmDialog).toBeHidden({ timeout: 10000 });
        await page.waitForLoadState('networkidle');

        expect(await readKitchenStock(page, ingredientName)).toBe(100);
      }
    );

    superAdminTest(
      'Add to inventory dropdown is hidden on non-direct-cost expense lines (AC5)',
      async ({ page }) => {
        await page.goto('/dashboard/finance/expenses');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /^Add Expense$/ }).click();
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible();
        // Flip Type → Operating Expense.
        await dialog.locator('button[role="combobox"]').nth(0).click();
        await page
          .getByRole('option', { name: /Operating Expense/i })
          .first()
          .click();
        // "Add to inventory" label must not be rendered for operating expenses.
        await expect(
          dialog.locator('label', { hasText: /Add to inventory/i })
        ).toHaveCount(0);
      }
    );
  }
);
