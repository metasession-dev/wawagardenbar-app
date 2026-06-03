/**
 * @requirement REQ-063 — Explicit-consent split (#117 P4 #21)
 *
 * AC1 — PIN-entry surface renders THREE distinct consent checkboxes
 * for new users (WA transactional default ON, WA marketing default OFF,
 * email marketing default OFF). Verifying the PIN with the three opt-ins
 * picked persists each independently to the user's preferences and
 * stamps `communicationPreferencesUpdatedAt`.
 *
 * ⏸ DEFERRED (test.fixme): same blocker as `customer-auth.spec.ts` —
 * the SMS/email PIN delivery is server-side and FATAL on failure when no
 * provider is configured. `sendPinAction` rejects before the PIN-entry
 * step is reachable. Un-fixme once a local provider mock exists (a fake
 * AfricasTalking endpoint via AFRICASTALKING_API_URL in the e2e setup).
 *
 * The helpers + assertions below are ready for that day.
 *
 * SRS: REQ-AUTHC-001 (PIN login) — extends with REQ-063's consent surface.
 * @smoke
 * @requirement REQ-063
 */
import { test, expect, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { getVerificationPinByPhone, uniquePhone } from './helpers';
import { evidenceShot } from '../helpers/evidence';

async function readUserPrefs(
  phoneDigits: string
): Promise<Record<string, unknown> | null> {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
    'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'wawagardenbar_test';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const user = await client
      .db(dbName)
      .collection('users')
      .findOne(
        { phone: { $regex: phoneDigits } },
        {
          projection: {
            'preferences.communicationPreferences': 1,
            'preferences.communicationPreferencesUpdatedAt': 1,
          },
        }
      );
    return user
      ? ((user as { preferences?: Record<string, unknown> }).preferences ??
          null)
      : null;
  } finally {
    await client.close();
  }
}

async function requestSmsPinForNewUser(page: Page, phone: string) {
  await page.goto('/login');
  await page.getByText('Traditional text message to your phone').click();
  await page.fill('#phone', phone);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });
}

test.describe('REQ-063 PIN-entry consent split @smoke', () => {
  test.fixme(
    'AC1 — new-user PIN entry renders 3 labelled consent checkboxes with correct defaults',
    async ({ page }) => {
      const { phone } = uniquePhone();
      await requestSmsPinForNewUser(page, phone);

      // Three distinct checkbox rows, each with its own id + label.
      const waTransactional = page.locator('#wa-transactional');
      const waMarketing = page.locator('#wa-marketing');
      const emailMarketing = page.locator('#email-marketing');

      await expect(waTransactional).toBeVisible();
      await expect(waMarketing).toBeVisible();
      await expect(emailMarketing).toBeVisible();

      // Defaults: WA transactional ON, the two marketing OFF.
      await expect(waTransactional).toBeChecked();
      await expect(waMarketing).not.toBeChecked();
      await expect(emailMarketing).not.toBeChecked();

      // Labels are present and distinct (no collapsed shared text).
      await expect(page.getByText(/Order updates via WhatsApp/i)).toBeVisible();
      await expect(
        page.getByText(/Offers and promotions via WhatsApp/i)
      ).toBeVisible();
      await expect(
        page.getByText(/Offers and promotions by email/i)
      ).toBeVisible();

      await evidenceShot(page, 'REQ-063', 1, 'pin-entry-three-checkboxes');
    }
  );

  test.fixme(
    'AC1+AC3 — opting into all three persists each independently and stamps audit timestamp',
    async ({ page }) => {
      const { phone, digits } = uniquePhone();
      await requestSmsPinForNewUser(page, phone);

      // User opts in to email marketing as well — flips the third checkbox.
      await page.locator('#wa-marketing').check();
      await page.locator('#email-marketing').check();

      const pin = await getVerificationPinByPhone(digits);
      expect(pin).toMatch(/^\d{4}$/);
      await page.fill('#pin', pin as string);
      await page.getByRole('button', { name: /verify & login/i }).click();
      await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 15000 });

      // Three independent persisted booleans + a server-stamped timestamp.
      const prefs = await readUserPrefs(digits);
      const cp =
        (prefs?.communicationPreferences as Record<string, unknown>) ?? {};
      expect(cp.whatsappTransactional).toBe(true);
      expect(cp.whatsappMarketing).toBe(true);
      expect(cp.emailMarketing).toBe(true);
      expect(prefs?.communicationPreferencesUpdatedAt).toBeTruthy();

      await evidenceShot(page, 'REQ-063', 3, 'audit-timestamp-stamped');
    }
  );
});
