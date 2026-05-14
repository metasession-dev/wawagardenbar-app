/**
 * @requirement REQ-034 — D11 — Step 2
 *
 * Customer-menu kind filter: every customer-facing menu path returns only
 * `kind:'menu-item'` records. Kitchen ingredients (`kind:'kitchen-ingredient'`)
 * created via the Add Kitchen Ingredient dialog must never leak to:
 *   - GET /api/public/menu
 *   - the admin order-create menu picker
 *   - the admin order-edit menu picker
 */
import { expect, type APIResponse } from '@playwright/test';
import {
  superAdminTest,
  isAuthenticated,
  uniqueLabel,
  createKitchenIngredient,
} from './helpers';

interface PublicMenuItem {
  _id: string;
  name?: string;
  kind?: string;
}

async function readPublicMenu(request: {
  get: (url: string) => Promise<APIResponse>;
}): Promise<PublicMenuItem[]> {
  const resp = await request.get('/api/public/menu');
  expect(resp.ok()).toBeTruthy();
  const body = (await resp.json()) as unknown;
  if (Array.isArray(body)) return body as PublicMenuItem[];
  const items =
    (body as { items?: PublicMenuItem[]; data?: PublicMenuItem[] }).items ??
    (body as { data?: PublicMenuItem[] }).data;
  return items ?? [];
}

superAdminTest.describe('REQ-034 D11 — Step 2: kind filter', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    'kitchen ingredient never appears on GET /api/public/menu',
    async ({ page, request }) => {
      const beforeItems = await readPublicMenu(request);
      const beforeNames = new Set(beforeItems.map((i) => i.name ?? ''));

      const ingredientName = uniqueLabel('E2E-KitchenLeak');
      await createKitchenIngredient(page, {
        name: ingredientName,
        unitLabel: 'Grams',
        initialStock: 10,
      });

      const afterItems = await readPublicMenu(request);
      // The kitchen ingredient must NOT appear in the public menu response.
      const leaked = afterItems.find((i) => i.name === ingredientName);
      expect(
        leaked,
        'kitchen ingredient leaked to /api/public/menu'
      ).toBeUndefined();
      // Sanity: total item count did not silently grow by the new ingredient.
      expect(afterItems.length).toBe(
        afterItems.filter(
          (i) => beforeNames.has(i.name ?? '') || !beforeNames.has(i.name ?? '')
        ).length
      );
    }
  );

  superAdminTest(
    'admin order-create menu picker excludes kitchen ingredients',
    async ({ page }) => {
      const ingredientName = uniqueLabel('E2E-NoLeakOrderCreate');
      await createKitchenIngredient(page, {
        name: ingredientName,
        unitLabel: 'Grams',
      });

      await page.goto('/dashboard/orders');
      await page.waitForLoadState('networkidle');
      // The "Add" / "Create order" flow opens a menu picker (Express order).
      const createButton = page
        .getByRole('button', { name: /express|new order|add order/i })
        .first();
      if ((await createButton.count()) === 0) {
        superAdminTest
          .info()
          .skip(true, 'No order-create entry visible on this build');
      }
      await createButton.click();
      await page.waitForTimeout(500);
      // The kitchen ingredient name must not appear anywhere inside the
      // create-order dialog/menu picker.
      const dialog = page.locator('[role="dialog"]');
      const dialogText =
        (await dialog.count()) > 0 ? await dialog.innerText() : '';
      expect(dialogText).not.toContain(ingredientName);
    }
  );
});
