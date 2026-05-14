/**
 * @requirement REQ-034 — D11 — Step 3
 *
 * Inventory dashboard tab split. Sellable tab shows kind:menu-item rows;
 * Kitchen tab shows kind:kitchen-ingredient rows. Counts in the tab
 * labels match the rows rendered. Adding a kitchen ingredient bumps
 * the Kitchen count by 1 without affecting Sellable.
 */
import { expect } from '@playwright/test';
import {
  superAdminTest,
  isAuthenticated,
  uniqueLabel,
  createKitchenIngredient,
} from './helpers';

async function readTabCount(
  page: import('@playwright/test').Page,
  label: 'Sellable' | 'Kitchen'
): Promise<number> {
  const text = await page
    .getByRole('tab', { name: new RegExp(`^${label}\\s*\\(`, 'i') })
    .first()
    .innerText();
  const match = text.match(/\((\d+)\)/);
  return match ? Number(match[1]) : 0;
}

superAdminTest.describe('REQ-034 D11 — Step 3: inventory tabs', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    'tabs render with non-empty counts and a Kitchen tab is present',
    async ({ page }) => {
      await page.goto('/dashboard/inventory');
      await page.waitForLoadState('networkidle');
      const sellable = page.getByRole('tab', { name: /^Sellable\s*\(/ });
      const kitchen = page.getByRole('tab', { name: /^Kitchen\s*\(/ });
      await expect(sellable).toBeVisible();
      await expect(kitchen).toBeVisible();
    }
  );

  superAdminTest(
    'adding a kitchen ingredient increments only the Kitchen tab count',
    async ({ page }) => {
      await page.goto('/dashboard/inventory');
      await page.waitForLoadState('networkidle');
      const sellableBefore = await readTabCount(page, 'Sellable');
      const kitchenBefore = await readTabCount(page, 'Kitchen');

      await createKitchenIngredient(page, {
        name: uniqueLabel('E2E-TabBump'),
        unitLabel: 'Grams',
      });

      const sellableAfter = await readTabCount(page, 'Sellable');
      const kitchenAfter = await readTabCount(page, 'Kitchen');
      expect(sellableAfter).toBe(sellableBefore);
      expect(kitchenAfter).toBe(kitchenBefore + 1);
    }
  );
});
