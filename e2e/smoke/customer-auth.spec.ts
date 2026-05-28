import { test, expect, type Page } from '@playwright/test';
import { getVerificationPinByPhone, uniquePhone } from './helpers';
import { evidenceShot } from '../helpers/evidence';

/**
 * Customer passwordless authentication — SMS/phone PIN login.
 *
 * ⏸ DEFERRED (test.fixme): the PIN-login UI flow cannot complete in a test
 * environment. The PIN is written to Mongo (and `getVerificationPinByPhone`
 * below reads it), but the SMS/email *send* is server-side and FATAL on
 * failure (`SmsService.sendSMS` returns failure when disabled or without live
 * creds; `sendPinAction` then blocks the form before the PIN step). Being
 * server-side, Playwright can't stub it. Un-fixme these once a local provider
 * mock exists (a fake AfricasTalking endpoint via AFRICASTALKING_API_URL in the
 * e2e setup step) — the helper + flow below are ready for that.
 *
 * SRS: REQ-AUTHC-001 (PIN login), REQ-AUTHC-002 (invalid PIN). @smoke
 * @requirement REQ-007
 */
test.describe('Customer auth — passwordless SMS PIN @smoke', () => {
  async function requestSmsPin(page: Page, phone: string) {
    await page.goto('/login');
    await page.getByText('Traditional text message to your phone').click();
    await page.fill('#phone', phone);
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });
  }

  test.fixme('REQ-AUTHC-001: SMS PIN login creates a session', async ({ page }) => {
    const { phone, digits } = uniquePhone();
    await requestSmsPin(page, phone);

    const pin = await getVerificationPinByPhone(digits);
    expect(pin, 'a verification PIN should be stored for the customer').toMatch(/^\d{4}$/);

    await page.fill('#pin', pin as string);
    await evidenceShot(page, 'REQ-007', 'AUTHC-001-pin-entered');
    await page.getByRole('button', { name: /verify & login/i }).click();
    await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 15000 });
  });

  test.fixme('REQ-AUTHC-002: wrong PIN is rejected, no session', async ({ page }) => {
    const { phone, digits } = uniquePhone();
    await requestSmsPin(page, phone);

    const real = (await getVerificationPinByPhone(digits)) ?? '1234';
    const wrong = String((Number(real) + 1) % 10000).padStart(4, '0');

    await page.fill('#pin', wrong);
    await page.getByRole('button', { name: /verify & login/i }).click();
    await expect(page.locator('#pin')).toBeVisible();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
