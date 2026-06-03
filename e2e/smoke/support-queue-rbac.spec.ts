/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)
 *
 * AC4 — RBAC gate on `/dashboard/support`. The section layout
 * (`app/dashboard/support/layout.tsx`) requires csr / admin / super-admin.
 * Customer (or any non-staff) hits the same /dashboard/forbidden gate
 * the rest of the dashboard uses.
 *
 * Smoke test — RBAC gating on a new admin surface is load-bearing.
 *
 * @smoke
 * @requirement REQ-064
 */
import { expect } from '@playwright/test';
import {
  csrTest,
  adminTest,
  superAdminTest,
  isAuthenticated,
} from '../kitchen/helpers';

function guard(skip: (cond: boolean, reason: string) => void, ok: boolean) {
  if (ok) return;
  if (process.env.CI)
    throw new Error(
      'Expected an authenticated session in CI but none was present'
    );
  skip(
    true,
    'session unavailable — run scripts/seed-e2e-admins.ts + set E2E_* (local only)'
  );
}

csrTest.describe('REQ-064 RBAC — CSR can access support queue @smoke', () => {
  csrTest('AC4 — CSR can open /dashboard/support', async ({ page }) => {
    guard(csrTest.skip, await isAuthenticated(page));
    await page.goto('/dashboard/support');
    await expect(page).toHaveURL(/\/dashboard\/support/);
    await expect(
      page.getByRole('heading', { name: /support queue/i })
    ).toBeVisible();
  });
});

adminTest.describe(
  'REQ-064 RBAC — admin can access support queue @smoke',
  () => {
    adminTest('AC4 — admin can open /dashboard/support', async ({ page }) => {
      guard(adminTest.skip, await isAuthenticated(page));
      await page.goto('/dashboard/support');
      await expect(page).toHaveURL(/\/dashboard\/support/);
    });
  }
);

superAdminTest.describe(
  'REQ-064 RBAC — super-admin can access support queue @smoke',
  () => {
    superAdminTest(
      'AC4 — super-admin can open /dashboard/support',
      async ({ page }) => {
        guard(superAdminTest.skip, await isAuthenticated(page));
        await page.goto('/dashboard/support');
        await expect(page).toHaveURL(/\/dashboard\/support/);
      }
    );
  }
);
