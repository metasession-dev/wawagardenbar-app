/**
 * @requirement REQ-074 — Customer journey E2E coverage (sub-issue #292)
 * @requirement SRS REQ-HOME-001 — Home page renders menu surface for guests
 * @requirement SRS REQ-HOME-002 — Home surfaces auth status (login link for guests)
 *
 * Pins the customer-facing landing flow as observed by an unauthenticated
 * visitor. The marketing home at `/` carries the hero + the "View Menu"
 * call-to-action; the menu listing at `/menu` carries the categories +
 * items. The navbar's "Sign In" link (visible only for guests) is the
 * auth-status surface called out in REQ-HOME-002.
 *
 * What this pins:
 *   ✓ `/` renders for an unauthenticated visitor (no 401, no auth redirect)
 *   ✓ Navbar shows "Sign In" → /login when the visitor is a guest
 *   ✓ The "View Menu" CTA links to /menu
 *   ✓ /menu renders the menu surface (items > 0 visible)
 *
 * What this does NOT pin (deferred):
 *   ✗ Logged-in user chip (covered by auth-pin-happy-path.spec.ts which
 *     creates a session; a dedicated assertion on the chip is V2 once
 *     storage-state from that spec is reusable)
 *   ✗ Featured-items section if one is added later — currently the home
 *     page has a hero + value-prop cards but no per-item featured carousel
 *   ✗ Mobile-menu surface (different `Sheet` trigger; V2)
 */
import { test, expect } from '@playwright/test';
import { evidenceShot } from '../helpers/evidence';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

test.describe('REQ-074 — Home + menu render for guests (REQ-HOME-001/002)', () => {
  test('marketing home (/) renders hero + View Menu CTA for guests', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/`);

    // Hero CTA — REQ-HOME-001 spirit (entry to menu).
    // The marketing splash is intentionally minimal (no MainLayout / no
    // navbar); auth status belongs on the menu/profile/orders surfaces
    // that use MainLayout — see the second test below.
    const viewMenu = page.getByRole('link', { name: /view menu/i }).first();
    await expect(viewMenu).toBeVisible();
    await expect(viewMenu).toHaveAttribute('href', '/menu');

    // Hero brand heading present — guards against the page silently
    // 500'ing on a missing seed (which would render only an empty main).
    await expect(
      page.getByRole('heading', { name: /wawa garden bar/i }).first()
    ).toBeVisible();
    await evidenceShot(page, 'REQ-074', 5, 'marketing-home-hero-view-menu-cta');
  });

  test('/menu renders menu items + navbar shows Sign In for guests', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/menu`);

    // The page itself shouldn't 404 or redirect to /login.
    await expect(page).toHaveURL(/\/menu/);

    // Auth status surface — REQ-HOME-002 (guest sees Sign In in navbar).
    // /menu uses MainLayout which includes Navbar; the desktop Sign In
    // link is visible above the md breakpoint.
    const signIn = page.getByRole('link', { name: /sign in/i }).first();
    await expect(signIn).toBeVisible({ timeout: 10_000 });
    await expect(signIn).toHaveAttribute('href', '/login');

    // Menu items render as cards; assert at least one price marker is
    // visible. Pins the shape, not the content (survives menu reshuffles).
    const priceMarker = page
      .locator('main')
      .getByText(/₦\s*\d|N\s*\d/i)
      .first();
    await expect(priceMarker).toBeVisible({ timeout: 10_000 });
    await evidenceShot(
      page,
      'REQ-074',
      5,
      'menu-page-items-and-navbar-sign-in'
    );
  });
});
