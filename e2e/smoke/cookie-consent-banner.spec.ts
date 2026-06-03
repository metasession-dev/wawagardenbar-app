/**
 * @requirement REQ-065 — Cookie consent banner (#117 P4 #20)
 *
 * AC5 — Banner renders on first visit (localStorage empty), persists
 * `{ acceptedAt, version: 'v1' }` on click + dismisses, and is absent
 * on subsequent visits.
 *
 * Unauthenticated context — the banner renders on every page including
 * the marketing home, so we don't need a logged-in session.
 *
 * @smoke
 * @requirement REQ-065
 */
import { test, expect } from '@playwright/test';
import { evidenceShot } from '../helpers/evidence';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('REQ-065 cookie consent banner @smoke', () => {
  test('AC5 — first visit shows banner; click "Got it" persists + dismisses; reload skips', async ({
    page,
  }) => {
    // First visit — localStorage is empty.
    await page.goto('/');
    const banner = page.getByTestId('cookie-consent-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/cookies for authentication and your cart/i)
    ).toBeVisible();

    await evidenceShot(page, 'REQ-065', 5, 'banner-first-visit');

    // Click "Got it" — banner should dismiss and consent persists.
    await page.getByRole('button', { name: /got it/i }).click();
    await expect(banner).toHaveCount(0);

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('cookieConsent')
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed.version).toBe('v1');
    expect(parsed.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Reload — banner must not reappear.
    await page.reload();
    await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0);

    await evidenceShot(page, 'REQ-065', 5, 'banner-dismissed-after-reload');
  });

  test('AC5 — banner stays absent when localStorage already has consent', async ({
    page,
  }) => {
    await page.goto('/');
    // Seed consent before the layout's useEffect runs by setting it then
    // forcing a re-render via a navigation.
    await page.evaluate(() =>
      window.localStorage.setItem(
        'cookieConsent',
        JSON.stringify({
          acceptedAt: '2026-06-03T12:00:00Z',
          version: 'v1',
        })
      )
    );
    await page.reload();
    await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0);
  });
});
