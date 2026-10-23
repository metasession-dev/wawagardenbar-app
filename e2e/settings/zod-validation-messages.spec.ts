/**
 * @requirement REQ-114 — zod 3 → 4 upgrade (GHSA-mrhx-c7xc-m3w5)
 *
 * The upgrade must not change the validation messages users see (AC3) or
 * reject input that was accepted before (AC2). Schema-level parity (every
 * default message, `requiredError`, email/URL acceptance) is proved by
 * __tests__/lib/zod4-migration.test.ts. This spec covers the one path those
 * unit tests cannot: a real form rendering a zod error through
 * `@hookform/resolvers` (upgraded 3 → 5) in the client bundle, with the
 * zod-3-compatible global messages from `@/lib/zod` applied there.
 *
 * Settings → Contact Info → Contact Email uses `z.string().email()` with no
 * custom message, so it shows zod's *default* text: "Invalid email" in zod 3
 * (and with `@/lib/zod`), "Invalid email address" in zod 4 without it.
 *
 * The `requiredError` messages are not driven here: every admin form that
 * uses them seeds a default value (date = today, payment method = cash, …),
 * so their "required" path is not reachable from the UI.
 *
 * Nothing is saved: the invalid submit is blocked client-side, and the valid
 * value is only re-validated (react-hook-form re-validates on change after a
 * failed submit), never submitted.
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

/** Open Settings → Contact Info once React has hydrated the form. */
async function openContactInfo(page: Page): Promise<void> {
  await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
  const saveButton = page.getByRole('button', { name: 'Save Settings' });
  await expect(saveButton).toBeVisible();
  // A click before hydration is silently dropped; React tags hydrated DOM
  // nodes with a `__reactFiber$…` key.
  await page.waitForFunction(() => {
    const el = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Save Settings'
    );
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
  });
  await page.getByRole('tab', { name: 'Contact Info' }).click();
  await expect(page.getByLabel('Contact Email')).toBeVisible();
}

const superAdminTest = base.extend({ storageState: SUPER_ADMIN_FILE });
superAdminTest.beforeEach(async ({ page }, testInfo) => {
  if (!(await isAuthenticated(page))) {
    testInfo.skip(true, 'Super-admin login failed — skipping');
  }
});

superAdminTest.describe('REQ-114: zod 4 keeps form validation messages', () => {
  superAdminTest(
    '[REQ-114][AC3][AC2] an invalid email shows the zod 3 message, and a valid one is accepted',
    async ({ page }) => {
      tagTest('REQ-114', [2, 3]);
      await openContactInfo(page);
      const email = page.getByLabel('Contact Email');
      const original = await email.inputValue();

      // `user@example` passes the browser's own `type="email"` check (no TLD
      // is allowed by the HTML spec) but fails zod's `.email()`, so the
      // submit reaches react-hook-form and the zod message is what shows.
      await email.fill('user@example');
      await page.getByRole('button', { name: 'Save Settings' }).click();

      // AC3 — zod 3's default wording, not zod 4's "Invalid email address".
      const message = page.getByText('Invalid email', { exact: true });
      await expect(message).toBeVisible();
      await expect(page.getByText('Invalid email address')).toHaveCount(0);
      await evidenceShot(page, 'REQ-114', 3, 'settings-invalid-email-message');

      // AC2 — a valid address clears the error (react-hook-form re-validates
      // on change after a failed submit); nothing is submitted.
      await email.fill(original || 'info@wawagardenbar.com');
      await expect(message).toHaveCount(0);
      await evidenceShot(page, 'REQ-114', 2, 'settings-valid-email-accepted');
    }
  );
});
