/**
 * @requirement REQ-121 — helpers for the one-page customer checkout specs
 *
 * The cart lives in localStorage, so a spec puts the item there and opens the
 * checkout page. The customer is signed in by a baked session cookie
 * (`attachCustomerSessionToContext`), the same way the other checkout specs do.
 */
import { expect, type BrowserContext, type Page } from '@playwright/test';

/** Put one priced menu item in the cart before the page loads. */
export async function injectCart(
  page: Page,
  itemId: string,
  price = 5000,
  name = 'E2E Order Item'
): Promise<void> {
  await page.addInitScript(
    ({ id, unit, label }) => {
      window.localStorage.setItem(
        'wawa-cart-storage',
        JSON.stringify({
          state: {
            items: [
              {
                cartItemId: 'e2e-121-1',
                id,
                menuItemId: id,
                name: label,
                price: unit,
                quantity: 1,
                portionSize: 'full',
                portionMultiplier: 1,
                subtotal: unit,
                image: '',
                category: 'food',
                specialInstructions: '',
                preparationTime: 10,
              },
            ],
            isOpen: false,
          },
          version: 0,
        })
      );
      // No cookie banner over the Pay button.
      window.localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ acceptedAt: new Date().toISOString(), version: 'v1' })
      );
    },
    { id: itemId, unit: price, label: name }
  );
}

/**
 * Open /checkout (through /menu so the cart store rehydrates first) and wait
 * for the one-page form: the order type selector and the Pay button.
 */
export async function openCheckout(page: Page, query = ''): Promise<void> {
  await page.goto('/menu');
  await page.waitForLoadState('networkidle');
  await page.goto(`/checkout${query}`);
  // The session and the profile (name, saved addresses) arrive in their own
  // requests, and Pay stays disabled until they do. The header shows "Sign In"
  // until the session is known.
  await expect(page.getByText('Sign In', { exact: true })).toHaveCount(0, {
    timeout: 45000,
  });
  await page.waitForLoadState('networkidle');
  await expect(payButton(page)).toBeVisible({ timeout: 25000 });
  await expect(page.locator('label[for^="order-type-"]').first()).toBeVisible({
    timeout: 15000,
  });
}

export function payButton(page: Page) {
  return page.getByRole('button', { name: /^(Pay|Processing\.\.\.)$/ });
}

/** The radio for an order type is checked. */
export async function expectOrderType(
  page: Page,
  type: 'dine-in' | 'pickup' | 'delivery'
): Promise<void> {
  await expect(page.locator(`#order-type-${type}`)).toHaveAttribute(
    'data-state',
    'checked'
  );
}

/** Text shown for a naira amount in the summary, e.g. 5000 -> "₦5,000". */
export function naira(amount: number): RegExp {
  return new RegExp(`₦\\s?${amount.toLocaleString('en-NG')}(\\.00)?`);
}

/**
 * Give this browser context its own client IP.
 *
 * The app rate-limits `/api/auth/*` to 5 requests a minute per IP (`proxy.ts`,
 * `lib/rate-limiter.ts`), and every page load calls `/api/auth/session` and
 * `/api/auth/user`. A spec run from one machine shares one IP, so after a few
 * page loads the client gets 429 and the header shows "Sign In" for a signed-in
 * customer. The proxy reads the client IP from `x-real-ip`, so each context
 * sends its own, which gives it its own bucket. Test-only; no app code changes.
 */
export async function giveOwnClientIp(context: BrowserContext): Promise<void> {
  const octet = () => 1 + Math.floor(Math.random() * 253);
  await context.setExtraHTTPHeaders({
    'x-real-ip': `10.${octet()}.${octet()}.${octet()}`,
  });
}

/**
 * Open /checkout again in the same context (a second or third page load in one
 * test): a fresh client IP keeps the auth rate limit from tripping, then wait
 * for the signed-in one-page form.
 */
export async function reopenCheckout(page: Page, query = ''): Promise<void> {
  await giveOwnClientIp(page.context());
  await page.goto(`/checkout${query}`);
  await expect(page.getByText('Sign In', { exact: true })).toHaveCount(0, {
    timeout: 45000,
  });
  await page.waitForLoadState('networkidle');
  await expect(payButton(page)).toBeVisible({ timeout: 25000 });
}
