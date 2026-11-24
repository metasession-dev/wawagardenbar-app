/**
 * @requirement REQ-124 — Serving check header and delivery details (WA-08, #970)
 * @requirement SRS REQ-KITCHEN-010, REQ-KITCHEN-011
 *
 * Service staff hand a drink to the right person by reading `Table N · First`
 * in large type on the kitchen card, the dashboard order card and the order
 * queue (which renders the order card). The kitchen sees a first name only:
 * no phone, email or full name. A delivery order shows its address and
 * instructions on the kitchen card.
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';
import {
  seedVerifiedCustomer,
  cleanupSeededCustomer,
  type SeededCustomerForSession,
} from '../helpers/customer-auth';
import {
  seedPricedMenuItem,
  cleanupMenuItem,
  cleanupOrderAndAlerts,
} from '../helpers/customer-order-seed';
import { seedOrder, seedTab, cleanupTab } from '../helpers/order-tracking-seed';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const test = base.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
});

test.describe.configure({ mode: 'serial' });

function kitchenCard(page: Page, orderNumber: string) {
  return page
    .getByRole('heading', { name: orderNumber, exact: true })
    .locator('xpath=ancestor::div[contains(@class,"border-2")][1]');
}

test.describe('[REQ-124] serving check', () => {
  let customer: SeededCustomerForSession;
  let itemId: string;
  let tabId: ObjectId;
  const orders: ObjectId[] = [];
  let dineIn: { _id: ObjectId; orderNumber: string };
  let tabOrder: { _id: ObjectId; orderNumber: string };
  let nameless: { _id: ObjectId; orderNumber: string };
  let delivery: { _id: ObjectId; orderNumber: string };
  let pickup: { _id: ObjectId; orderNumber: string };

  test.beforeAll(async () => {
    customer = await seedVerifiedCustomer({ name: 'Ada Obi' });
    itemId = await seedPricedMenuItem(4000);
    tabId = await seedTab({ tableNumber: '3', customerName: 'Tunde' });
    dineIn = await seedOrder({
      userId: customer._id,
      itemId,
      tableNumber: '7',
      status: 'confirmed',
    });
    tabOrder = await seedOrder({
      userId: customer._id,
      itemId,
      origin: 'staff',
      noUser: true,
      tableNumber: null,
      tabId,
      status: 'confirmed',
      paid: false,
    });
    nameless = await seedOrder({
      userId: customer._id,
      itemId,
      origin: 'staff',
      noUser: true,
      tableNumber: '5',
      status: 'confirmed',
      paid: false,
    });
    delivery = await seedOrder({
      userId: customer._id,
      itemId,
      orderType: 'delivery',
      status: 'confirmed',
      delivery: {
        street: '12 Bode Thomas Street',
        city: 'Surulere',
        state: 'Lagos',
        instructions: 'Call at the gate',
      },
    });
    pickup = await seedOrder({
      userId: customer._id,
      itemId,
      orderType: 'pickup',
      status: 'confirmed',
    });
    orders.push(
      dineIn._id,
      tabOrder._id,
      nameless._id,
      delivery._id,
      pickup._id
    );
  });

  test.afterAll(async () => {
    for (const id of orders) await cleanupOrderAndAlerts(id);
    await cleanupTab(tabId);
    await cleanupMenuItem(itemId);
    await cleanupSeededCustomer(customer);
  });

  test('[REQ-124][AC4] [US-B1.5] a dine-in order for "Ada Obi" at table 7 reads "Table 7 · Ada" on the kitchen card, with no phone, email or full name', async ({
    page,
  }) => {
    tagTest('REQ-124', 4);
    await page.goto('/dashboard/kitchen-display');
    await expect(
      page.getByRole('heading', { name: 'Kitchen Display' })
    ).toBeVisible();
    const card = kitchenCard(page, dineIn.orderNumber);
    await expect(card.getByTestId('serving-header')).toHaveText(
      'Table 7 · Ada'
    );
    await evidenceShot(page, 'REQ-124', 4, 'kitchen-card-table-first-name');

    await expect(card).not.toContainText('Obi');
    await expect(card).not.toContainText(customer.phone);
    await expect(card).not.toContainText(customer.email);
    // The data never reaches the kitchen browser either.
    const html = await page.content();
    expect(html).not.toContain(customer.phone);
    expect(html).not.toContain(customer.email);
    expect(html).not.toContain('Ada Obi');
  });

  test('[REQ-124][AC4] [US-B1.6] a tab order reads "Table 3 · Tunde"; an order with no name reads "No name"', async ({
    page,
  }) => {
    tagTest('REQ-124', 4);
    await page.goto('/dashboard/kitchen-display');
    await expect(
      kitchenCard(page, tabOrder.orderNumber).getByTestId('serving-header')
    ).toHaveText('Table 3 · Tunde');
    await expect(
      kitchenCard(page, nameless.orderNumber).getByTestId('serving-header')
    ).toHaveText('Table 5 · No name');
    await evidenceShot(page, 'REQ-124', 4, 'kitchen-card-tab-and-no-name');
  });

  test('[REQ-124][AC4] a pickup order reads "Pickup · Ada" and a delivery order "Delivery · Ada" with no table', async ({
    page,
  }) => {
    tagTest('REQ-124', 4);
    await page.goto('/dashboard/kitchen-display');
    await expect(
      kitchenCard(page, pickup.orderNumber).getByTestId('serving-header')
    ).toHaveText('Pickup · Ada');
    await expect(
      kitchenCard(page, delivery.orderNumber).getByTestId('serving-header')
    ).toHaveText('Delivery · Ada');
  });

  test('[REQ-124][AC5] [US-B1.7] a delivery order shows the address and instructions on the kitchen card; other orders show no delivery block', async ({
    page,
  }) => {
    tagTest('REQ-124', 5);
    await page.goto('/dashboard/kitchen-display');
    const card = kitchenCard(page, delivery.orderNumber);
    const details = card.getByTestId('kitchen-delivery-details');
    await expect(details).toContainText(
      '12 Bode Thomas Street, Surulere, Lagos'
    );
    await expect(details).toContainText('Call at the gate');
    await evidenceShot(page, 'REQ-124', 5, 'kitchen-card-delivery-details');
    await expect(
      kitchenCard(page, dineIn.orderNumber).getByTestId(
        'kitchen-delivery-details'
      )
    ).toHaveCount(0);
  });

  test('[REQ-124][AC4] the dashboard order card and queue show the same "Table 7 · Ada" header', async ({
    page,
  }) => {
    tagTest('REQ-124', 4);
    await page.goto('/dashboard/orders');
    await expect(page.getByTestId('order-queue')).toBeVisible();
    const queue = page.getByTestId('order-queue');
    await expect(
      queue
        .getByTestId('serving-header')
        .filter({ hasText: 'Table 7 · Ada' })
        .first()
    ).toBeVisible();
    await expect(
      queue
        .getByTestId('serving-header')
        .filter({ hasText: 'Table 3 · Tunde' })
        .first()
    ).toBeVisible();
    await evidenceShot(page, 'REQ-124', 4, 'dashboard-queue-serving-header');
  });
});
