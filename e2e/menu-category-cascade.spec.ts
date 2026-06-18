/**
 * @requirement REQ-081 - Main-category to sub-category cascade across express
 * order, menu management, and sellable inventory
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { superAdminTest, isAuthenticated } from './kitchen/helpers';

interface CategoryPath {
  mainIndex: number;
  mainLabel: string;
  subLabel: string;
}

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

async function findPathWithContent(
  page: Page,
  hasContent: (page: Page) => Promise<boolean>,
  skipMainIndex?: number
): Promise<CategoryPath | null> {
  const mainButtons = page
    .getByTestId('category-cascade-main-options')
    .getByRole('button');
  const mainCount = await mainButtons.count();

  for (let mainIndex = 0; mainIndex < mainCount; mainIndex += 1) {
    if (mainIndex === skipMainIndex) continue;

    const mainLabel = (
      (await mainButtons.nth(mainIndex).textContent()) ?? ''
    ).trim();
    await mainButtons.nth(mainIndex).click();

    const subButtons = page
      .getByTestId('category-cascade-sub-options')
      .getByRole('button');
    const subCount = await subButtons.count();

    for (let subIndex = 0; subIndex < subCount; subIndex += 1) {
      const subLabel = (
        (await subButtons.nth(subIndex).textContent()) ?? ''
      ).trim();
      await subButtons.nth(subIndex).click();
      await page.waitForTimeout(250);

      if (await hasContent(page)) {
        return { mainIndex, mainLabel, subLabel };
      }

      await page.getByRole('button', { name: 'Sub Categories' }).click();
    }

    await page.getByRole('button', { name: 'Main Categories' }).click();
  }

  return null;
}

superAdminTest.describe('REQ-081: category cascade', () => {
  superAdminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'super-admin auth missing');
    }
  });

  superAdminTest(
    'express order starts at main categories, keeps search enabled, and preserves cart across main-category changes',
    async ({ page }, testInfo) => {
      await page.goto('/dashboard/orders/express/create-order');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('category-cascade')).toBeVisible();
      await expect(
        page.getByText('Choose a main category to continue.')
      ).toBeVisible();
      await expect(page.getByTestId('category-cascade-search')).toBeEnabled();

      const firstPath = await findPathWithContent(
        page,
        async (currentPage) =>
          (await currentPage.locator('[aria-disabled="false"]').count()) > 0
      );
      if (!firstPath) {
        testInfo.skip(
          true,
          'No main/sub-category path with available express-order items found'
        );
        return;
      }

      await expect(
        page.getByTestId('category-cascade-selection')
      ).toBeVisible();

      const firstItemName = (
        (await page
          .locator('[aria-disabled] p.font-medium')
          .first()
          .textContent()) ?? ''
      ).trim();
      expect(firstItemName).not.toBe('');

      await page.getByTestId('category-cascade-search').fill(firstItemName);
      await page.waitForTimeout(400);
      await expectVisibleRowsToMatch(
        page.locator('[aria-disabled]'),
        firstItemName
      );

      await page.locator('[aria-disabled="false"]').first().click();
      const firstCheckoutCount = await checkoutCount(page);
      expect(firstCheckoutCount).toBeGreaterThan(0);

      await page.getByRole('button', { name: 'Sub Categories' }).click();
      await expect(
        page.getByTestId('category-cascade-sub-options')
      ).toBeVisible();
      await page.getByRole('button', { name: 'Main Categories' }).click();
      await expect(
        page.getByTestId('category-cascade-main-options')
      ).toBeVisible();

      const secondPath = await findPathWithContent(
        page,
        async (currentPage) =>
          (await currentPage.locator('[aria-disabled="false"]').count()) > 0,
        firstPath.mainIndex
      );
      if (!secondPath) {
        testInfo.skip(
          true,
          'A second main category with available express-order items is required for the cross-main assertion'
        );
        return;
      }

      expect(secondPath.mainIndex).not.toBe(firstPath.mainIndex);
      expect(secondPath.mainLabel).not.toBe(firstPath.mainLabel);

      await page.locator('[aria-disabled="false"]').first().click();
      const secondCheckoutCount = await checkoutCount(page);
      expect(secondCheckoutCount).toBeGreaterThan(firstCheckoutCount);
    }
  );

  superAdminTest(
    'menu management requires main then sub-category selection before showing rows and supports search',
    async ({ page }, testInfo) => {
      await page.goto('/dashboard/menu');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('category-cascade')).toBeVisible();
      await expect(
        page.getByText('Select a main category to start browsing menu items.')
      ).toBeVisible();
      await expect(page.getByTestId('category-cascade-search')).toBeEnabled();
      await expect(
        page.getByTestId('category-cascade-main-options')
      ).toBeVisible();

      const path = await findPathWithContent(page, async (currentPage) => {
        const firstRow = currentPage.locator('tbody tr').first();
        if ((await firstRow.count()) === 0) return false;
        const text = ((await firstRow.textContent()) ?? '').trim();
        return text !== 'No menu items found';
      });

      if (!path) {
        testInfo.skip(
          true,
          'No menu-management main/sub-category path with visible menu rows found'
        );
        return;
      }

      await expect(
        page.getByTestId('category-cascade-selection')
      ).toBeVisible();
      await expect(page.locator('tbody tr').first()).not.toContainText(
        'No menu items found'
      );

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

      await page.getByRole('button', { name: 'Sub Categories' }).click();
      await expect(
        page.getByTestId('category-cascade-sub-options')
      ).toBeVisible();
      await page.getByRole('button', { name: 'Main Categories' }).click();
      await expect(
        page.getByTestId('category-cascade-main-options')
      ).toBeVisible();
    }
  );

  superAdminTest(
    'sellable inventory search works inside the selected cascade path',
    async ({ page }, testInfo) => {
      await page.goto('/dashboard/inventory');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('category-cascade')).toBeVisible();
      await expect(page.getByTestId('category-cascade-search')).toBeEnabled();

      const path = await findPathWithContent(page, async (currentPage) => {
        const firstRow = currentPage.locator('tbody tr').first();
        if ((await firstRow.count()) === 0) return false;
        const text = ((await firstRow.textContent()) ?? '').trim();
        return text !== 'No inventory items found';
      });

      if (!path) {
        testInfo.skip(
          true,
          'No sellable-inventory main/sub-category path with visible rows found'
        );
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
