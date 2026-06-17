/**
 * @requirement REQ-081 - Cross-category search for express order entry.
 * Shared helper that uses the search field (AC11) to find menu items by name,
 * bypassing the cascade when non-deterministic inventory makes category paths
 * unreliable. Falls back to cascade navigation only when search fails.
 */
import { expect, type Locator, type Page } from '@playwright/test';

const MENU_CARD_SELECTOR = '.grid .cursor-pointer';

/**
 * Reveal the express create-order menu grid using REQ-081 cross-category
 * search (AC11). Types a known item name into the search field to surface
 * matching items across all categories, avoiding non-deterministic inventory
 * issues that can leave category paths empty.
 *
 * @param page - Playwright page already navigated to the express create-order page
 * @returns Locator for the first available menu card
 * @throws If no available menu items are found via search or cascade
 */
export async function revealFirstExpressMenuCard(page: Page): Promise<Locator> {
  const menuCard = page.locator(MENU_CARD_SELECTOR).first();
  if (await menuCard.isVisible().catch(() => false)) {
    return menuCard;
  }

  await expect(page.getByTestId('category-cascade')).toBeVisible({
    timeout: 10000,
  });

  // AC11: Use cross-category search to find items by name (bypasses cascade)
  // Known seeded items: Efo, Ogbono (food), Gulder, 33 (drinks)
  const searchTerms = ['Efo', 'Ogbono', 'Gulder', '33'];
  const searchInput = page.getByTestId('category-cascade-search');

  for (const term of searchTerms) {
    await searchInput.fill(term);
    await page.waitForTimeout(400); // Debounce + fetch time

    if (await menuCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      return menuCard;
    }

    await searchInput.clear();
  }

  // Fallback: try cascade navigation if search fails
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
      await page.waitForTimeout(400);

      if (await menuCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        return menuCard;
      }
      await page.getByRole('button', { name: 'Sub Categories' }).click();
    }

    await page.getByRole('button', { name: 'Main Categories' }).click();
  }

  throw new Error(
    'No available express menu items found via search or category cascade'
  );
}
