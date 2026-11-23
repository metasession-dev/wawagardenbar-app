/**
 * @requirement REQ-120 — customer journey helpers (home → menu → cart →
 * WhatsApp sign-in → checkout → paid by provider webhook)
 *
 * Drives the real UI. The only things not driven through the browser are the
 * ones that cannot be: the WhatsApp PIN is read back from Mongo
 * (`ENABLE_E2E_PIN_INTERCEPT`), and the payment gateway's "paid" callback is a
 * signed webhook, because the gateway call is made by the server.
 */
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { withMongo } from './db-assertions';
import { evidenceShot } from './evidence';
import { getVerificationPinByPhone } from '../smoke/helpers';
import { buildPaystackChargeSuccess } from './payment-provider-mock';
import { sendWebhook, signPaystackPayload } from './webhook-mock';

export type JourneyOrderType = 'dine-in' | 'pickup' | 'delivery';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

export async function dismissCookieBanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'cookieConsent',
        JSON.stringify({ acceptedAt: new Date().toISOString(), version: 'v1' })
      );
    } catch {
      /* best-effort */
    }
  });
}

/**
 * The server calls the gateway and the browser is then sent to its hosted
 * page. Abort that hop so the spec stays on the app (the gateway is out of
 * scope; the paid callback is simulated by a signed webhook).
 */
export async function blockGatewayNavigation(
  context: BrowserContext
): Promise<void> {
  const appOrigin = new URL(BASE_URL).origin;
  await context.route('**/*', async (route) => {
    const request = route.request();
    const isForeignDocument =
      request.resourceType() === 'document' &&
      new URL(request.url()).origin !== appOrigin;
    if (isForeignDocument) await route.abort();
    else await route.continue();
  });
}

/** Home page → menu link → add each seeded item through its detail modal. */
export async function browseAndFillCart(
  page: Page,
  itemIds: string[],
  evidenceAc: number
): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('a[href="/menu"]').first()).toBeVisible();
  await evidenceShot(page, 'REQ-120', evidenceAc, 'journey-home', {
    tier: 'feature',
  });
  await page.locator('a[href="/menu"]').first().click();
  await page.waitForURL(/\/menu/);
  await page.waitForLoadState('networkidle');

  for (const [index, id] of itemIds.entries()) {
    const card = page.locator(`[data-testid="menu-item-${id}"]`);
    await expect(card).toBeVisible({ timeout: 20000 });
    await card.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /add to cart/i }).click();
    await expect(page.locator('[data-testid="cart-button"]')).toContainText(
      String(index + 1),
      { timeout: 10000 }
    );
    // The add-to-cart button opens the cart sidebar; close it to reach the
    // next card.
    if (index < itemIds.length - 1) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  }
  await evidenceShot(page, 'REQ-120', evidenceAc, 'journey-cart-filled', {
    tier: 'feature',
  });
}

/** From the open cart, go to checkout: an anonymous visitor lands on sign-in. */
export async function proceedToCheckoutExpectSignIn(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Proceed to Checkout/i }).click();
  await page.waitForURL(/\/login\?redirect=(%2F|\/)checkout/, {
    timeout: 20000,
  });
  await expect(page.locator('#phone')).toBeVisible({ timeout: 15000 });
}

/** WhatsApp PIN sign-in on the page the visitor was sent to; ends on /checkout. */
export async function signInWithWhatsApp(
  page: Page,
  phone: string,
  digits: string
): Promise<void> {
  await page.fill('#phone', phone);
  await page.getByRole('button', { name: /^continue$/i }).click();
  await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });
  const pin = await getVerificationPinByPhone(digits);
  expect(pin).toMatch(/^\d{6}$/);
  await page.fill('#pin', pin as string);
  await page.getByRole('button', { name: /verify & login/i }).click();
  await page.waitForURL(/\/checkout/, { timeout: 25000 });
  await page.waitForLoadState('networkidle');
}

/**
 * REQ-121 — the one-page checkout: pick the order type, fill only what that
 * type needs, press Pay. A newly signed-in account has no name, so the page
 * asks for a first name once; pickup is "as soon as possible" by default.
 */
