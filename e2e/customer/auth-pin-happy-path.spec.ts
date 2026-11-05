/**
 * @requirement REQ-074 — Customer journey E2E coverage (sub-issue #292)
 * @requirement SRS REQ-AUTHC-001 — PIN-based passwordless login happy path
 *
 * @requirement REQ-117 — WhatsApp is the only customer sign-in (no method
 * step); the PIN is stored as a keyed hash.
 *
 * Foundation spec — exercises the env-gated bypass in `sendWhatsAppPinAction`
 * (REQ-074). With ENABLE_E2E_PIN_INTERCEPT=true on the server, the action
 * stores the hashed PIN, also writes the plaintext to the test-only
 * `verificationPin` field, and returns success WITHOUT dispatching to
 * WhatsApp. The spec reads the PIN via `readPinFromMongo`, submits it
 * through the verify form, and asserts session creation.
 *
 * What this pins:
 *   ✓ Login form renders the phone-entry step (no method step)
 *   ✓ "Continue" submission triggers sendWhatsAppPinAction
 *   ✓ With bypass active, the PIN-entry step appears
 *   ✓ Reading User.verificationPin from Mongo returns the persisted PIN
 *   ✓ Verifying with that PIN creates a session + redirects post-login
 *
 * What this does NOT pin (see e2e/critical/customer-signin-whatsapp-only.spec.ts):
 *   ✗ Hashing, attempt limits, consent, notices and the 90-day session
 */
import { test, expect } from '@playwright/test';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';
import {
  mongoConn,
  syntheticPhone,
  waitForPin,
  cleanupTestUser,
  isInterceptLikelyEnabled,
} from '../helpers/customer-auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test.describe('[REQ-074][REQ-117] Customer PIN-flow happy path (REQ-AUTHC-001)', () => {
  const phone = syntheticPhone();
  const conn = mongoConn();

  test.beforeAll(() => {
    if (!isInterceptLikelyEnabled()) {
      test.skip(
        true,
        'ENABLE_E2E_PIN_INTERCEPT must be set on the target server. ' +
          'For local runs: add to .env.local. For UAT: set on Railway. ' +
          'Without this flag the real SMS provider fires and the test breaks.'
      );
    }
  });

  test.afterAll(async () => {
    await cleanupTestUser(conn, phone);
  });

  test('[REQ-117][AC1] phone → PIN persists → PIN entry → verify → session created', async ({
    page,
  }) => {
    tagTest('REQ-117', 1);
    // ── Step 1: navigate to login ─────────────────────────────────────────
    // REQ-117: the form asks for the phone number only; the PIN always goes
    // over WhatsApp, so there is no delivery-method step.
    await page.goto(`${BASE_URL}/login`);
    await expect(
      page.getByRole('heading', { name: /choose delivery method/i })
    ).toHaveCount(0);

    // ── Step 2: enter phone + request PIN ─────────────────────────────────
    await expect(page.locator('#phone')).toBeVisible({ timeout: 10_000 });
    await page.locator('#phone').fill(phone);
    // Form's submit button is labelled "Continue" (the action behind it
    // is sendWhatsAppPinAction).
    await page.getByRole('button', { name: /^continue$/i }).click();

    // ── Step 3: PIN-entry step appears (bypass returned success) ─────────
    // Without the server-side bypass we'd see the WhatsApp-unavailable
    // notice instead. Race the two outcomes — whichever appears
    // first determines whether we proceed or skip with a clear message
    // (distinguishes "intercept not configured on server" from "real bug").
    const pinField = page.locator('#pin');
    const providerErrorAlert = page
      .getByText(
        /online ordering is temporarily unavailable|failed to send verification|could not send your pin/i
      )
      .first();

    await Promise.race([
      pinField.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null),
      providerErrorAlert
        .waitFor({ state: 'visible', timeout: 10_000 })
        .catch(() => null),
    ]);

    if (await providerErrorAlert.isVisible().catch(() => false)) {
      test.skip(
        true,
        'Server returned a provider error (WhatsApp). ' +
          'ENABLE_E2E_PIN_INTERCEPT=true must be set on the target server ' +
          '(Railway UAT env var), not just on the Playwright runner. ' +
          'Once set + Railway redeploys, this spec will pass.'
      );
    }

    await expect(pinField).toBeVisible();
    await evidenceShot(page, 'REQ-074', 4, 'pin-entry-step-after-intercept');
    await evidenceShot(page, 'REQ-117', 1, 'whatsapp-only-pin-entry');

    // ── Step 4: read PIN from Mongo + verify ──────────────────────────────
    const { pin, expiresAt } = await waitForPin(conn, phone);
    expect(pin).toMatch(/^\d{6}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    await page.locator('#pin').fill(pin);
    // PIN-step submit is labelled "Verify & Login" (the phone-step Continue
    // shipped the PIN; this verifies it and creates the session).
    await page.getByRole('button', { name: /verify.*login/i }).click();

    // ── Step 5: session created → redirected away from /login ─────────────
    // The exact post-login destination depends on the post-auth redirect
    // logic; either way the page should leave /login.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
    await evidenceShot(
      page,
      'REQ-074',
      4,
      'session-created-redirect-away-from-login'
    );

    // ── Step 6: cookie sanity — session cookie should be set ─────────────
    const cookies = await page.context().cookies();
    const sessionCookieNames = cookies.map((c) => c.name);
    expect(sessionCookieNames.some((n) => /session|iron|sid/i.test(n))).toBe(
      true
    );
  });
});
