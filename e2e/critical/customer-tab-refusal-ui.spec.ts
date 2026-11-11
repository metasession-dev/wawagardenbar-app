/**
 * @requirement REQ-120 — Tabs are staff-only (WA-05)
 *
 * US-B2.4 in the browser. A signed-in customer cannot reach the staff tab and
 * Express pages, sees no tab choice at checkout, and an order placed for a
 * table that has an open staff tab is a standalone order: the tab and its
 * orders are left exactly as staff had them. (The server actions and the
 * public API are refused in unit tests and in `customer-cannot-use-tabs`.)
 */
import { test, expect } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import {
  seedVerifiedCustomer,
  attachCustomerSessionToContext,
  cleanupSeededCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
} from '../helpers/customer-order-seed';
import { withMongo } from '../helpers/db-assertions';
import { isRefused } from '../helpers/staff-roles';
import {
  blockGatewayNavigation,
  completeCheckout,
  dismissCookieBanner,
} from '../helpers/customer-journey';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const STAMP = Date.now().toString(36);
const TABLE = `T-REQ120-${STAMP}`;

// A browser journey with sign-in, four checkout steps and DB polling.
test.describe.configure({ timeout: 90_000 });

let customer: SeededCustomerForSession;
let itemId: string;
let tabId: ObjectId;

test.beforeAll(async () => {
  customer = await seedVerifiedCustomer();
  itemId = await seedPricedMenuItem(5000);
  tabId = new ObjectId();
  // A tab opened by staff for the table, with no orders yet.
  await withMongo(async (db) => {
    await db.collection('tabs').insertOne({
      _id: tabId,
      tabNumber: `E2E-120-${STAMP}`,
      tableNumber: TABLE,
      status: 'open',
      paymentStatus: 'unpaid',
      items: [],
      total: 0,
      orders: [],
      createdByRole: 'csr',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
});

test.afterAll(async () => {
  await withMongo(async (db) => {
    await db.collection('orders').deleteMany({
      userId: new ObjectId(customer._id),
    });
    await db.collection('tabs').deleteOne({ _id: tabId });
  });
  await cleanupMenuItem(itemId);
  await cleanupSeededCustomer(customer);
});

test.beforeEach(async ({ page, context }) => {
  await dismissCookieBanner(page);
  await blockGatewayNavigation(context);
  await attachCustomerSessionToContext(context, customer, BASE_URL);
});

test.describe('[REQ-120] a customer in the browser cannot use tabs', () => {
  test('[REQ-120][AC6] [US-B2.4] the staff tab and Express pages are refused to a customer', async ({
    page,
  }) => {
    tagTest('REQ-120', 6);
    for (const path of [
      '/dashboard/orders/tabs',
      `/dashboard/orders/tabs/${tabId.toString()}`,
      '/dashboard/orders/express/create-tab',
      '/dashboard/orders/express/create-order',
      `/dashboard/orders/express/create-order?tabId=${tabId.toString()}&tableNumber=${TABLE}`,
    ]) {
      const refused = await isRefused(page, path.split('?')[0]);
      expect(refused, `${path} must not be served to a customer`).toBe(true);
    }
    await evidenceShot(page, 'REQ-120', 6, 'staff-tab-pages-refused');
  });

  test('[REQ-120][AC6] [US-B2.4] ordering for a table with an open staff tab creates a standalone order and leaves the tab untouched', async ({
    page,
  }) => {
    tagTest('REQ-120', 6);
    await page.addInitScript((id: string) => {
      window.localStorage.setItem(
        'wawa-cart-storage',
        JSON.stringify({
          state: {
            items: [
              {
                cartItemId: 'e2e-tab-1',
                id,
                menuItemId: id,
                name: 'E2E Order Item 5000',
                price: 5000,
                quantity: 1,
                portionSize: 'full',
                portionMultiplier: 1,
                subtotal: 5000,
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
    }, itemId);
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await page.goto('/checkout');
    await page.waitForSelector('input[name="customerName"]', {
      timeout: 20000,
    });

    // No tab step or tab option anywhere in the flow.
    await expect(page.getByText('Payment Options')).toHaveCount(0);
    await expect(page.locator('label[for="existing-tab"]')).toHaveCount(0);
    await expect(page.locator('label[for="new-tab"]')).toHaveCount(0);

    await completeCheckout(
      page,
      'dine-in',
      { name: 'E2E Tab Check', email: customer.email, phone: customer.phone },
      TABLE
    );

    const deadline = Date.now() + 20000;
    let order: any = null;
    while (!order && Date.now() < deadline) {
      order = await withMongo(async (db) =>
        db.collection('orders').findOne({ userId: new ObjectId(customer._id) })
      );
      if (!order) await new Promise((r) => setTimeout(r, 400));
    }
    expect(order).not.toBeNull();
    expect(order.dineInDetails.tableNumber).toBe(TABLE);
    expect(order.tabId).toBeUndefined();
    expect(order.origin).toBe('customer');

    const tab = await withMongo(async (db) =>
      db.collection('tabs').findOne({ _id: tabId })
    );
    expect(tab?.orders ?? []).toHaveLength(0);
    expect(tab?.status).toBe('open');
    await evidenceShot(page, 'REQ-120', 6, 'standalone-order-open-staff-tab');
  });
});