export async function completeCheckout(
  page: Page,
  type: JourneyOrderType,
  customer: { name: string; email: string; phone: string },
  tableNumber = 'T-E2E-120'
): Promise<void> {
  // The session and profile load in their own requests; Pay waits for them.
  await expect(page.getByText('Sign In', { exact: true })).toHaveCount(0, {
    timeout: 45000,
  });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('label[for^="order-type-"]').first()).toBeVisible({
    timeout: 20000,
  });
  // The form preselects an order type once its ordering options load, which
  // can land after an early click and put the default back. Click, let that
  // settle, and confirm the choice held; retry if it was overwritten.
  await expect(async () => {
    await page.locator(`label[for="order-type-${type}"]`).click();
    await page.waitForTimeout(600);
    await expect(page.locator(`input#order-type-${type}`)).toBeChecked({
      timeout: 2000,
    });
  }).toPass({ timeout: 20000 });

  const firstName = page.locator('input[name="firstName"]');
  if (await firstName.count()) {
    await firstName.fill(customer.name.split(' ')[0] || 'E2E');
  }
  if (type === 'dine-in') {
    await page.locator('input[name="tableNumber"]').fill(tableNumber);
  } else if (type === 'delivery') {
    await page.locator('input[name="deliveryStreet"]').fill('12 Test Road');
  }
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
}

export async function findOrderForUser(
  userDigits: string,
  timeoutMs = 20000
): Promise<any | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await withMongo(async (db) => {
      const user = await db
        .collection('users')
        .findOne({ phone: { $regex: userDigits } });
      if (!user) return null;
      return db
        .collection('orders')
        .findOne({ userId: user._id }, { sort: { createdAt: -1 } });
    });
    if (found) return found;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

export async function cleanupJourneyUser(userDigits: string): Promise<void> {
  await withMongo(async (db) => {
    const users = await db
      .collection('users')
      .find({ phone: { $regex: userDigits } })
      .toArray();
    const ids = users.map((u: any) => u._id);
    if (ids.length) {
      await db.collection('orders').deleteMany({ userId: { $in: ids } });
      await db.collection('users').deleteMany({ _id: { $in: ids } });
    }
  });
}

const GATEWAY_KEY = 'payment-gateway-config';

/**
 * Paystack's signing secret lives in SystemSettings (not env). Use the one
 * that is configured; otherwise write a test secret (leaving the active
 * provider alone) and give back a function that restores the original.
 */
export async function ensurePaystackSecret(): Promise<{
  secret: string;
  restore: () => Promise<void>;
}> {
  return withMongo(async (db) => {
    const col = db.collection('systemsettings');
    const existing = await col.findOne({ key: GATEWAY_KEY });
    const current = (existing?.value as any)?.paystack?.secretKey;
    if (typeof current === 'string' && current.trim()) {
      return { secret: current.trim(), restore: async () => {} };
    }
    const secret = 'e2e-paystack-secret-req120';
    const value = {
      ...((existing?.value as object) ?? {}),
      paystack: {
        enabled: false,
        mode: 'test',
        publicKey: '',
        ...(((existing?.value as any)?.paystack as object) ?? {}),
        secretKey: secret,
      },
    };
    await col.updateOne(
      { key: GATEWAY_KEY },
      { $set: { value } },
      { upsert: true }
    );
    return {
      secret,
      restore: async () => {
        await withMongo(async (db2) => {
          const c = db2.collection('systemsettings');
          if (existing) await c.replaceOne({ key: GATEWAY_KEY }, existing);
          else await c.deleteOne({ key: GATEWAY_KEY });
        });
      },
    };
  });
}

/**
 * Simulate Paystack confirming payment for this order: attach a reference
 * (the server-side gateway call is not interceptable), then deliver a signed
 * `charge.success` webhook and wait for the order to flip to paid.
 */
export async function payViaPaystackWebhook(
  order: any,
  secret: string
): Promise<{ status: number; paidOrder: any }> {
  const reference = `E2E-REQ120-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await withMongo(async (db) => {
    await db
      .collection('orders')
      .updateOne({ _id: order._id }, { $set: { paymentReference: reference } });
  });
  const payload = buildPaystackChargeSuccess({
    reference,
    amount: Math.round(order.total * 100),
  });
  const rawBody = JSON.stringify(payload);
  const res = await sendWebhook({
    baseUrl: BASE_URL,
    provider: 'paystack',
    rawBody,
    signature: signPaystackPayload(payload, secret),
  });
  const deadline = Date.now() + 15000;
  let paidOrder: any = null;
  while (Date.now() < deadline) {
    paidOrder = await withMongo(async (db) =>
      db.collection('orders').findOne({ _id: new ObjectId(order._id) })
    );
    if (paidOrder?.paymentStatus === 'paid') break;
    await new Promise((r) => setTimeout(r, 400));
  }
  return { status: res.status, paidOrder };
}
