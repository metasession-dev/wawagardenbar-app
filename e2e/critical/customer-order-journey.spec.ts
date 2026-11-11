/**
 * @requirement REQ-120 — Single customer order service (WA-05)
 *
 * US-A2.1 to US-A2.3: the whole customer journey in a browser. A visitor
 * lands on the home page, goes to the menu, adds items, is made to sign in with
 * the WhatsApp PIN, returns to checkout with the cart intact, completes
 * checkout for dine-in, pickup or delivery, and the order is created for them
 * through `createCustomerOrder` (customer origin, channel web, `WG` + 10 digit
 * number, server totals). Payment is then confirmed with a signed Paystack
 * `charge.success` webhook and the order becomes paid.
 *
 * The gateway call is made by the server, so the spec sets the order's payment
 * reference itself and the browser's hop to the gateway is aborted.
 *
 * Runs alone (`AGGREGATE_SPECS`): it sets shop-wide opening hours.
 */
import { test, expect } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import { uniquePhone } from '../smoke/helpers';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
} from '../helpers/customer-order-seed';
import {
  allDaysOpen,
  applySettings,
  snapshotSettings,
  restoreSettings,
} from '../helpers/settings-control';
import {
  blockGatewayNavigation,
  browseAndFillCart,
  cleanupJourneyUser,
  completeCheckout,
  dismissCookieBanner,
  ensurePaystackSecret,
  findOrderForUser,
  payViaPaystackWebhook,
  proceedToCheckoutExpectSignIn,
  signInWithWhatsApp,
  type JourneyOrderType,
} from '../helpers/customer-journey';

const PRICES = [4000, 3000];
const SETTING_KEYS = [
  'businessHours',
  'minimumOrderAmount',
  'maxOrdersPerHour',
  'pickupEnabled',
  'deliveryEnabled',
  'dineInEnabled',
];

// A browser journey with sign-in, four checkout steps and DB polling.
test.describe.configure({ timeout: 90_000 });

test.describe.configure({ mode: 'serial' });

let snapshot: Record<string, unknown>;
let itemIds: string[] = [];
let paystack: Awaited<ReturnType<typeof ensurePaystackSecret>>;

test.beforeAll(async () => {
  snapshot = await snapshotSettings(SETTING_KEYS);
  await applySettings({
    ...allDaysOpen(),
    minimumOrderAmount: 1000,
    maxOrdersPerHour: 100000,
    pickupEnabled: true,
    deliveryEnabled: true,
    dineInEnabled: true,
  });
  itemIds = [];
  for (const price of PRICES) itemIds.push(await seedPricedMenuItem(price));
  paystack = await ensurePaystackSecret();
});

test.afterAll(async () => {
  await restoreSettings(snapshot);
  await paystack?.restore();
  for (const id of itemIds) await cleanupMenuItem(id);
});

const TYPES: JourneyOrderType[] = ['dine-in', 'pickup', 'delivery'];

test.describe('[REQ-120] customer journey from the home page to a paid order', () => {
  for (const type of TYPES) {
    test(`[REQ-120][AC1][AC2][AC4] [US-A2.${TYPES.indexOf(type) + 1}] ${type}: home, menu, cart, WhatsApp sign-in, checkout, order created, paid by Paystack webhook`, async ({
      page,
      context,
    }) => {
      tagTest('REQ-120', [1, 2, 4]);
      const { phone, digits } = uniquePhone();
      await dismissCookieBanner(page);
      await blockGatewayNavigation(context);

      try {
        // Home → menu → cart.
        await browseAndFillCart(page, itemIds, 1);

        // Checkout is gated by the WhatsApp sign-in (no guest checkout).
        await proceedToCheckoutExpectSignIn(page);
        await evidenceShot(page, 'REQ-120', 1, `journey-${type}-signin`, {
          tier: 'feature',
        });
        await signInWithWhatsApp(page, phone, digits);

        // Back on checkout with both items still in the cart.
        const stored = await page.evaluate(() =>
          window.localStorage.getItem('wawa-cart-storage')
        );
        for (const price of PRICES) expect(stored).toContain(String(price));
        await evidenceShot(page, 'REQ-120', 1, `journey-${type}-checkout`, {
          tier: 'feature',
        });

        await completeCheckout(page, type, {
          name: 'E2E Journey',
          email: `journey-${digits}@e2e.local`,
          phone,
        });

        // The order exists for this customer, created by the single service.
        const order = await findOrderForUser(digits);
        expect(order).not.toBeNull();
        expect(order.origin).toBe('customer');
        expect(order.channel).toBe('web');
        expect(order.orderType).toBe(type);
        expect(order.orderNumber).toMatch(/^WG\d{10}$/);
        expect(order.subtotal).toBe(PRICES.reduce((a, b) => a + b, 0));
        expect(order.total).toBeGreaterThanOrEqual(order.subtotal);
        expect(order.tabId).toBeUndefined();
        expect(order.guestEmail).toBeUndefined();
        expect(order.paymentStatus).toBe('pending');
        expect(order.status).toBe('pending');
        if (type === 'dine-in')
          expect(order.dineInDetails.tableNumber).toBe('T-E2E-120');
        if (type === 'delivery')
          expect(order.deliveryDetails.address.street).toBe('12 Test Road');
        await evidenceShot(page, 'REQ-120', 2, `journey-${type}-order-created`);

        // The provider confirms payment (signed Paystack charge.success).
        const { status, paidOrder } = await payViaPaystackWebhook(
          order,
          paystack.secret
        );
        expect(status).toBe(200);
        expect(paidOrder.paymentStatus).toBe('paid');
        expect(paidOrder.status).toBe('confirmed');
      } finally {
        await cleanupJourneyUser(digits);
      }
    });
  }
});
