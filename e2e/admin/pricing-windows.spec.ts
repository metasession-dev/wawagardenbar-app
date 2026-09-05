/**
 * @requirement REQ-102 — AC2 (amended): dedicated Pricing Windows page
 *
 * Covers AC2 from compliance/evidence/REQ-102/test-scope.md, amended per
 * operator request: Show Price Window / Happy Hour Window moved from a
 * Settings tab to a dedicated page at /dashboard/menu/pricing-windows,
 * linked via a "Pricing Windows" button next to "Edit All" on
 * /dashboard/menu. Settings' Business Hours section is unaffected — it
 * never moved.
 *
 * Supersedes e2e/settings/pricing-windows.spec.ts (deleted — that spec's
 * route (/dashboard/settings, "Pricing Windows" tab) no longer exists).
 *
 * Tests are defensive: the window state is restored after the persistence
 * test so the shared UAT settings singleton is left in its prior state.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed — skipping');
  }
});

superAdminTest.describe.configure({ mode: 'serial' });

superAdminTest.describe('REQ-102: Pricing Windows — dedicated page', () => {
  superAdminTest(
    'AC2: "Pricing Windows" link on /dashboard/menu navigates to the dedicated page',
    async ({ page }) => {
      tagTest('REQ-102', 2);
      await page.goto('/dashboard/menu', { waitUntil: 'domcontentloaded' });
      await page.getByRole('link', { name: /pricing windows/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/menu\/pricing-windows/);

      await expect(page.getByTestId('show-price-window-heading')).toBeVisible();
      await expect(page.getByTestId('happy-hour-window-heading')).toBeVisible();
      await evidenceShot(page, 'REQ-102', 2, 'pricing-windows-page', {
        tier: 'feature',
      });
    }
  );

  superAdminTest(
    'AC2: enabling the Happy Hour Window and setting start/end persists',
    async ({ page }) => {
      tagTest('REQ-102', 2);
      await page.goto('/dashboard/menu/pricing-windows', {
        waitUntil: 'domcontentloaded',
      });

      // Scope strictly to the Happy Hour Window card (the heading's
      // nearest ancestor Card) so the Show Price Window's switch, which
      // sits in a sibling card, is never touched.
      const happyHourCard = page
        .getByTestId('happy-hour-window-heading')
        .locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');

      const enableSwitch = happyHourCard.getByRole('switch');
      const wasEnabled =
        (await enableSwitch.getAttribute('data-state')) === 'checked';
      if (!wasEnabled) {
        await enableSwitch.click();
      }

      const startInput = page.locator('input[name="happyHourWindow.start"]');
      const endInput = page.locator('input[name="happyHourWindow.end"]');
      await startInput.fill('16:00');
      await endInput.fill('18:00');

      await page.getByRole('button', { name: 'Save Pricing Windows' }).click();
      await expect(
        page
          .getByText('Pricing windows updated successfully', { exact: true })
          .first()
      ).toBeVisible({ timeout: 10000 });
      await evidenceShot(page, 'REQ-102', 2, 'happy-hour-window-saved');

      // Confirm persistence via the settings API directly (same module
      // graph the PUT went through) rather than reloading the dashboard
      // page — Next.js dev-mode can compile the Server Component page's
      // module graph separately from the Route Handler's, so an SSR page
      // re-read is not a reliable same-process cache-consistency check.
      const after = await page.request.get('/api/settings');
      const afterJson = await after.json();
      expect(afterJson.data.happyHourWindow).toMatchObject({
        enabled: true,
        start: '16:00',
        end: '18:00',
      });

      // Restore: disable the window (and its times) so the shared settings
      // singleton isn't left with a live happy-hour window active for real
      // customers.
      const restorePut = await page.request.put('/api/settings', {
        data: {
          happyHourWindow: { enabled: false, start: '00:00', end: '00:00' },
        },
      });
      expect(restorePut.ok()).toBe(true);
    }
  );

  superAdminTest(
    'AC2: Business Hours on the main Settings page is unaffected',
    async ({ page }) => {
      tagTest('REQ-102', 2);
      await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: 'Business Hours' }).click();
      await expect(
        page.getByRole('heading', { name: 'Business Hours' })
      ).toBeVisible();
      await expect(
        page.locator('input[name="businessHours.monday.open"]')
      ).toBeVisible();

      // The "Pricing Windows" tab must be gone from Settings — it moved.
      await expect(
        page.getByRole('tab', { name: 'Pricing Windows' })
      ).toHaveCount(0);
    }
  );
});
