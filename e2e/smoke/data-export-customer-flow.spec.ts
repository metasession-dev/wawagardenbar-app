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
  test('AC4 — /profile "Download my data" button triggers a JSON download', async ({
    page,
  }) => {
    await loginAsCustomer(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Diagnostic: confirm we're on /profile and not redirected to /login
    await expect(page).toHaveURL(/\/profile/, { timeout: 10000 });

    // Check if the page is actually rendering content
    const h1 = page.getByRole('heading', { name: /my profile/i });
    await expect(h1).toBeVisible({ timeout: 10000 });

    // The "Your data" Card lives below the tabs.
    await expect(page.getByText(/your data/i).first()).toBeVisible({
      timeout: 10000,
    });

    const downloadBtn = page.getByRole('button', { name: /download my data/i });
    await expect(downloadBtn).toBeVisible({ timeout: 10000 });
    await downloadBtn.click({ trial: true });

    const downloadPromise = page.waitForEvent('download');
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^wawa-data-[^-]+-\d{4}-\d{2}-\d{2}\.json$/
    );
  });
});
