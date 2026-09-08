/**
 * @requirement REQ-102 — AC2 (amended): dedicated Pricing Windows page
 * @requirement REQ-103 — AC3/AC5: menuManagement-permitted admin can save
 * the pricing windows; a session without the permission is still blocked
 * at the page level.
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
import {
  test as base,
  expect,
  Page,
  request as pwRequest,
} from '@playwright/test';
import path from 'path';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');
const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const CSR_FILE = path.join(__dirname, '../../.auth/csr.json');

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

      // input[type="time"] has a segmented native widget — .fill() can
      // silently no-op under load, leaving the previous value in place.
      // Retry the fill itself (not just the check) until it visibly
      // sticks, rather than trusting a single .fill() call.
      await expect(async () => {
        await startInput.fill('16:00');
        await expect(startInput).toHaveValue('16:00', { timeout: 1000 });
      }).toPass({ timeout: 10000 });
      await expect(async () => {
        await endInput.fill('18:00');
        await expect(endInput).toHaveValue('18:00', { timeout: 1000 });
      }).toPass({ timeout: 10000 });

      try {
        await page
          .getByRole('button', { name: 'Save Pricing Windows' })
          .click();
        await expect(
          page
            .getByText('Pricing windows updated successfully', {
              exact: true,
            })
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
      } finally {
        // Restore: disable the window (and its times) so the shared settings
        // singleton isn't left with a live happy-hour window active for real
        // customers — even if an assertion above threw, so a failure here
        // never corrupts state for later test runs.
        const restorePut = await page.request.put('/api/settings', {
          data: {
            happyHourWindow: { enabled: false, start: '00:00', end: '00:00' },
          },
        });
        expect(restorePut.ok()).toBe(true);
      }
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

/**
 * REQ-103 — AC3: `updatePricingWindowsAction` replaces this form's prior
 * dependency on the generic super-admin-only `PUT /api/settings`. `e2e-admin`
 * (`.auth/admin.json`) is seeded with role `admin` +
 * `permissions.menuManagement: true` — exactly the account class this fix
 * unblocks.
 */
const adminTest = base.extend({ storageState: ADMIN_FILE });
adminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Admin login failed — skipping');
  }
});

adminTest(
  'REQ-103 AC3: a menuManagement-permitted admin can save the Show Price Window',
  async ({ page }) => {
    tagTest('REQ-103', 3);
    await page.goto('/dashboard/menu/pricing-windows', {
      waitUntil: 'domcontentloaded',
    });

    const showPriceCard = page
      .getByTestId('show-price-window-heading')
      .locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');

    const enableSwitch = showPriceCard.getByRole('switch');
    const wasEnabled =
      (await enableSwitch.getAttribute('data-state')) === 'checked';
    if (!wasEnabled) {
      await enableSwitch.click();
    }

    const startInput = page.locator('input[name="showPriceWindow.start"]');
    const endInput = page.locator('input[name="showPriceWindow.end"]');

    await expect(async () => {
      await startInput.fill('09:00');
      await expect(startInput).toHaveValue('09:00', { timeout: 1000 });
    }).toPass({ timeout: 10000 });
    await expect(async () => {
      await endInput.fill('11:00');
      await expect(endInput).toHaveValue('11:00', { timeout: 1000 });
    }).toPass({ timeout: 10000 });

    try {
      await page.getByRole('button', { name: 'Save Pricing Windows' }).click();
      await expect(
        page
          .getByText('Pricing windows updated successfully', { exact: true })
          .first()
      ).toBeVisible({ timeout: 10000 });
      await evidenceShot(
        page,
        'REQ-103',
        3,
        'menu-management-admin-pricing-window-saved'
      );

      const after = await page.request.get('/api/settings');
      const afterJson = await after.json();
      expect(afterJson.data.showPriceWindow).toMatchObject({
        enabled: true,
        start: '09:00',
        end: '11:00',
      });
    } finally {
      // Restore via a super-admin request context — `/api/settings` PUT
      // remains super-admin-only by design (this REQ deliberately does not
      // loosen it), so the admin fixture's own session cannot be used here.
      const superAdminContext = await pwRequest.newContext({
        storageState: SUPER_ADMIN_FILE,
      });
      try {
        const restorePut = await superAdminContext.put('/api/settings', {
          data: {
            showPriceWindow: { enabled: false, start: '00:00', end: '00:00' },
          },
        });
        expect(restorePut.ok()).toBe(true);
      } finally {
        await superAdminContext.dispose();
      }
    }
  }
);

/**
 * REQ-103 — AC5 (negative, page-level defense-in-depth): a session with
 * neither `super-admin` nor `menuManagement` must still be unable to reach
 * the save surface at all. This is the pre-existing, unchanged
 * `routePermissions['/dashboard/menu']` gate in `proxy.ts` — the actual
 * save-action gate this REQ fixes (`hasSessionPermission`) is proven
 * directly by unit tests (`__tests__/actions/admin/pricing-windows-action.test.ts`),
 * since a session blocked here never reaches the save form to exercise it.
 */
const csrTest = base.extend({ storageState: CSR_FILE });
csrTest.beforeEach(async ({ page }, testInfo) => {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('domcontentloaded');
    if (!page.url().includes('/dashboard')) {
      testInfo.skip(true, 'CSR login failed — skipping');
    }
  } catch {
    testInfo.skip(true, 'CSR login failed — skipping');
  }
});

csrTest(
  'REQ-103 AC5: a session without menuManagement is redirected away from Pricing Windows',
  async ({ page }) => {
    tagTest('REQ-103', 5);
    await page.goto('/dashboard/menu/pricing-windows', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/dashboard\/forbidden/);
    await evidenceShot(
      page,
      'REQ-103',
      5,
      'no-menu-management-blocked-pricing-windows'
    );
  }
);
