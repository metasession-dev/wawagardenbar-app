/**
 * @requirement REQ-081 - Cross-category search for express order entry.
 * @requirement REQ-082 - Progressive category display: items visible on landing.
 * Shared helper that uses the search field (AC11) to find menu items by name,
 * bypassing the cascade when non-deterministic inventory makes category paths
 * unreliable. Falls back to category toggle filtering only when search fails.
 */
import { expect, type Locator, type Page } from '@playwright/test';

const MENU_CARD_SELECTOR = '.grid .cursor-pointer';

/**
 * Reveal the express create-order menu grid. With REQ-082 progressive
 * disclosure, items are visible on landing. Uses search as a fallback
 * when no items are immediately visible.
 *
 * @param page - Playwright page already navigated to the express create-order page
 * @returns Locator for the first available menu card
 * @throws If no available menu items are found via search or category filtering
 */
export async function revealFirstExpressMenuCard(page: Page): Promise<Locator> {
  const menuCard = page.locator(MENU_CARD_SELECTOR).first();
  if (await menuCard.isVisible().catch(() => false)) {
    return menuCard;
  }

  await expect(page.getByTestId('category-cascade')).toBeVisible({
    timeout: 10000,
  });

  await page.waitForTimeout(500);

  if (await menuCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    return menuCard;
  }

  // AC11: Use cross-category search to find items by name
  // Known seeded items: Efo, Ogbono (food), Gulder, 33 (drinks)
  const searchTerms = ['Efo', 'Ogbono', 'Gulder', '33'];
  const searchInput = page.getByTestId('category-cascade-search');

  for (const term of searchTerms) {
    await searchInput.fill(term);
    await page.waitForTimeout(400);

    if (await menuCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      return menuCard;
    }

    await searchInput.clear();
  }

  // Fallback: try main category toggle filtering
  const mainButtons = page
    .getByTestId('category-cascade-main-options')
    .getByRole('button');
  const mainCount = await mainButtons.count();

  for (let mainIndex = 0; mainIndex < mainCount; mainIndex += 1) {
    await mainButtons.nth(mainIndex).click();
    await page.waitForTimeout(400);

    if (await menuCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      return menuCard;
    }
  }

  throw new Error(
    'No available express menu items found via search or category filtering'
  );
}
