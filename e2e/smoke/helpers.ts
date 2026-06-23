import { MongoClient } from 'mongodb';
import { expect, type Page } from '@playwright/test';

/**
 * Read a customer's current 4-digit verification PIN straight from Mongo.
 *
 * The PIN is normally delivered via SMS/WhatsApp/email (all stubbed in test),
 * and `User.verificationPin` is `select: false`, so the app never exposes it.
 * For the passwordless-login smoke test we read it directly from the test DB —
 * the same disposable Mongo the seed step + dev server use (MONGODB_URI /
 * MONGODB_DB_NAME). Match on a digit-substring of the phone so we don't depend
 * on how `sanitizePhone` reformats it. Polls because the send action writes async.
 */
export async function getVerificationPinByPhone(
  phoneDigits: string,
  { timeoutMs = 8000, intervalMs = 250 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<string | null> {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
    'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'wawagardenbar_test';

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const users = client.db(dbName).collection('users');
    const deadline = Date.now() + timeoutMs;
    do {
      const user = await users.findOne(
        { phone: { $regex: phoneDigits } },
        { projection: { verificationPin: 1 } }
      );
      const pin = user?.verificationPin as string | undefined;
      if (pin) return pin;
      await new Promise((r) => setTimeout(r, intervalMs));
    } while (Date.now() < deadline);
    return null;
  } finally {
    await client.close();
  }
}

/**
 * A unique Nigerian-format phone for a fresh test customer. Returns the full
 * number to type and the unique digit-substring to look the user up by.
 */
export function uniquePhone(): { phone: string; digits: string } {
  const digits = String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 10));
  return { phone: `+2348${digits}`, digits };
}

/**
 * Log in a fresh customer via the passwordless SMS-PIN flow and leave the page
 * on an authenticated session (off /login).
 *
 * Relies on ENABLE_E2E_PIN_INTERCEPT=true on the server: sendPinAction then
 * persists the PIN to Mongo and returns success without dispatching real SMS,
 * so the form advances to the PIN-entry step. We read the PIN back from Mongo
 * and submit it. Returns the unique phone digit-substring so callers can look
 * the user up in Mongo afterwards.
 */
export async function loginAsCustomer(page: Page): Promise<{ phone: string; digits: string }> {
  const { phone, digits } = uniquePhone();

  // Pre-seed cookie-consent so the fixed-bottom CookieConsentBanner never
  // mounts. Otherwise it (a) intercepts clicks on bottom-of-page controls
  // (e.g. "Download my data") and (b) shifts layout on its post-hydration
  // useEffect, leaving top controls "not stable" for Playwright. Applies to
  // every navigation in this context, including the later /profile load.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ acceptedAt: new Date().toISOString(), version: 'v1' })
      );
    } catch {
      /* localStorage unavailable — banner dismissal is best-effort */
    }
  });

  await page.goto('/login');
  await page.getByText('Traditional text message to your phone').click();
  await page.fill('#phone', phone);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });

  const pin = await getVerificationPinByPhone(digits);
  expect(pin, 'a verification PIN should be stored for the customer').toMatch(/^\d{4}$/);

  await page.fill('#pin', pin as string);
  await page.getByRole('button', { name: /verify & login/i }).click();

  // Wait for the post-verify client redirect (router.push to the landing page,
  // e.g. /menu) to FULLY settle. Returning the moment the URL merely leaves
  // /login leaves that navigation in-flight, which then clobbers a subsequent
  // page.goto('/profile') — detaching the profile DOM and aborting in-flight
  // requests. Waiting for the committed landing URL + networkidle prevents it.
  await page.waitForURL((url: URL) => !/^\/login(\/|$)/.test(url.pathname), {
    timeout: 15000,
  });
  await page.waitForLoadState('networkidle');

  return { phone, digits };
}
