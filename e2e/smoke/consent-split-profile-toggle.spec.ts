/**
 * @requirement REQ-063 — Explicit-consent split (#117 P4 #21)
 *
 * AC5 — Profile preferences-tab gains an "Email — offers & promotions"
 * Switch wired through `updatePreferencesAction`. Toggling it saves
 * `emailMarketing: true` to the user's preferences and server-stamps
 * `communicationPreferencesUpdatedAt`.
 *
 * ⏸ DEFERRED (test.fixme): the profile page requires an authenticated
 * CUSTOMER session, but the customer auth setup is the same PIN flow
 * blocked by the SMS-fatal issue in `customer-auth.spec.ts`. Un-fixme
 * once a customer storageState (or SMS provider mock) lands.
 *
 * @smoke
 * @requirement REQ-063
 */
import { test, expect } from '@playwright/test';

test.describe('REQ-063 profile preferences — email-marketing toggle @smoke', () => {
  test.fixme(
    'AC5 — toggling "Email — offers & promotions" persists emailMarketing + audit timestamp',
    async ({ page }) => {
      await page.goto('/profile');
      await page.getByRole('tab', { name: /preferences/i }).click();

      const switchEl = page.locator('#email-marketing');
      await expect(switchEl).toBeVisible();
      await expect(switchEl).toHaveAttribute('data-state', 'unchecked');

      await switchEl.click();
      await expect(switchEl).toHaveAttribute('data-state', 'checked');

      await page.getByRole('button', { name: /save preferences/i }).click();
      await expect(page.getByText(/preferences updated/i)).toBeVisible();
    }
  );
});
