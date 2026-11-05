/**
 * @requirement REQ-117 — Customer sign-in over WhatsApp only, with a hashed,
 * rate-limited PIN and a 90-day customer session (WA-04, ADR-008).
 *
 * Runs under `ENABLE_E2E_PIN_INTERCEPT=true` (the CI default): the send action
 * stores the keyed hash exactly as in production, also writes the plaintext to
 * the test-only `verificationPin` field, and skips the Meta call. The two
 * notices that depend on a failed Meta send (not on WhatsApp, WhatsApp
 * unavailable) are driven through `mockSendPinResult`; the action's own
 * result shapes and the incident are unit-tested.
 *
 * AC6 (purge of never-verified users) and the PIN request limit of AC5 are
 * unit-tested; AC10 is covered here at the transport boundary.
 */
import { test, expect, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';
import { createHmac } from 'crypto';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import {
  mongoConn,
  mockSendPinResult,
  cleanupTestUser,
  seedVerifiedCustomer,
  cleanupSeededCustomer,
} from '../helpers/customer-auth';
import { getVerificationPinByPhone, uniquePhone } from '../smoke/helpers';

const NOT_ON_WHATSAPP =
  "This number isn't on WhatsApp. To order, please use the counter or call us.";
const UNAVAILABLE =
  'Online ordering is temporarily unavailable. Please order at the counter or call us.';
const DAY_S = 24 * 60 * 60;

async function userByDigits(
  digits: string
): Promise<Record<string, unknown> | null> {
  const conn = mongoConn();
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    return await client
      .db(conn.dbName)
      .collection('users')
      .findOne({ phone: { $regex: digits } });
  } finally {
    await client.close();
  }
}

async function countUsersByDigits(digits: string): Promise<number> {
  const conn = mongoConn();
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    return await client
      .db(conn.dbName)
      .collection('users')
      .countDocuments({ phone: { $regex: digits } });
  } finally {
    await client.close();
  }
}

async function deleteUsersByDigits(digits: string): Promise<void> {
  const conn = mongoConn();
  const client = new MongoClient(conn.uri);
  try {
    await client.connect();
    await client
      .db(conn.dbName)
      .collection('users')
      .deleteMany({ phone: { $regex: digits } });
  } finally {
    await client.close();
  }
}

