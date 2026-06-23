/**
 * @requirement REQ-065 — Self-service data export (#117 P4 #19)
 *
 * AC4 — Authenticated customer visits /profile → clicks "Download my data"
 * → browser receives a JSON download with the expected filename.
 *
 * AC4 logs in a fresh customer via the passwordless PIN flow (enabled in CI
 * by ENABLE_E2E_PIN_INTERCEPT=true — REQ-074), then exercises the export.
 *
 * @smoke
 * @requirement REQ-065
 */
import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './helpers';

test.describe('REQ-065 data export customer download flow @smoke', () => {
  test(
    'AC4 — /profile "Download my data" button triggers a JSON download',
    async ({ page }) => {
      await loginAsCustomer(page);
      await page.goto('/profile');

      // The "Your data" Card lives below the tabs.
      await expect(page.getByText(/your data/i).first()).toBeVisible();

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /download my data/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(
        /^wawa-data-[^-]+-\d{4}-\d{2}-\d{2}\.json$/
      );
    }
  );
});
