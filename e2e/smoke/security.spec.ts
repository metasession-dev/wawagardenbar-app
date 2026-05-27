import { expect } from '@playwright/test';
import { adminTest, isAuthenticated } from '../kitchen/helpers';

/**
 * Session cookie hardening — the iron-session cookie is httpOnly and
 * sameSite=Lax (deeper than requirements-verification's httpOnly-only check).
 * `Secure` is asserted only in production builds, so it's not checked here.
 *
 * SRS: REQ-SEC-002. @smoke
 * @requirement REQ-007
 */
adminTest.describe('Security — session cookie flags @smoke', () => {
  adminTest('REQ-SEC-002: wawa_session cookie is httpOnly + sameSite=Lax', async ({ page, context }) => {
    if (!(await isAuthenticated(page))) {
      if (process.env.CI) throw new Error('Expected an authenticated session in CI but none was present');
      adminTest.skip(true, 'admin session unavailable (local only)');
    }

    const session = (await context.cookies()).find((c) => c.name === 'wawa_session');
    expect(session, 'wawa_session cookie should be present').toBeTruthy();
    expect(session!.httpOnly, 'httpOnly').toBe(true);
    expect(session!.sameSite, 'sameSite').toBe('Lax');
  });
});
