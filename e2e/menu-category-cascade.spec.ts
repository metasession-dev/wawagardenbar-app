/**
 * @requirement REQ-081 - Main-category to sub-category cascade across express
 * order, menu management, and sellable inventory
 * @requirement REQ-082 - Progressive category display with grouped items
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { superAdminTest, isAuthenticated } from './kitchen/helpers';

async function checkoutCount(page: Page): Promise<number> {
  const button = page.getByRole('button', { name: /Checkout \(/i });
  const text = (await button.textContent()) ?? '';
  const match = text.match(/Checkout \((\d+)\)/i);
  return match ? Number(match[1]) : 0;
}

async function expectVisibleRowsToMatch(
  rowLocator: Locator,
  expectedText: string
) {
  const rows = await rowLocator.allTextContents();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.toLowerCase()).toContain(expectedText.toLowerCase());
  }
}

async function findMainCategoryWithContent(
  page: Page,
  hasContent: (page: Page) => Promise<boolean>
): Promise<string | null> {
  const mainButtons = page
    .getByTestId('category-cascade-main-options')
    .getByRole('button');
  const mainCount = await mainButtons.count();

  for (let mainIndex = 0; mainIndex < mainCount; mainIndex += 1) {
    const mainLabel = (
      (await mainButtons.nth(mainIndex).textContent()) ?? ''
    ).trim();
    await mainButtons.nth(mainIndex).click();
    await page.waitForTimeout(300);

    if (await hasContent(page)) {
      return mainLabel;
    }
  }

  return null;
}

superAdminTest.describe('REQ-082: progressive category display', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    'express order shows items on landing grouped by category, search filters items, and cart persists across category changes',
    async ({ page }, testInfo) => {
      await page.goto('/dashboard/orders/express/create-order');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('category-cascade')).toBeVisible();
      await expect(page.getByTestId('category-cascade-search')).toBeEnabled();
      await expect(
        page.getByTestId('category-cascade-main-options')
      ).toBeVisible();
      await expect(
        page.getByTestId('category-cascade-selection')
      ).toBeVisible();

      await page.waitForTimeout(500);
      const itemCount = await page.locator('[aria-disabled]').count();
      if (itemCount === 0) {
        testInfo.skip(true, 'No express-order items available on landing');
        return;
      }

      const firstItemName = (
        (await page
          .locator('[aria-disabled] p.font-medium')
          .first()
          .textContent()) ?? ''
      ).trim();
      expect(firstItemName).not.toBe('');

      await page.getByTestId('category-cascade-search').fill(firstItemName);
      await expect(page.locator('[aria-disabled]').first()).toBeVisible();
      await expectVisibleRowsToMatch(
        page.locator('[aria-disabled]'),
        firstItemName
      );

      await expect(page.locator('[aria-disabled="false"]').first()).toBeVisible();
      await page.locator('[aria-disabled="false"]').first().click();
      const firstCheckoutCount = await checkoutCount(page);
      expect(firstCheckoutCount).toBeGreaterThan(0);

      await page.getByTestId('category-cascade-search').fill('');
      await expect(page.locator('[aria-disabled]').first()).toBeVisible();

      const secondMain = await findMainCategoryWithContent(
        page,
        async (currentPage) =>
          (await currentPage.locator('[aria-disabled="false"]').count()) > 0
      );
      if (!secondMain) {
        testInfo.skip(
          true,
          'A second main category with available express-order items is required'
        );
        return;
      }

      await expect(page.locator('[aria-disabled="false"]').first()).toBeVisible();
      await page.locator('[aria-disabled="false"]').first().click();
      const secondCheckoutCount = await checkoutCount(page);
      expect(secondCheckoutCount).toBeGreaterThan(firstCheckoutCount);
    }
  );

  superAdminTest(
    'menu management shows items on landing grouped by category and supports search',
    async ({ page }, testInfo) => {
      await page.goto('/dashboard/menu');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('category-cascade')).toBeVisible();
      await expect(page.getByTestId('category-cascade-search')).toBeEnabled();
      await expect(
        page.getByTestId('category-cascade-main-options')
      ).toBeVisible();

      await page.waitForTimeout(500);
      const rowCount = await page.locator('tbody tr').count();
      if (rowCount === 0) {
        testInfo.skip(true, 'No menu items available on landing');
        return;
      }

      const firstItemName = (
        (await page
          .locator('tbody tr')
          .first()
          .locator('td')
          .nth(1)
          .locator('p')
          .first()
          .textContent()) ?? ''
      ).trim();
      expect(firstItemName).not.toBe('');

      await page.getByTestId('category-cascade-search').fill(firstItemName);
      await page.waitForTimeout(250);
      await expectVisibleRowsToMatch(page.locator('tbody tr'), firstItemName);

      await page.getByTestId('category-cascade-search').fill('');
      await page.waitForTimeout(250);

      const mainButtons = page
        .getByTestId('category-cascade-main-options')
        .getByRole('button');
      if ((await mainButtons.count()) > 0) {
        await mainButtons.first().click();
        await page.waitForTimeout(250);
        await expect(
          page.getByTestId('category-cascade-sub-options')
        ).toBeVisible();
      }
    }
  );

  superAdminTest(
    'sellable inventory shows items on landing and search filters items',
    async ({ page }, testInfo) => {
      await page.goto('/dashboard/inventory');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('category-cascade')).toBeVisible();
      await expect(page.getByTestId('category-cascade-search')).toBeEnabled();

      await page.waitForTimeout(500);
      const rowCount = await page.locator('tbody tr').count();
      if (rowCount === 0) {
        testInfo.skip(true, 'No sellable inventory items available on landing');
        return;
      }

      const firstItemName = (
        (await page
          .locator('tbody tr')
          .first()
          .locator('td')
          .first()
          .textContent()) ?? ''
      ).trim();
      expect(firstItemName).not.toBe('');

      await page.getByTestId('category-cascade-search').fill(firstItemName);
      await page.waitForTimeout(250);
      await expectVisibleRowsToMatch(page.locator('tbody tr'), firstItemName);
    }
  );
});
