/**
 * @requirement REQ-065 — Self-service data export (#117 P4 #19)
 *
 * AC4 — Authenticated customer visits /profile → clicks "Download my data"
 * → browser receives a JSON download with the expected filename.
 *
 * ⏸ DEFERRED (test.fixme): same blocker as `customer-auth.spec.ts` —
 * the customer PIN-login is server-side SMS-fatal without a provider
 * mock. AC4 needs a logged-in customer session, which requires either
 * a customer storageState (none exist yet — auth.setup only creates
 * staff sessions) or completing the PIN flow (blocked). Un-fixme once
 * a local provider mock exists (`AFRICASTALKING_API_URL` wired into
 * the e2e setup).
 *
 * @smoke
 * @requirement REQ-065
 */
import { test, expect } from '@playwright/test';

test.describe('REQ-065 data export customer download flow @smoke', () => {
  test.fixme(
    'AC4 — /profile "Download my data" button triggers a JSON download',
    async ({ page }) => {
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
