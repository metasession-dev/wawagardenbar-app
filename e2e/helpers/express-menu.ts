/**
 * @requirement REQ-081 - Main-category to sub-category cascade across express
 * order entry. Shared helper so pre-cascade express specs can reveal the menu
 * grid by walking the category cascade before selecting an item.
 */
import { expect, type Locator, type Page } from '@playwright/test';

const MENU_CARD_SELECTOR = '.grid .cursor-pointer';

/**
 * Reveal the express create-order menu grid by walking the REQ-081 category
 * cascade, then return the first available (in-stock) menu card.
 *
 * The express picker hides items until a main category and sub-category are
 * selected. This helper tries each main -> sub path until available items
 * render, mirroring the production cascade a staff member would use.
 *
 * @param page - Playwright page already navigated to the express create-order page
 * @returns Locator for the first available menu card
 * @throws If no category path yields an available menu item
 */
export async function revealFirstExpressMenuCard(page: Page): Promise<Locator> {
  const menuCard = page.locator(MENU_CARD_SELECTOR).first();
  if (await menuCard.isVisible().catch(() => false)) {
    return menuCard;
  }

  await expect(page.getByTestId('category-cascade')).toBeVisible({
    timeout: 10000,
  });

  const mainButtons = page
    .getByTestId('category-cascade-main-options')
    .getByRole('button');
  const mainCount = await mainButtons.count();

  for (let mainIndex = 0; mainIndex < mainCount; mainIndex += 1) {
    await mainButtons.nth(mainIndex).click();
    const subButtons = page
      .getByTestId('category-cascade-sub-options')
      .getByRole('button');
    const subCount = await subButtons.count();

    for (let subIndex = 0; subIndex < subCount; subIndex += 1) {
      await subButtons.nth(subIndex).click();
      if (await menuCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        return menuCard;
      }
      await page.getByRole('button', { name: 'Sub Categories' }).click();
    }

    await page.getByRole('button', { name: 'Main Categories' }).click();
  }

  throw new Error(
    'No available express menu items were found in any category path'
  );
}
