/**
 * @requirement REQ-121 - One-page customer checkout (AC1 to AC6)
 * @srs REQ-CHECKOUT-014, REQ-CHECKOUT-015, REQ-CHECKOUT-016,
 *      REQ-CHECKOUT-017, REQ-CHECKOUT-018, REQ-CHECKOUT-006
 *
 * Drives the real checkout page for a signed-in customer (a baked session
 * cookie, like the other checkout specs). The payment gateway is out of
 * scope: the app is run with test payments on and any foreign navigation is
 * aborted. The closed-hours story (US-A2.12) rewrites shop-wide settings, so
 * it lives in `checkout-closed-hours.spec.ts` and runs alone.
 */
import { test, expect, type Page } from '@playwright/test';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import {
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  seedVerifiedCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  cleanupMenuItem,
  seedPricedMenuItem,
} from '../helpers/customer-order-seed';
import {
  expectOrderType,
  injectCart,
  naira,
  openCheckout,
  payButton,
  reopenCheckout,
  giveOwnClientIp,
} from '../helpers/checkout-page';
import { blockGatewayNavigation } from '../helpers/customer-journey';
import { pollForDoc, withMongo } from '../helpers/db-assertions';
import { ObjectId } from 'mongodb';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PRICE = 5000;

test.describe.configure({ timeout: 90_000 });

let itemId: string;
const customers: SeededCustomerForSession[] = [];

test.beforeAll(async () => {
  itemId = await seedPricedMenuItem(PRICE);
});

test.afterAll(async () => {
  await cleanupMenuItem(itemId);
  for (const customer of customers) {
    await withMongo(async (db) => {
      await db
        .collection('orders')
        .deleteMany({ userId: new ObjectId(customer._id) });
    });
    await cleanupSeededCustomer(customer);
  }
});

async function signedInCheckout(
  page: Page,
  options: Parameters<typeof seedVerifiedCustomer>[0] = {},
  query = ''
): Promise<SeededCustomerForSession> {
  const customer = await seedVerifiedCustomer(options);
  customers.push(customer);
  await giveOwnClientIp(page.context());
  await attachCustomerSessionToContext(page.context(), customer, BASE_URL);
  await blockGatewayNavigation(page.context());
  await injectCart(page, itemId, PRICE);
  await openCheckout(page, query);
  return customer;
}

/** The number in the summary's Total row. */
async function readTotal(page: Page): Promise<number> {
  const text = await page
    .getByText('Total', { exact: true })
    .locator('xpath=..')
    .innerText();
  const match = text.match(/₦\s?([\d,]+(?:\.\d+)?)/);
  if (!match) throw new Error(`No total in: ${text}`);
  return Number(match[1].replace(/,/g, ''));
}

