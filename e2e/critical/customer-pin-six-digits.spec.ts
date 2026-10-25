/**
 * @requirement REQ-115 — WA-01 Phase 0, AC15 (D16)
 *
 * Meta rejects a verification-PIN send that is not exactly 6 digits, and the
 * old 4-digit `Math.random` PIN was weak. Sign-in PINs are now 6 digits end
 * to end: generated server-side, shown as a 6-digit field, and a 4-digit
 * entry is refused.
 *
 * Runs under `ENABLE_E2E_PIN_INTERCEPT=true` (the CI default): the send
 * action stores the PIN and skips the provider, and the spec reads it back
 * from Mongo. The live Meta delivery of a 6-digit PIN is the UAT round-trip
 * recorded as evidence (it needs the flag off).
 *
 * @requirement REQ-115
 */
import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { mongoConn } from '../helpers/db-assertions';
import { getVerificationPinByPhone, uniquePhone } from '../smoke/helpers';

async function deleteCustomer(digits: string) {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client
      .db(dbName)
      .collection('users')
      .deleteMany({ phone: { $regex: digits } });
  } finally {
    await client.close();
  }
}

test.describe('REQ-115 customer sign-in PIN is 6 digits', () => {
  test('[US-01.7] the issued PIN is 6 digits, the field takes 6, and a 4-digit entry is refused', async ({
    page,
  }) => {
    tagTest('REQ-115', 15);

    const { phone, digits } = uniquePhone();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          'cookieConsent',
          JSON.stringify({
            acceptedAt: new Date().toISOString(),
            version: 'v1',
          })
        );
      } catch {
        /* best-effort banner dismissal */
      }
    });

    try {
      await page.goto('/login');
      await page.getByText('Traditional text message to your phone').click();
      await page.fill('#phone', phone);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });

      // The form advertises and enforces 6 digits.
      await expect(page.locator('#pin')).toHaveAttribute('maxlength', '6');
      await expect(page.getByText(/6-digit PIN/i).first()).toBeVisible();

      // The server issued exactly 6 digits.
      const pin = await getVerificationPinByPhone(digits);
      expect(pin, 'a verification PIN should be stored').toMatch(/^\d{6}$/);

      // A 4-digit entry is refused and nobody is signed in.
      await page.fill('#pin', '1234');
      await page.getByRole('button', { name: /verify & login/i }).click();
      await expect(page.getByText(/PIN must be 6 digits/i)).toBeVisible();
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await evidenceShot(page, 'REQ-115', 15, 'four-digit-pin-refused');

      // The real 6-digit PIN signs in.
      await page.fill('#pin', pin as string);
      await page.getByRole('button', { name: /verify & login/i }).click();
      await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 15000 });
    } finally {
      await deleteCustomer(digits);
    }
  });
});
