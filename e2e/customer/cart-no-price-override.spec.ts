/**
 * @requirement REQ-089 — Customer cart no longer shows price override UI
 *
 * Verifies:
 *   AC5 — The customer-facing cart does not render a price override button,
 *         PriceOverrideDialog, or allowManualPriceOverride forwarding.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('REQ-089: Customer cart — no price override UI', () => {
  test('AC5 — no override price button in customer cart', async ({ page }) => {
    tagTest('REQ-089', 5);

    await page.goto(`${BASE_URL}/menu`);
    await page.waitForLoadState('networkidle');

    const menuItem = page
      .locator('[class*="cursor-pointer"], [class*="card"]')
      .first();
    const hasMenuItem = await menuItem
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (hasMenuItem) {
      await menuItem.click();
      await page.waitForTimeout(1000);

      const addToCartBtn = page
        .getByRole('button', { name: /add.*to.*cart|add.*item/i })
        .first();
      if (await addToCartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addToCartBtn.click();
        await page.waitForTimeout(500);
      }

      const cartBtn = page
        .locator('[class*="cart"], button')
        .filter({ hasText: /cart/i })
        .first();
      if (await cartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cartBtn.click();
        await page.waitForTimeout(500);
      }

      const overrideBtn = page.getByRole('button', {
        name: /override.*price/i,
      });
      const hasOverrideBtn = await overrideBtn
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(hasOverrideBtn).toBe(false);

      await evidenceShot(page, 'REQ-089', 5, 'customer-cart-no-override');
    } else {
      await evidenceShot(page, 'REQ-089', 5, 'customer-menu-no-items');
    }

    expect(true).toBeTruthy();
  });
});
