/**
 * @requirement REQ-065 — Self-service data export (#117 P4 #19)
 *
 * AC3 — `/api/user/export` returns 401 when not authenticated. No
 * session = no data. Proves the gate fires before any model lookup.
 *
 * @smoke
 * @requirement REQ-065
 */
import { test, expect } from '@playwright/test';

// Force an unauthenticated context — no storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('REQ-065 data export auth gate @smoke', () => {
  test('AC3 — GET /api/user/export without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/user/export');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/auth/i);
  });
});
