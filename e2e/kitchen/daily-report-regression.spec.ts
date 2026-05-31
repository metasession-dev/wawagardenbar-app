/**
 * @requirement REQ-034 — D11 follow-up — Step 8 (DFR regression)
 *
 * Confirms REQ-034 production events do not corrupt the Daily Financial
 * Report. Two regression assertions:
 *
 *   1. The DFR page renders for super-admin with the Total Revenue card
 *      visible and a currency-formatted value.
 *   2. After running a production batch (which writes StockMovement +
 *      Production rows but NEVER an Order or Payment), the report's
 *      Total Revenue number is byte-identical to the value seen before
 *      the batch. AC14 in the test plan — production must not move
 *      revenue.
 *
 * The third Step-8 item (per-portion COGS uses weighted-average from
 * InventoryItemCostHistory) is intentionally NOT covered here: the
 * weighted-average math is fully unit-tested by
 * `__tests__/lib/expense-inventory-link.test.ts` (computeWeightedAverageCost,
 * 5 tests) and `__tests__/services/expense-inventory-link.test.ts`, and
 * the DFR client component does not render the weighted-average as a
 * labelled cell. A brittle UI assertion would test markup, not math —
 * so the unit-test surface is the load-bearing gate.
 */
import { expect, type Page } from '@playwright/test';
import {
  superAdminTest,
  isAuthenticated,
  uniqueLabel,
  createKitchenIngredient,
} from './helpers';

async function gotoDailyReport(page: Page): Promise<void> {
  await page.goto('/dashboard/reports/daily');
  await page.waitForLoadState('networkidle');
  // Page renders an h2 even before data finishes loading; assertion below
  // distinguishes the loaded vs loading states.
  await expect(
    page.locator('h2', { hasText: /Daily Financial Report/i })
  ).toBeVisible();
}

async function readTotalRevenueText(page: Page): Promise<string> {
  // The Total Revenue row in components/features/reports/profit-section.tsx
  // renders as a flex row of two spans:
  //
  //   <div class="flex justify-between items-center py-2">
  //     <span class="font-semibold">Total Revenue</span>
  //     <span class="text-lg font-bold text-primary">{formatCurrency(...)}</span>
  //   </div>
  //
  // The previous helper looked for the label as a `div`/`h3` and the value as
  // a `div.text-2xl.font-bold` — neither matches the actual markup, so the
  // helper returned ₦0.00 / failed visibility every time. Find the label by
  // exact text (excluding the colon-suffixed 'Total Revenue:' label in
  // revenue-section.tsx) and read its sibling span.
  const label = page
    .getByText(/^\s*Total Revenue\s*$/)
    .filter({ hasNotText: ':' })
    .first();
  await expect(label).toBeVisible({ timeout: 10000 });
  const value = label.locator('xpath=following-sibling::span[1]');
  await expect(value).toBeVisible();
  return (await value.innerText()).trim();
}

async function authorRecipeViaUI(
  page: Page,
  opts: { recipeName: string; ingredientName: string; quantity: number }
) {
  await page.goto('/dashboard/kitchen/recipes/new');
  await page.waitForLoadState('networkidle');
  await page.locator('#recipe-name').fill(opts.recipeName);
  const combos = page.locator('button[role="combobox"]');
  // Target menu item — pick first.
  await combos.nth(0).click();
  await page.getByRole('option').first().click();
  // Ingredient.
  await combos.nth(1).click();
  await page
    .getByRole('option', { name: new RegExp(opts.ingredientName, 'i') })
    .first()
    .click();
  await page.locator('input[type="number"]').nth(1).fill(String(opts.quantity));
  // Unit defaults to ingredient's unit (Grams); leave as-is.
  await page.getByRole('button', { name: /create recipe/i }).click();
  await page.waitForURL(/\/dashboard\/kitchen\/recipes(?!\/new)/, {
    timeout: 10000,
  });
}

async function runOneBatch(page: Page, recipeName: string) {
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
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

superAdminTest.describe(
  'REQ-034 D11 — Step 8: DFR regression under production events',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'super-admin auth missing');
      }
    });

    superAdminTest(
      'DFR renders with a Total Revenue card and a currency-formatted value',
      async ({ page }) => {
        await gotoDailyReport(page);
        const text = await readTotalRevenueText(page);
        // Currency formatter prefixes with ₦; allow for ₦0.00 days
        // (no orders yet on a fresh UAT).
        expect(text).toMatch(/^₦\s*-?\d/);
      }
    );

    superAdminTest(
      'AC14 — running a production batch does NOT move Total Revenue',
      async ({ page }) => {
        const ingredientName = uniqueLabel('E2E-DFR-Ingr');
        const recipeName = uniqueLabel('E2E-DFR-Recipe');

        // Seed ingredient with enough stock to deduct without preflight failing.
        await createKitchenIngredient(page, {
          name: ingredientName,
          unitLabel: 'Grams',
          initialStock: 1000,
        });
        await authorRecipeViaUI(page, {
          recipeName,
          ingredientName,
          quantity: 100,
        });

        await gotoDailyReport(page);
        const revenueBefore = await readTotalRevenueText(page);

        await runOneBatch(page, recipeName);

        // Reload DFR (force-fresh — `force-dynamic` page should not cache).
        await gotoDailyReport(page);
        const revenueAfter = await readTotalRevenueText(page);

        expect(
          revenueAfter,
          'Production batch must not move Total Revenue (AC14)'
        ).toBe(revenueBefore);
      }
    );
  }
);