test.describe('[REQ-121] one-page customer checkout', () => {
  test('[REQ-121][AC1][AC2] [US-A2.1] a named customer sees one page with a single Pay and no name, email or phone field', async ({
    page,
  }) => {
    tagTest('REQ-121', [1, 2]);
    await signedInCheckout(page);

    // One page: no stepper, no Back/Next, no customer-info, tab or payment-method step.
    await expect(page.getByRole('button', { name: /^Next$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Back$/ })).toHaveCount(0);
    await expect(
      page.getByText(
        /Customer Info|Select Payment Method|Payment Options|Proceed to Payment|Open a New Tab/i
      )
    ).toHaveCount(0);
    await expect(page.locator('label[for="new-tab"]')).toHaveCount(0);

    // No name, email, phone or payment-method inputs for a named customer.
    for (const name of [
      'customerName',
      'customerEmail',
      'customerPhone',
      'firstName',
      'paymentMethod',
      'tipPaymentMethod',
    ]) {
      await expect(page.locator(`[name="${name}"]`)).toHaveCount(0);
    }

    // The order type selector and exactly one Pay button.
    await expect(
      page.locator('label[for^="order-type-"]').first()
    ).toBeVisible();
    await expect(payButton(page)).toHaveCount(1);
    await evidenceShot(page, 'REQ-121', 1, 'one-page-checkout');
  });

  test('[REQ-121][AC2] [US-A2.2] an account without a name is asked for a first name once, and it is saved', async ({
    page,
  }) => {
    tagTest('REQ-121', 2);
    const customer = await signedInCheckout(page, { noName: true });
    await expectOrderType(page, 'dine-in');

    // Exactly one name field, and no email or phone.
    await expect(page.locator('input[name="firstName"]')).toHaveCount(1);
    await expect(page.locator('[name="customerEmail"]')).toHaveCount(0);
    await expect(page.locator('[name="customerPhone"]')).toHaveCount(0);

    // It is required.
    await page.locator('input[name="tableNumber"]').fill('T-E2E-121');
    await payButton(page).click();
    await expect(page.getByText('Please enter your first name')).toBeVisible();
    await evidenceShot(page, 'REQ-121', 2, 'first-name-required');

    // Entering it places the order and saves the name to the profile.
    await page.locator('input[name="firstName"]').fill('Ngozi');
    await payButton(page).click();
    const order = await pollForDoc<{ _id: ObjectId; dineInDetails: any }>(
      'orders',
      { userId: new ObjectId(customer._id) },
      { timeoutMs: 20000 }
    );
    expect(order).not.toBeNull();
    expect(order?.dineInDetails?.tableNumber).toBe('T-E2E-121');
    const saved = await pollForDoc<{ firstName?: string; name?: string }>(
      'users',
      { _id: new ObjectId(customer._id), firstName: 'Ngozi' },
      { timeoutMs: 10000 }
    );
    expect(saved?.name).toBe('Ngozi');

    // Next time the account has a name, so the field is gone.
    // The cart was cleared by the order, so refill it before checking.
    await injectCart(page, itemId, PRICE);
    await reopenCheckout(page);
    await expect(page.locator('input[name="firstName"]')).toHaveCount(0);
  });

  test('[REQ-121][AC3][AC5] [US-A2.3] dine-in: the table is prefilled from ?table=12 and there are no address fields', async ({
    page,
  }) => {
    tagTest('REQ-121', [3, 5]);
    await signedInCheckout(page, {}, '?type=dine-in&table=12');
    await expectOrderType(page, 'dine-in');
    await expect(page.locator('input[name="tableNumber"]')).toHaveValue('12');
    // Nothing for another order type.
    for (const name of [
      'deliveryStreet',
      'deliveryCity',
      'deliveryState',
      'deliveryPostalCode',
      'deliveryCountry',
      'deliveryStreet2',
    ]) {
      await expect(page.locator(`[name="${name}"]`)).toHaveCount(0);
    }
    await expect(page.locator('#pickup-asap')).toHaveCount(0);
    await evidenceShot(page, 'REQ-121', 3, 'dine-in-table-prefilled');
  });

  test('[REQ-121][AC5] the order type is preselected from ?type=, else the last one used', async ({
    page,
  }) => {
    tagTest('REQ-121', 5);
    await signedInCheckout(page, {}, '?type=delivery');
    await expectOrderType(page, 'delivery');
    await reopenCheckout(page, '?type=pickup');
    await expectOrderType(page, 'pickup');

    // An unknown type is ignored; with no history the first enabled type is used.
    await reopenCheckout(page, '?type=tab');
    await expectOrderType(page, 'dine-in');

    // With no ?type=, the type used last time is selected.
    await page.evaluate(() =>
      window.localStorage.setItem('wgb:last-order-type', 'pickup')
    );
    await reopenCheckout(page);
    await expectOrderType(page, 'pickup');
    await evidenceShot(page, 'REQ-121', 5, 'last-used-type-preselected');
  });

  test('[REQ-121][AC3] [US-A2.4] pickup: as soon as possible is selected and there are no address fields', async ({
    page,
  }) => {
    tagTest('REQ-121', 3);
    await signedInCheckout(page, {}, '?type=pickup');
    await expectOrderType(page, 'pickup');
    await expect(page.locator('#pickup-asap')).toHaveAttribute(
      'data-state',
      'checked'
    );
    await expect(page.getByText('As soon as possible')).toBeVisible();
    await expect(page.locator('input[name="deliveryStreet"]')).toHaveCount(0);
    await expect(page.locator('input[name="tableNumber"]')).toHaveCount(0);
    await evidenceShot(page, 'REQ-121', 3, 'pickup-asap-default');

    // Scheduling for later reveals a time picker.
    await page.locator('label[for="pickup-later"]').click();
    await expect(
      page.locator('[role="combobox"], input[type="datetime-local"]').first()
    ).toBeVisible();
  });

  test('[REQ-121][AC3] [US-A2.5] delivery: the saved address is preselected and the fee is shown; a new address is one line plus a landmark', async ({
    page,
  }) => {
    tagTest('REQ-121', 3);
    await signedInCheckout(
      page,
      {
        addresses: [
          {
            streetAddress: '5 Ring Road',
            city: 'Ibadan',
            state: 'Oyo',
            isDefault: true,
          },
        ],
      },
      '?type=delivery'
    );
    await expectOrderType(page, 'delivery');

    // The saved address is preselected; there is no address input yet.
    const saved = page.getByTestId('saved-address');
    await expect(saved).toBeVisible();
    await expect(saved).toContainText('5 Ring Road');
    await expect(page.locator('input[name="deliveryStreet"]')).toHaveCount(0);
    // The delivery fee is part of the summary before the customer pays.
    await expect(page.getByText('Delivery Fee')).toBeVisible();
    await evidenceShot(page, 'REQ-121', 3, 'delivery-saved-address');

    // A different address is one line, a landmark and optional instructions only.
    await page.getByRole('button', { name: 'Use a different address' }).click();
    await expect(page.locator('input[name="deliveryStreet"]')).toBeVisible();
    await expect(page.locator('input[name="deliveryLandmark"]')).toBeVisible();
    for (const name of [
      'deliveryStreet2',
      'deliveryCity',
      'deliveryState',
      'deliveryPostalCode',
      'deliveryCountry',
    ]) {
      await expect(page.locator(`[name="${name}"]`)).toHaveCount(0);
    }
  });

  test('[REQ-121][AC4] [US-A2.11] an inline tip adds 10% to the total and there is no tip payment method', async ({
    page,
  }) => {
    tagTest('REQ-121', 4);
    await signedInCheckout(page, {}, '?type=dine-in&table=12');

    // Fees arrive after the page renders; read the baseline once they are in.
    await expect(page.getByText(/Service Fee/)).toBeVisible();
    await page.waitForLoadState('networkidle');
    const before = await readTotal(page);
    await expect(page.getByTestId('tip-options')).toHaveCount(0);

    // "Add a tip" expands inline with presets and a custom amount.
    await page.locator('#add-tip').click();
    await expect(page.getByTestId('tip-options')).toBeVisible();
    for (const label of ['5%', '10%', '15%']) {
      await expect(
        page.getByRole('button', { name: label, exact: true })
      ).toBeVisible();
    }
    await expect(page.locator('#tip-custom')).toBeVisible();

    await page.getByRole('button', { name: '10%', exact: true }).click();
    const tip = PRICE * 0.1;
    await expect(page.getByText('Tip', { exact: true })).toBeVisible();
    await expect(page.getByText(naira(tip)).first()).toBeVisible();
    await expect.poll(() => readTotal(page)).toBe(before + tip);

    // The customer never chooses how the tip is paid.
    await expect(page.locator('[name="tipPaymentMethod"]')).toHaveCount(0);
    await expect(page.getByText(/tip.*(cash|transfer|POS)/i)).toHaveCount(0);
    await evidenceShot(page, 'REQ-121', 4, 'inline-tip-10-percent');

    // A custom amount replaces the preset; unchecking removes the tip.
    await page.locator('#tip-custom').fill('250');
    await expect.poll(() => readTotal(page)).toBe(before + 250);
    await page.locator('#add-tip').click();
    await expect.poll(() => readTotal(page)).toBe(before);
  });

  test('[REQ-121][AC4] the tip is part of the charge: the order total includes it', async ({
    page,
  }) => {
    tagTest('REQ-121', 4);
    const customer = await signedInCheckout(
      page,
      {},
      '?type=dine-in&table=T-E2E-TIP'
    );
    await page.locator('#add-tip').click();
    await page.getByRole('button', { name: '10%', exact: true }).click();
    await payButton(page).click();

    const order = await pollForDoc<{
      subtotal: number;
      tipAmount: number;
      total: number;
      tipPaymentMethod?: string;
    }>('orders', { userId: new ObjectId(customer._id) }, { timeoutMs: 20000 });
    expect(order).not.toBeNull();
    expect(order?.subtotal).toBe(PRICE);
    expect(order?.tipAmount).toBe(PRICE * 0.1);
    expect(order?.total).toBeGreaterThanOrEqual(PRICE + PRICE * 0.1);
    // The customer chose no method; the tip is charged online with the order,
    // which the order model records as card (REQ-035 needs one).
    expect(order?.tipPaymentMethod).toBe('card');
  });

  test('[REQ-121][AC6] a missing required field is shown next to that field', async ({
    page,
  }) => {
    tagTest('REQ-121', 6);
    await signedInCheckout(page, {}, '?type=dine-in');
    await expect(page.locator('input[name="tableNumber"]')).toHaveValue('');
    await payButton(page).click();
    await expect(
      page.getByText('Table number is required for dine-in orders')
    ).toBeVisible();
    await expect(page.getByTestId('checkout-error')).toHaveCount(0);
    await evidenceShot(page, 'REQ-121', 6, 'field-error-inline');
  });

  test('[REQ-121][AC6] a typed error from the order service is shown inline above Pay and creates no order', async ({
    page,
  }) => {
    tagTest('REQ-121', 6);
    const customer = await signedInCheckout(
      page,
      {},
      '?type=dine-in&table=T-E2E-ERR'
    );
    // The item sells out after the page loaded: the server refuses the order.
    await withMongo(async (db) => {
      await db
        .collection('menuitems')
        .updateOne(
          { _id: new ObjectId(itemId) },
          { $set: { isAvailable: false } }
        );
    });
    try {
      await payButton(page).click();
      const alert = page.getByTestId('checkout-error');
      await expect(alert).toBeVisible({ timeout: 15000 });
      await expect(alert).not.toBeEmpty();
      // Inline, not a dialog; the customer can fix the cart and try again.
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(payButton(page)).toBeEnabled();
      await evidenceShot(page, 'REQ-121', 6, 'typed-error-inline');
      const orders = await withMongo(async (db) =>
        db
          .collection('orders')
          .countDocuments({ userId: new ObjectId(customer._id) })
      );
      expect(orders).toBe(0);
    } finally {
      await withMongo(async (db) => {
        await db
          .collection('menuitems')
          .updateOne(
            { _id: new ObjectId(itemId) },
            { $set: { isAvailable: true } }
          );
      });
    }
  });
});
