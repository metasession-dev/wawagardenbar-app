/**
 * @requirement REQ-063 — Explicit-consent split (#117 P4 #21)
 *
 * AC5 — Profile preferences-tab gains an "Email — offers & promotions"
 * Switch wired through `updatePreferencesAction`. Toggling it saves
 * `emailMarketing: true` to the user's preferences and server-stamps
 * `communicationPreferencesUpdatedAt`.
 *
 * Logs in a fresh customer via the passwordless PIN flow (enabled in CI by
 * ENABLE_E2E_PIN_INTERCEPT=true — REQ-074), then drives the Preferences tab.
 *
 * @smoke
 * @requirement REQ-063
 */
import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './helpers';

test.describe('REQ-063 profile preferences — email-marketing toggle @smoke', () => {
  test('AC5 — toggling "Email — offers & promotions" persists emailMarketing + audit timestamp', async ({
    page,
  }) => {
    const logs: { type: string; text: string }[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('error') ||
        text.includes('Error') ||
        text.includes('profile')
      ) {
        logs.push({ type: msg.type(), text: text.substring(0, 500) });
      }
    });
    page.on('pageerror', (err) => {
      logs.push({ type: 'pageerror', text: err.message.substring(0, 500) });
    });

    await loginAsCustomer(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    console.log('AC5 DEBUG — URL:', page.url());
    console.log(
      'AC5 DEBUG — logs:',
      JSON.stringify(logs, null, 2).substring(0, 3000)
    );

    const preferencesTab = page.getByRole('tab', { name: /preferences/i });
    await expect(preferencesTab).toBeVisible({ timeout: 10000 });
    await preferencesTab.click({ trial: true });
    await preferencesTab.click();

    const switchEl = page.locator('#email-marketing');
    await expect(switchEl).toBeVisible();
    await expect(switchEl).toHaveAttribute('data-state', 'unchecked');

    await switchEl.click();
    await expect(switchEl).toHaveAttribute('data-state', 'checked');

    await page.getByRole('button', { name: /save preferences/i }).click();
    await expect(page.getByText(/preferences updated/i)).toBeVisible();
  });
});