async function dismissCookieBanner(page: Page) {
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

async function injectCart(page: Page) {
  await page.addInitScript(() => {
    const cartItem = {
      cartItemId: 'e2e-signin-item-1',
      id: '000000000000000000000117',
      menuItemId: '000000000000000000000117',
      name: 'E2E Signin Item',
      price: 500,
      quantity: 1,
      portionSize: 'full',
      portionMultiplier: 1.0,
      subtotal: 500,
      image: '',
      category: 'food',
      specialInstructions: '',
      preparationTime: 20,
    };
    window.localStorage.setItem(
      'wawa-cart-storage',
      JSON.stringify({
        state: { items: [cartItem], isOpen: false, tableNumber: undefined },
        version: 0,
      })
    );
  });
}

async function requestPin(page: Page, phone: string) {
  await page.goto('/login');
  await page.fill('#phone', phone);
  await page.getByRole('button', { name: /^continue$/i }).click();
}

test.describe('[REQ-117] customer sign-in over WhatsApp only', () => {
  test('[REQ-117][AC4] a visitor browses and builds a cart without signing in (US-A1.1)', async ({
    page,
  }) => {
    tagTest('REQ-117', 4);
    await dismissCookieBanner(page);
    await injectCart(page);

    await page.goto('/menu');
    await page.waitForLoadState('networkidle');

    expect(page.url()).not.toContain('/login');
    await expect(page.locator('[data-testid="cart-button"]')).toContainText(
      '1',
      { timeout: 15000 }
    );
    await evidenceShot(page, 'REQ-117', 4, 'anonymous-cart-no-signin');
  });

  test('[REQ-117][AC1][AC4] checkout asks for a phone number only, then returns to /checkout with the cart intact (US-A1.2)', async ({
    page,
  }) => {
    tagTest('REQ-117', [1, 4]);
    const { phone, digits } = uniquePhone();
    await dismissCookieBanner(page);
    await injectCart(page);

    try {
      await page.goto('/checkout');
      await page.waitForURL(/\/login\?redirect=(%2F|\/)checkout/, {
        timeout: 15000,
      });

      // AC1 — no method step, no SMS/email/guest choice, WhatsApp only.
      await expect(page.locator('#phone')).toBeVisible();
      await expect(
        page.getByRole('heading', { name: /choose delivery method/i })
      ).toHaveCount(0);
      await expect(page.getByText(/continue as guest/i)).toHaveCount(0);
      await expect(page.getByText(/text message to your phone/i)).toHaveCount(
        0
      );
      await expect(page.getByText(/6-digit PIN on WhatsApp/i)).toBeVisible();
      await evidenceShot(page, 'REQ-117', 1, 'phone-only-form');

      await page.fill('#phone', phone);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });

      const pin = await getVerificationPinByPhone(digits);
      expect(pin).toMatch(/^\d{6}$/);
      await page.fill('#pin', pin as string);
      await page.getByRole('button', { name: /verify & login/i }).click();

      // AC4 — back on /checkout, cart intact.
      await page.waitForURL(/\/checkout/, { timeout: 20000 });
      await page.waitForLoadState('networkidle');
      const stored = await page.evaluate(() =>
        window.localStorage.getItem('wawa-cart-storage')
      );
      expect(stored).toContain('E2E Signin Item');
      await expect(page.getByText('E2E Signin Item').first()).toBeVisible({
        timeout: 15000,
      });
      await evidenceShot(page, 'REQ-117', 4, 'back-on-checkout-cart-intact');
    } finally {
      await deleteUsersByDigits(digits);
    }
  });

  test('[REQ-117][AC2] a new number sees the order-messages consent locked on and marketing off; a returning number sees none (US-A1.3)', async ({
    page,
  }) => {
    tagTest('REQ-117', 2);
    await dismissCookieBanner(page);
    const fresh = uniquePhone();
    const returning = await seedVerifiedCustomer();

    try {
      await requestPin(page, fresh.phone);
      await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });

      const transactional = page.locator('#wa-transactional');
      await expect(transactional).toBeChecked();
      await expect(transactional).toBeDisabled();
      await expect(
        page.getByText(/WhatsApp messages about my orders and bookings/i)
      ).toBeVisible();
      await expect(page.locator('#wa-marketing')).not.toBeChecked();
      await expect(page.locator('#email-marketing')).not.toBeChecked();
      await evidenceShot(page, 'REQ-117', 2, 'consent-new-number');

      await page.goto('/login');
      await page.fill('#phone', returning.phone);
      await page.getByRole('button', { name: /^continue$/i }).click();
      await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#wa-transactional')).toHaveCount(0);
      await expect(page.locator('#wa-marketing')).toHaveCount(0);
    } finally {
      await deleteUsersByDigits(fresh.digits);
      await cleanupSeededCustomer(returning);
    }
  });

  test('[REQ-117][AC3] a number that is not on WhatsApp gets the terminal message and no other channel (US-A1.4)', async ({
    page,
  }) => {
    tagTest('REQ-117', 3);
    const { phone, digits } = uniquePhone();
    await dismissCookieBanner(page);
    await mockSendPinResult(page, {
      success: false,
      message: NOT_ON_WHATSAPP,
      errorCode: 'NOT_ON_WHATSAPP',
      notOnWhatsApp: true,
    });

    try {
      await requestPin(page, phone);

      const notice = page.getByTestId('signin-notice-not-on-whatsapp');
      await expect(notice).toBeVisible({ timeout: 15000 });
      await expect(notice).toContainText(NOT_ON_WHATSAPP);
      // Terminal: still the phone step, no PIN step and no other channel.
      await expect(page.locator('#pin')).toHaveCount(0);
      await expect(page.getByText(/sms|email me|by email/i)).toHaveCount(0);
      await evidenceShot(page, 'REQ-117', 3, 'not-on-whatsapp-terminal');
    } finally {
      await deleteUsersByDigits(digits);
    }
  });

  test('[REQ-117][AC9] when WhatsApp is unavailable the customer is told to order at the counter (US-A1.7)', async ({
    page,
  }) => {
    tagTest('REQ-117', 9);
    const { phone, digits } = uniquePhone();
    await dismissCookieBanner(page);
    await mockSendPinResult(page, {
      success: false,
      message: UNAVAILABLE,
      errorCode: 'SERVICE_DISABLED',
      serviceUnavailable: true,
    });

    try {
      await requestPin(page, phone);

      const notice = page.getByTestId('signin-notice-unavailable');
      await expect(notice).toBeVisible({ timeout: 15000 });
      await expect(notice).toContainText(UNAVAILABLE);
      await expect(page.locator('#pin')).toHaveCount(0);
      await evidenceShot(page, 'REQ-117', 9, 'whatsapp-unavailable-notice');
    } finally {
      await deleteUsersByDigits(digits);
    }
  });

  test('[REQ-117][AC5] only a keyed hash is stored and five wrong PINs invalidate it', async ({
    page,
  }) => {
    tagTest('REQ-117', 5);
    const { phone, digits } = uniquePhone();
    await dismissCookieBanner(page);

    try {
      await requestPin(page, phone);
      await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });
      const pin = (await getVerificationPinByPhone(digits)) as string;
      expect(pin).toMatch(/^\d{6}$/);

      const stored = await userByDigits(digits);
      expect(String(stored?.verificationPinHash)).toMatch(/^[0-9a-f]{64}$/);
      expect(stored?.verificationPinHash).not.toBe(pin);

      const wrong = String((Number(pin) + 1) % 1000000).padStart(6, '0');
      for (let attempt = 1; attempt <= 5; attempt++) {
        await page.fill('#pin', wrong);
        await page.getByRole('button', { name: /verify & login/i }).click();
        await expect
          .poll(
            async () =>
              ((await userByDigits(digits))?.pinAttempts as number) ?? 0,
            { timeout: 10000 }
          )
          .toBe(attempt);
      }

      // The fifth wrong attempt cleared the PIN: even the right one is refused.
      const after = await userByDigits(digits);
      expect(after?.verificationPinHash).toBeUndefined();
      await page.fill('#pin', pin);
      await page.getByRole('button', { name: /verify & login/i }).click();
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await expect(page.locator('#pin')).toBeVisible();
      await evidenceShot(
        page,
        'REQ-117',
        5,
        'pin-invalidated-after-five-wrong'
      );
    } finally {
      await deleteUsersByDigits(digits);
    }
  });

  test('[REQ-117][AC7] a customer session lasts 90 days and a staff session keeps 7 days (US-A1.6)', async ({
    browser,
  }) => {
    tagTest('REQ-117', 7);
    const cookieName = process.env.SESSION_COOKIE_NAME || 'wawa_session';
    const { phone, digits } = uniquePhone();

    // Customer
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    try {
      await dismissCookieBanner(customerPage);
      await requestPin(customerPage, phone);
      await expect(customerPage.locator('#pin')).toBeVisible({
        timeout: 15000,
      });
      const pin = (await getVerificationPinByPhone(digits)) as string;
      await customerPage.fill('#pin', pin);
      await customerPage
        .getByRole('button', { name: /verify & login/i })
        .click();
      await customerPage.waitForURL((u) => !/^\/login/.test(u.pathname), {
        timeout: 20000,
      });

      const customerCookie = (await customerContext.cookies()).find(
        (c) => c.name === cookieName
      );
      expect(customerCookie, 'customer session cookie').toBeTruthy();
      const customerTtl =
        (customerCookie!.expires as number) - Date.now() / 1000;
      expect(customerTtl).toBeGreaterThan(89 * DAY_S);
      expect(customerTtl).toBeLessThan(91 * DAY_S);
      await evidenceShot(customerPage, 'REQ-117', 7, 'customer-signed-in-90d');
    } finally {
      await customerContext.close();
      await deleteUsersByDigits(digits);
    }

    // Staff
    const username = process.env.E2E_ADMIN_USERNAME;
    const password = process.env.E2E_ADMIN_PASSWORD;
    test.skip(!username || !password, 'E2E admin credentials not configured');
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    try {
      await staffPage.goto('/admin/login');
      await staffPage.fill('#username', username as string);
      await staffPage.fill('#password', password as string);
      await staffPage.click('button:has-text("Login")');
      await staffPage.waitForURL(/\/dashboard/, { timeout: 20000 });

      const staffCookie = (await staffContext.cookies()).find(
        (c) => c.name === cookieName
      );
      expect(staffCookie, 'staff session cookie').toBeTruthy();
      const staffTtl = (staffCookie!.expires as number) - Date.now() / 1000;
      expect(staffTtl).toBeGreaterThan(6 * DAY_S);
      expect(staffTtl).toBeLessThan(8 * DAY_S);
    } finally {
      await staffContext.close();
    }
  });

  test('[REQ-117][AC8] an existing account stored with a local-format phone is re-verified and reused, never duplicated', async ({
    page,
  }) => {
    tagTest('REQ-117', 8);
    await dismissCookieBanner(page);
    const customer = await seedVerifiedCustomer();
    const digits = customer.phone.slice(-9);
    const conn = mongoConn();
    const client = new MongoClient(conn.uri);

    try {
      // Legacy shape: phone in local format, not verified.
      await client.connect();
      const local = `0${customer.phone.slice(4)}`;
      await client
        .db(conn.dbName)
        .collection('users')
        .updateOne(
          { phone: customer.phone },
          {
            $set: { phone: local, phoneVerified: false },
            $unset: { whatsappVerifiedAt: '' },
          }
        );

      await requestPin(page, customer.phone);
      await expect(page.locator('#pin')).toBeVisible({ timeout: 15000 });
      const pin = (await getVerificationPinByPhone(digits)) as string;
      expect(pin).toMatch(/^\d{6}$/);
      await page.fill('#pin', pin);
      await page.getByRole('button', { name: /verify & login/i }).click();
      await page.waitForURL((u) => !/^\/login/.test(u.pathname), {
        timeout: 20000,
      });

      expect(await countUsersByDigits(digits)).toBe(1);
      const user = await userByDigits(digits);
      expect(String(user?._id)).toBe(customer._id);
      expect(user?.phoneVerified).toBe(true);
      expect(user?.whatsappVerifiedAt).toBeTruthy();
      await evidenceShot(page, 'REQ-117', 8, 'legacy-account-reverified');
    } finally {
      await client.close();
      await cleanupSeededCustomer(customer);
    }
  });

  test('[REQ-117][AC10] an inbound WhatsApp message never mints a session cookie', async ({
    request,
  }) => {
    tagTest('REQ-117', 10);
    const secret = process.env.WHATSAPP_APP_SECRET;
    test.skip(!secret, 'WHATSAPP_APP_SECRET not configured for this run');
    const { digits } = uniquePhone();
    const from = `234${digits}`;
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '0',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550100000',
                  phone_number_id: '0',
                },
                contacts: [{ profile: { name: 'E2E Inbound' }, wa_id: from }],
                messages: [
                  {
                    from,
                    id: `wamid.e2e-nosession-${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: 'hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const signature = `sha256=${createHmac('sha256', secret as string)
      .update(payload)
      .digest('hex')}`;

    try {
      const response = await request.post('/api/webhooks/whatsapp', {
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
        },
        data: payload,
      });
      expect(response.status()).toBe(200);
      expect(response.headers()['set-cookie']).toBeUndefined();
    } finally {
      await cleanupTestUser(mongoConn(), `+${from}`);
      await deleteUsersByDigits(digits);
    }
  });
});
