/**
 * E2E coverage for #104 — bidirectional auto-derive on the expense line
 * {qty, unitCost, totalCost} triple.
 *
 * Drives the Add Expense dialog at /dashboard/finance/expenses and asserts
 * that any two of the three fields fill the third correctly. Also covers
 * the divide-by-zero hint (AC5) and the override-claims-field rule (AC4).
 *
 * The pure helper math is exhaustively covered by vitest
 * (__tests__/lib/expense-line-derivation.test.ts, 17 cases). This spec
 * verifies the UI wiring: react-hook-form setValue actually lands in the
 * displayed input, edit-order tracking persists across keystrokes, and
 * the aria-live hint surfaces.
 */
import { expect, type Page, type Locator } from '@playwright/test';
import { superAdminTest, isAuthenticated } from '../kitchen/helpers';

async function openAddExpenseDialog(page: Page): Promise<Locator> {
  await page.goto('/dashboard/finance/expenses');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /^Add Expense$/ }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function readNumber(input: Locator): Promise<number> {
  const v = await input.inputValue();
  return v === '' ? 0 : Number(v);
}

superAdminTest.describe('#104 — expense line auto-derive', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    'AC1: qty + unitCost entered → totalCost auto-fills (qty × unit)',
    async ({ page }) => {
      const dialog = await openAddExpenseDialog(page);
      const qty = dialog.locator('input[name="items.0.quantity"]');
      const unit = dialog.locator('input[name="items.0.unitCost"]');
      const total = dialog.locator('input[name="items.0.totalCost"]');

      await qty.fill('12');
      await unit.fill('4.50');
      // RHF setValue is synchronous but the rendered <Input value> needs a
      // microtask for the controlled-component re-render to land.
      await expect.poll(() => readNumber(total)).toBe(54);
    }
  );

  superAdminTest(
    'AC2: qty + totalCost entered → unitCost auto-fills (total ÷ qty, 4dp)',
    async ({ page }) => {
      const dialog = await openAddExpenseDialog(page);
      const qty = dialog.locator('input[name="items.0.quantity"]');
      const unit = dialog.locator('input[name="items.0.unitCost"]');
      const total = dialog.locator('input[name="items.0.totalCost"]');

      await qty.fill('12');
      await total.fill('54');
      await expect.poll(() => readNumber(unit)).toBe(4.5);
    }
  );

  superAdminTest(
    'AC3: unitCost + totalCost entered → quantity auto-fills (total ÷ unit)',
    async ({ page }) => {
      const dialog = await openAddExpenseDialog(page);
      const qty = dialog.locator('input[name="items.0.quantity"]');
      const unit = dialog.locator('input[name="items.0.unitCost"]');
      const total = dialog.locator('input[name="items.0.totalCost"]');

      // Default qty is 1 (from makeDefaultItem); clear it so the derive
      // ordering doesn't treat it as the most recent edit.
      await qty.fill('0');
      await unit.fill('4.50');
      await total.fill('54');
      await expect.poll(() => readNumber(qty)).toBe(12);
    }
  );

  superAdminTest(
    'AC3 spice-mix case: unit=£0.0825/g, total=£41.25 → qty=500g',
    async ({ page }) => {
      const dialog = await openAddExpenseDialog(page);
      const qty = dialog.locator('input[name="items.0.quantity"]');
      const unit = dialog.locator('input[name="items.0.unitCost"]');
      const total = dialog.locator('input[name="items.0.totalCost"]');

      await qty.fill('0');
      await unit.fill('0.0825');
      await total.fill('41.25');
      await expect.poll(() => readNumber(qty)).toBe(500);
    }
  );

  superAdminTest(
    'AC4: editing the auto-filled field claims it; oldest becomes target',
    async ({ page }) => {
      const dialog = await openAddExpenseDialog(page);
      const qty = dialog.locator('input[name="items.0.quantity"]');
      const unit = dialog.locator('input[name="items.0.unitCost"]');
      const total = dialog.locator('input[name="items.0.totalCost"]');

      // Round 1: qty + unit → total derives to 54.
      await qty.fill('12');
      await unit.fill('4.50');
      await expect.poll(() => readNumber(total)).toBe(54);

      // Round 2: operator overrides total to 60 → next derive should
      // recompute qty (oldest), not unit cost.
      await total.fill('60');
      // qty = 60 / 4.5 = 13.3333 (4dp).
      await expect.poll(() => readNumber(qty)).toBe(13.3333);
      // Unit cost stays where the operator left it.
      await expect.poll(() => readNumber(unit)).toBe(4.5);
    }
  );

  superAdminTest(
    'AC5: qty = 0 with total entered → no NaN, aria-live hint shown',
    async ({ page }) => {
      const dialog = await openAddExpenseDialog(page);
      const qty = dialog.locator('input[name="items.0.quantity"]');
      const unit = dialog.locator('input[name="items.0.unitCost"]');
      const total = dialog.locator('input[name="items.0.totalCost"]');

      await qty.fill('0');
      await total.fill('54');
      // Unit cost should not have been auto-filled (would be div by zero).
      await expect.poll(() => readNumber(unit)).toBe(0);
      // Hint surfaces via aria-live="polite" element.
      await expect(
        dialog.locator('[role="status"]', { hasText: /quantity above 0/i })
      ).toBeVisible();
    }
  );
});
