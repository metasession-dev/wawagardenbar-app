/**
 * @requirement REQ-085 — Tab payment must not reset order fulfillment status.
 *
 * Verifies that closing a tab with manual payment does NOT reset
 * order `status` to 'confirmed'. Orders that have been processed
 * through the kitchen display (preparing, ready, completed) must
 * retain their current status after tab payment.
 *
 * Also verifies labeled Kitchen/Payment badges on order surfaces.
 *
 * Tier: critical — HIGH risk, Must-priority SRS item (REQ-TABMGT-006).
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import {
  withMongo,
  deleteTabById,
  deleteOrderById,
} from '../helpers/db-assertions';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';
import { ObjectId } from 'mongodb';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

function makeOrderDoc(
  orderNumber: string,
  status: string,
  paymentStatus: string,
  total: number,
  tableNumber: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    orderNumber,
    status,
    paymentStatus,
    total,
    subtotal: total,
    tax: 0,
    deliveryFee: 0,
    discountTotal: 0,
    tipAmount: 0,
    items: [
      {
        name: 'Test Item',
        quantity: 1,
        price: total,
        subtotal: total,
        costPerUnit: 0,
        totalCost: 0,
        grossProfit: total,
        profitMargin: 100,
        category: 'food',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    guestName: 'E2E Test',
    guestEmail: 'e2e-085@test.com',
    orderType: 'dine-in',
    dineInDetails: { tableNumber },
    statusHistory: [{ status, timestamp: new Date(), note: 'E2E test setup' }],
    ...extra,
  };
}

function makeTabDoc(
  orderIds: string[],
  total: number,
  tableNumber: string
): Record<string, unknown> {
  return {
    tabNumber: `E2E-085-${Date.now()}`,
    tableNumber,
    status: 'open',
    paymentStatus: 'pending',
    orders: orderIds.map((id) => new ObjectId(id)),
    total,
    subtotal: total,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discountTotal: 0,
    tipAmount: 0,
    openedAt: new Date(),
    customerEmail: 'e2e-085@test.com',
    partialPayments: [],
  };
}

test.describe('REQ-085: tab payment does not reset order status', () => {
  let testTabId: string | null = null;
  let testOrderIds: string[] = [];

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test.afterEach(async () => {
    for (const orderId of testOrderIds) {
      await deleteOrderById(orderId).catch(() => {});
    }
    if (testTabId) {
      await deleteTabById(testTabId).catch(() => {});
    }
    testOrderIds = [];
    testTabId = null;
  });

  test('[REQ-085][AC1] completed orders stay completed after manual tab payment', async ({
    page,
  }) => {
    tagTest('REQ-085', [1, 3]);

    const orderDocs = [
      makeOrderDoc(
        `E2E-085-${Date.now()}-1`,
        'pending',
        'pending',
        1000,
        'T-085'
      ),
      makeOrderDoc(
        `E2E-085-${Date.now()}-2`,
        'completed',
        'pending',
        1500,
        'T-085',
        { inventoryDeducted: true }
      ),
      makeOrderDoc(
        `E2E-085-${Date.now()}-3`,
        'preparing',
        'pending',
        2000,
        'T-085'
      ),
    ];

    const inserted = await withMongo(async (db) => {
      const result = await db.collection('orders').insertMany(orderDocs);
      return Object.values(result.insertedIds).map((id: unknown) => String(id));
    });
    testOrderIds = inserted;

    const tabDoc = makeTabDoc(inserted, 4500, 'T-085');
    const tabResult = await withMongo(async (db) => {
      const result = await db.collection('tabs').insertOne(tabDoc);
      return result.insertedId.toString();
    });
    testTabId = tabResult;

    await page.goto(`/dashboard/orders/tabs/${tabResult}`);
    await page.waitForLoadState('networkidle');

    const payTabButton = page
      .locator('button:has-text("Customer Wants to Pay Tab")')
      .first();
    await expect(payTabButton).toBeVisible({ timeout: 5000 });
    await payTabButton.click();
    await page.waitForLoadState('networkidle');

    const referenceInput = page.locator('#reference');
    if (await referenceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await referenceInput.fill(`E2E-REF-${Date.now()}`);
    }

    const closeTabButton = page.locator('button:has-text("Close Tab")').last();
    await expect(closeTabButton).toBeVisible({ timeout: 5000 });
    await closeTabButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const ordersAfterPayment = await withMongo(async (db) => {
      const docs = await db
        .collection('orders')
        .find({
          _id: { $in: inserted.map((id) => new ObjectId(id)) },
        })
        .toArray();
      return docs;
    });

    expect(ordersAfterPayment).toHaveLength(3);

    const order1 = ordersAfterPayment.find((o: { orderNumber?: string }) =>
      o.orderNumber?.endsWith('-1')
    );
    const order2 = ordersAfterPayment.find((o: { orderNumber?: string }) =>
      o.orderNumber?.endsWith('-2')
    );
    const order3 = ordersAfterPayment.find((o: { orderNumber?: string }) =>
      o.orderNumber?.endsWith('-3')
    );

    expect(order1?.status).toBe('pending');
    expect(order2?.status).toBe('completed');
    expect(order3?.status).toBe('preparing');

    expect(order1?.paymentStatus).toBe('paid');
    expect(order2?.paymentStatus).toBe('paid');
    expect(order3?.paymentStatus).toBe('paid');

    await evidenceShot(page, 'REQ-085', 1, 'tab-payment-status-preserved');
  });

  test('[REQ-085][AC4] order details header shows labeled Kitchen and Payment badges', async ({
    page,
  }) => {
    tagTest('REQ-085', 4);

    const orderDoc = makeOrderDoc(
      `E2E-085-B-${Date.now()}`,
      'preparing',
      'paid',
      1500,
      'T-085-B'
    );

    const orderId = await withMongo(async (db) => {
      const result = await db.collection('orders').insertOne(orderDoc);
      return result.insertedId.toString();
    });
    testOrderIds = [orderId];

    await page.goto(`/dashboard/orders/${orderId}`);
    await page.waitForLoadState('networkidle');

    const kitchenBadge = page.locator(
      '[data-testid="order-kitchen-status-badge"]'
    );
    await expect(kitchenBadge).toBeVisible({ timeout: 10000 });
    await expect(kitchenBadge).toContainText('preparing');

    const paymentBadge = page.locator(
      '[data-testid="order-payment-status-badge"]'
    );
    await expect(paymentBadge).toBeVisible({ timeout: 5000 });
    await expect(paymentBadge).toContainText('paid');

    await evidenceShot(page, 'REQ-085', 4, 'order-details-labeled-badges');
  });

  test('[REQ-085][AC5] order queue card shows payment status badge', async ({
    page,
  }) => {
    tagTest('REQ-085', 5);

    const orderDoc = makeOrderDoc(
      `E2E-085-C-${Date.now()}`,
      'preparing',
      'paid',
      2000,
      'T-085-C'
    );

    const orderId = await withMongo(async (db) => {
      const result = await db.collection('orders').insertOne(orderDoc);
      return result.insertedId.toString();
    });
    testOrderIds = [orderId];

    await page.goto('/dashboard/orders');
    await page.waitForLoadState('networkidle');

    const paymentBadge = page
      .locator('[data-testid="order-payment-badge"]')
      .first();
    await expect(paymentBadge).toBeVisible({ timeout: 15000 });
    await expect(paymentBadge).toContainText('Payment:');

    await evidenceShot(page, 'REQ-085', 5, 'order-queue-payment-badge');
  });

  test('[REQ-085][AC6] kitchen order card shows payment status indicator', async ({
    page,
  }) => {
    tagTest('REQ-085', 6);

    const orderDoc = makeOrderDoc(
      `E2E-085-D-${Date.now()}`,
      'preparing',
      'paid',
      2500,
      'T-085-D'
    );

    const orderId = await withMongo(async (db) => {
      const result = await db.collection('orders').insertOne(orderDoc);
      return result.insertedId.toString();
    });
    testOrderIds = [orderId];

    await page.goto('/dashboard/kitchen-display');
    await page.waitForLoadState('networkidle');

    const paymentIndicator = page
      .locator('[data-testid="kitchen-payment-indicator"]')
      .first();
    await expect(paymentIndicator).toBeVisible({ timeout: 15000 });
    await expect(paymentIndicator).toContainText('Paid');

    await evidenceShot(page, 'REQ-085', 6, 'kitchen-payment-indicator');
  });
});
