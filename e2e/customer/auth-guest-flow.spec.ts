/**
 * @requirement REQ-074 — Customer journey E2E coverage (sub-issue #292)
 * @requirement REQ-117 — guest checkout is retired for customers (WA-04)
 * @requirement SRS REQ-AUTHC-003 — Browse without login; sign in at checkout
 *
 * Pins that an unauthenticated visitor can browse the customer-facing
 * surfaces without being forced into the PIN-login flow. The contract
 * the SRS calls out is: visitor lands → opens the menu → no login wall.
 * REQ-117 retires the other half of the old guest path: checkout itself now
 * needs a WhatsApp sign-in (covered by
 * e2e/critical/customer-signin-whatsapp-only.spec.ts and
 * e2e/smoke/req-084-checkout-separation.spec.ts).
 *
 * What this pins:
 *   ✓ `/` → /menu navigation works without authentication
 *   ✓ Navigating back to `/` from /menu does not log the visitor in
 *   ✓ Sign In remains the navbar auth surface across navigation (guest
 *     state is preserved across the navigation, no accidental session)
 *
 * What this does NOT pin (deferred to V2):
 *   ✗ Cart preservation across pages — needs cart-store fixture or a
 *     concrete add-to-cart selector that survives menu reshuffles; the
 *     SRS requirement mentions "cart preserved" but V1 pins only the
 *     navigation-without-login half of that
 *   ✗ Guest checkout completion — retired by REQ-117 (no guest checkout)
 */
import { test, expect } from '@playwright/test';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test.describe('[REQ-074][REQ-117] Browse-without-login flow (REQ-AUTHC-003)', () => {
  test('[REQ-117][AC4] a visitor navigates / → /menu → / without being forced to log in; no auth session minted', async ({
    page,
  }) => {
    tagTest('REQ-117', 4);
    // ── Start at the marketing splash ─────────────────────────────────────
    // The splash has no navbar (intentional — REQ-HOME-001/002 lives on
    // /menu); we only assert the View Menu CTA exists, not Sign In.
    await page.goto(`${BASE_URL}/`);
    const viewMenu = page.getByRole('link', { name: /view menu/i }).first();
    await expect(viewMenu).toBeVisible();

    // ── Click the CTA into the menu surface ───────────────────────────────
    await viewMenu.click();
    await expect(page).toHaveURL(/\/menu/);

    // On /menu (MainLayout) the navbar appears; guest sees Sign In.
    const signInOnMenu = page.getByRole('link', { name: /sign in/i }).first();
    await expect(signInOnMenu).toBeVisible({ timeout: 10_000 });
    await expect(signInOnMenu).toHaveAttribute('href', '/login');
    await evidenceShot(page, 'REQ-074', 6, 'guest-on-menu-sees-sign-in-link');
    await evidenceShot(page, 'REQ-117', 4, 'visitor-browses-without-signin');

    // ── Back to / via direct nav ──────────────────────────────────────────
    await page.goto(`${BASE_URL}/`);
    await expect(viewMenu).toBeVisible();

    // ── No AUTHENTICATED session should have been minted across the trip.
    // It's OK for an iron-session cookie to exist (it can track an
    // anonymous "guest" state). What we check: hitting /api/auth/user
    // either returns 401/no-user OR a user with phoneVerified=false.
    const userResp = await page.request.get(`${BASE_URL}/api/auth/user`);
    if (userResp.ok()) {
      const userBody = await userResp.json();
      if (userBody?.user) {
        expect(userBody.user.phoneVerified).not.toBe(true);
      }
    }
  });
});
