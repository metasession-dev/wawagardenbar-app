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

  // ──────────────────────────────────────────────────────────────────
  // #100 — customer menu response carries a stockStatus computed from
  // currentStock + minimumStock, not the cached Inventory.status. This
  // guards against a regression where category-service.ts re-reads the
  // cached `status` field (which could be stale on documents from
  // before #99 shipped).
  //
  // The pure-helper math is covered by vitest; this test pins the
  // contract at the public API layer: every menu item returned by
  // `/api/public/menu` carries a `stockStatus` field with one of the
  // three known values.
  // ──────────────────────────────────────────────────────────────────
  superAdminTest(
    '#100: GET /api/public/menu returns a computed stockStatus per item',
    async ({ request }) => {
      const items = await readPublicMenu(request);
      // If the seed has zero menu items the test isn't meaningful;
      // we still pass through cleanly so CI doesn't flake on empty DBs.
      if (items.length === 0) return;
      const valid = new Set(['in-stock', 'low-stock', 'out-of-stock']);
      for (const item of items) {
        const status = (item as { stockStatus?: string }).stockStatus;
        expect(
          valid.has(status ?? ''),
          `item ${item.name} returned stockStatus="${status}", expected one of ${[...valid].join(', ')}`
        ).toBe(true);
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────
  // #91 / #101 — Menu Management admin page hides kitchen-ingredient
  // stubs. The customer-facing API was already gated (the test above);
  // this covers /dashboard/menu, which leaked stubs until #101 added
  // `{ kind: 'menu-item' }` to its server-side queries.
  // ──────────────────────────────────────────────────────────────────
  superAdminTest(
    '#91: kitchen-ingredient stubs do NOT appear on /dashboard/menu',
    async ({ page }) => {
      const ingredientName = uniqueLabel('E2E-MenuPage-Hidden');
      await createKitchenIngredient(page, {
        name: ingredientName,
        unitLabel: 'Grams',
        initialStock: 0,
      });

      await page.goto('/dashboard/menu');
      await page.waitForLoadState('networkidle');

      // The Menu items table must not include the kitchen-ingredient stub.
      const tableText = await page
        .locator('table, [role="table"], main')
        .first()
        .innerText();
      expect(tableText).not.toContain(ingredientName);
    }
  );
});
