/**
 * @requirement REQ-123 — Paid-only kitchen gate (WA-07, #969)
 * @requirement SRS REQ-KITCHEN-009, REQ-ORDMGT-001
 *
 * The kitchen display (and every live queue) lists staff-created orders always
 * and customer orders only once Paystack has confirmed payment. An unpaid
 * customer order is visible only under "Awaiting payment" on /dashboard/orders.
 * A csr tab order (staff origin) is in the kitchen at once; its tab is settled
 * later.
 */
import { test as base, expect } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { withMongo } from '../helpers/db-assertions';
import { evidenceShot } from '../helpers/evidence';
import {
  seedVerifiedCustomer,
  cleanupSeededCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
  seedUnpaidOrder,
  cleanupOrderAndAlerts,
} from '../helpers/customer-order-seed';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const test = base.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
});

test.describe.configure({ mode: 'serial' });

test.describe('[REQ-123] paid-only kitchen gate', () => {
  let customer: SeededCustomerForSession;
  let itemId: string;
  const orders: ObjectId[] = [];
  let unpaidCustomer: { _id: ObjectId; orderNumber: string };
  let paidCustomer: { _id: ObjectId; orderNumber: string };
  let staffExpress: { _id: ObjectId; orderNumber: string };
  let tabOrder: { _id: ObjectId; orderNumber: string };
  let tabId: ObjectId;

  async function seed(
    origin: 'customer' | 'staff',
    over: Record<string, unknown> = {}
  ) {
    // seedUnpaidOrder numbers orders by the millisecond: keep them distinct.
    await new Promise((r) => setTimeout(r, 5));
    const o = await seedUnpaidOrder({
      userId: customer._id,
      itemId,
      origin,
    });
    orders.push(o._id);
    if (Object.keys(over).length) {
      await withMongo((db) =>
        db.collection('orders').updateOne({ _id: o._id }, { $set: over })
      );
    }
    return o;
  }

  test.beforeAll(async () => {
    customer = await seedVerifiedCustomer();
    itemId = await seedPricedMenuItem(4000);
    tabId = new ObjectId();
    unpaidCustomer = await seed('customer');
    paidCustomer = await seed('customer', {
      paymentStatus: 'paid',
      status: 'confirmed',
      paidAt: new Date(),
    });
    staffExpress = await seed('staff'); // unpaid, express/counter style
    tabOrder = await seed('staff', { tabId }); // a csr tab order, tab unsettled
  });

  test.afterAll(async () => {
    for (const id of orders) await cleanupOrderAndAlerts(id);
    await cleanupMenuItem(itemId);
    await cleanupSeededCustomer(customer);
  });

  test('[REQ-123][AC5] [US-B1.3] an unpaid customer order is absent from the kitchen display; a paid customer order and an unpaid staff express order are present', async ({
    page,
  }) => {
    tagTest('REQ-123', 5);
    await page.goto('/dashboard/kitchen-display');
    await expect(
      page.getByRole('heading', { name: 'Kitchen Display' })
    ).toBeVisible();

    const card = (n: string) =>
      page.getByRole('heading', { name: n, exact: true });
    await expect(card(staffExpress.orderNumber)).toBeVisible();
    await expect(card(paidCustomer.orderNumber)).toBeVisible();
    await expect(card(unpaidCustomer.orderNumber)).toHaveCount(0);
    await evidenceShot(page, 'REQ-123', 5, 'kitchen-display-paid-gate');
  });

  test('[REQ-123][AC5] [US-B1.4] a csr tab order is in the kitchen at once, with its tab unsettled', async ({
    page,
  }) => {
    tagTest('REQ-123', 5);
    await page.goto('/dashboard/kitchen-display');
    await expect(
      page.getByRole('heading', { name: 'Kitchen Display' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: tabOrder.orderNumber, exact: true })
    ).toBeVisible();
    const row = await withMongo<any>((db) =>
      db.collection('orders').findOne({ _id: tabOrder._id })
    );
    expect(row?.paymentStatus).toBe('pending');
    expect(row?.origin).toBe('staff');
  });

  test('[REQ-123][AC5] the live orders list hides unpaid customer orders and the Awaiting payment view shows them', async ({
    page,
  }) => {
    tagTest('REQ-123', 5);
    await page.goto('/dashboard/orders');
    await expect(
      page.getByRole('heading', { name: 'Orders Dashboard' })
    ).toBeVisible();
    await expect(
      page.getByText(staffExpress.orderNumber).first()
    ).toBeVisible();
    await expect(page.getByText(unpaidCustomer.orderNumber)).toHaveCount(0);

    await page.getByTestId('awaiting-payment-filter').click();
    await page.waitForURL(/view=awaiting-payment/);
    await expect(
      page.getByText(unpaidCustomer.orderNumber).first()
    ).toBeVisible();
    await expect(page.getByText(paidCustomer.orderNumber)).toHaveCount(0);
    await expect(page.getByText(staffExpress.orderNumber)).toHaveCount(0);
    await evidenceShot(page, 'REQ-123', 5, 'awaiting-payment-view');
  });
});
