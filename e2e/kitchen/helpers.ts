import path from 'path';
import { test as base, expect, type Page } from '@playwright/test';

export const SUPER_ADMIN_FILE = path.join(
  __dirname,
  '../../.auth/super-admin.json'
);
export const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
export const CSR_FILE = path.join(__dirname, '../../.auth/csr.json');

export const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
export const adminTest = base.extend({ storageState: ADMIN_FILE });
export const csrTest = base.extend({ storageState: CSR_FILE });

/**
 * D11 — shared isAuthenticated guard so each spec skips cleanly when the
 * Playwright auth.setup couldn't establish a session (e.g. seeded admins
 * not present on the target environment).
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

/**
 * Per-test unique suffix so concurrent runs and accidental cleanup misses
 * don't collide. UAT/CI keep accumulating named test rows otherwise.
 */
export function uniqueLabel(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

/**
 * Create a kitchen-ingredient inventory row via the Add Kitchen Ingredient
 * dialog. Returns the chosen name so the caller can find the row later.
 *
 * The action is gated by super-admin OR inventoryManagement permission —
 * use the super-admin or admin storage states.
 */
export async function createKitchenIngredient(
  page: Page,
  opts: {
    name: string;
    /** Substring match against an option in the COGS dropdown. */
    category?: string;
    /** Substring match against an option in the Unit dropdown (e.g. 'Grams'). */
    unitLabel?: string;
    initialStock?: number;
    minStock?: number;
    maxStock?: number;
  }
): Promise<void> {
  await page.goto('/dashboard/inventory');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /^Kitchen/ }).click();
  await page.getByRole('button', { name: /add kitchen ingredient/i }).click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  await dialog.locator('#ki-name').fill(opts.name);

  // The dialog has two SelectTriggers, COGS first then Unit.
  const selects = dialog.locator('button[role="combobox"]');
  await selects.nth(0).click();
  const categoryToPick = opts.category ?? 'Meat/Protein';
  await page
    .getByRole('option', { name: new RegExp(categoryToPick, 'i') })
    .first()
    .click();

  await selects.nth(1).click();
  const unitToPick = opts.unitLabel ?? 'Grams';
  // ANCHOR the regex — default UoM registry orders `Kilograms (kg)`
  // BEFORE `Grams (g)`, and an unanchored /Grams/i pattern matches
  // "Kilograms" case-insensitively (since "kilograms" contains "grams").
  // `.first()` then picked Kilograms, so every test calling this with
  // `unitLabel: 'Grams'` silently created a **kg-unit** ingredient.
  // That's the actual root cause of all 4 #159 failures — what looked
  // like a kg→g conversion bug was test data being kg→kg (or g→kg).
  // Anchor with `^` so `^Grams` doesn't match `Kilograms`.
  await page
    .getByRole('option', { name: new RegExp(`^${unitToPick}\\b`, 'i') })
    .first()
    .click();

  if (opts.initialStock !== undefined) {
    await dialog.locator('#ki-current').fill(String(opts.initialStock));
  }
  if (opts.minStock !== undefined) {
    await dialog.locator('#ki-min').fill(String(opts.minStock));
  }
  if (opts.maxStock !== undefined) {
    await dialog.locator('#ki-max').fill(String(opts.maxStock));
  }

  await dialog.getByRole('button', { name: /^create ingredient/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Read the current stock for a kitchen-ingredient row by visible name.
 * Returns null if the row isn't on the current Kitchen tab page.
 */
export async function readKitchenStock(
  page: Page,
  ingredientName: string
): Promise<number | null> {
  await page.goto('/dashboard/inventory');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /^Kitchen/ }).click();
  const row = page.locator('tr', { hasText: ingredientName }).first();
  if ((await row.count()) === 0) return null;
  // `InventoryTable` (components/features/admin/inventory-table.tsx) renders
  // 8 columns: Name, Category, Current Stock, Locations, Min/Max, Stock
  // Level, Status, Actions. Current Stock is the 3rd TD (0-indexed: 2),
  // formatted as `{currentStock} {unit}` (e.g. `0 g`, `5000 g`).
  //
  // Earlier this helper read row.innerText() and ran
  // /\b(\d+(?:\.\d+)?)\b/ over the whole row — but `uniqueLabel(prefix)`
  // appends Date.now() to ingredient names (e.g.
  // `E2E-D10-Goat-1780242429276`), and that timestamp is the FIRST
  // numeric token in the row's text. The regex grabbed the timestamp
  // instead of the stock cell, making every `expect(stock).toBe(0)`
  // assertion fail with `Received: 1780242429276` (#159).
  //
  // Scope to the Current Stock cell directly, then parse the leading
  // number. Min/Max styling (`0/0`) and the trailing unit code are
  // handled by anchoring the regex to the start of the cell text.
  const stockCell = row.locator('td').nth(2);
  const text = (await stockCell.innerText()).trim();
  const match = text.match(/^\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]);
}
