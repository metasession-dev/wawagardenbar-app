import { expect } from '@playwright/test';
import { superAdminTest, csrTest, isAuthenticated } from '../kitchen/helpers';

/**
 * RBAC route gating — a super-admin-only area is reachable by super-admin and
 * blocked for CSR. `/dashboard/settings` is gated by
 * requirePermission('settingsAndConfiguration') (CSR default: false →
 * redirect to /dashboard/forbidden; super-admin: allowed).
 *
 * SRS: REQ-AUTHA-004. @smoke
 * @requirement REQ-007
 */
function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI) throw new Error('Expected an authenticated session in CI but none was present');
  skip(true, 'session unavailable — run scripts/seed-e2e-admins.ts + set E2E_* (local only)');
}

superAdminTest.describe('RBAC gating — super-admin @smoke', () => {
  superAdminTest('REQ-AUTHA-004: super-admin can open /dashboard/settings', async ({ page }) => {
    guard(superAdminTest.skip, await isAuthenticated(page));
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });
});

csrTest.describe('RBAC gating — CSR @smoke', () => {
  csrTest('REQ-AUTHA-004: CSR is blocked from /dashboard/settings', async ({ page }) => {
    guard(csrTest.skip, await isAuthenticated(page));
    await page.goto('/dashboard/settings');
    await expect(page).toHaveURL(/\/dashboard\/forbidden/);
  });
});
