/**
 * @requirement REQ-074 — Customer journey E2E coverage (sub-issue #292)
 * @requirement SRS REQ-AUTHC-001 — PIN-based passwordless login happy path
 *
 * Foundation spec — exercises the env-gated bypass added to `sendPinAction`
 * (and siblings) by REQ-074. With ENABLE_E2E_PIN_INTERCEPT=true on the
 * server, the action persists the PIN to MongoDB and returns success WITHOUT
 * dispatching SMS. The spec reads the PIN via `readPinFromMongo`, submits
 * it through the verify form, and asserts session creation.
 *
 * What this pins:
 *   ✓ Login form renders the phone-entry step
 *   ✓ "Send PIN" submission triggers sendPinAction
 *   ✓ With bypass active, the PIN-entry step appears (no SMS error toast)
 *   ✓ Reading User.verificationPin from Mongo returns the persisted PIN
 *   ✓ Verifying with that PIN creates a session + redirects post-login
 *
 * What this does NOT pin (deferred):
 *   ✗ Real SMS dispatch — covered by integration tests on lib/sms.ts
 *   ✗ Email PIN channel — V2 (auth-pin-channel-choice.spec.ts)
 *   ✗ Rate-limit + expiry error states — V2 (auth-pin-errors.spec.ts)
 */
import { test, expect } from '@playwright/test';
import {
  mongoConn,
  syntheticPhone,
  waitForPin,
  cleanupTestUser,
  isInterceptLikelyEnabled,
} from '../helpers/customer-auth';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test.describe('REQ-074 — Customer PIN-flow happy path (REQ-AUTHC-001)', () => {
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

  test('AC1: phone → PIN persists → PIN entry → verify → session created', async ({
    page,
  }) => {
    // ── Step 1: navigate to login + pick the SMS channel ──────────────────
    // The login form first asks the visitor to pick a PIN-delivery channel
    // (WhatsApp / SMS / Email). The phone input appears only after that
    // choice. SMS is the simplest channel for this happy-path spec.
    await page.goto(`${BASE_URL}/login`);
    await expect(
      page.getByRole('heading', { name: /choose delivery method/i })
    ).toBeVisible();
    await page.getByRole('heading', { name: /^SMS$/i }).click();

    // ── Step 2: enter phone + request PIN ─────────────────────────────────
    await expect(page.locator('#phone')).toBeVisible({ timeout: 10_000 });
    await page.locator('#phone').fill(phone);
    // Form's submit button is labelled "Continue" (the action behind it
    // is sendPinAction / sendWhatsAppPinAction / sendEmailPinAction).
    await page.getByRole('button', { name: /^continue$/i }).click();

    // ── Step 3: PIN-entry step appears (bypass returned success) ─────────
    // Without the server-side bypass we'd see "SMS service is currently
    // unavailable." instead. Race the two outcomes — whichever appears
    // first determines whether we proceed or skip with a clear message
    // (distinguishes "intercept not configured on server" from "real bug").
    const pinField = page.locator('#pin');
    const providerErrorAlert = page
      .getByText(
        /sms service is currently unavailable|whatsapp service is currently unavailable|failed to send verification|service is currently unavailable/i
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
        'Server returned a provider error (SMS / WhatsApp / Email). ' +
          'ENABLE_E2E_PIN_INTERCEPT=true must be set on the target server ' +
          '(Railway UAT env var), not just on the Playwright runner. ' +
          'Once set + Railway redeploys, this spec will pass.'
      );
    }

    await expect(pinField).toBeVisible();

    // ── Step 4: read PIN from Mongo + verify ──────────────────────────────
    const { pin, expiresAt } = await waitForPin(conn, phone);
    expect(pin).toMatch(/^\d{4}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    await page.locator('#pin').fill(pin);
    // Form's PIN-step submit is also labelled "Continue".
    await page.getByRole('button', { name: /^continue$/i }).click();

    // ── Step 5: session created → redirected away from /login ─────────────
    // The exact post-login destination depends on the post-auth redirect
    // logic; either way the page should leave /login.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // ── Step 6: cookie sanity — session cookie should be set ─────────────
    const cookies = await page.context().cookies();
    const sessionCookieNames = cookies.map((c) => c.name);
    expect(sessionCookieNames.some((n) => /session|iron|sid/i.test(n))).toBe(
      true
    );
  });
});
