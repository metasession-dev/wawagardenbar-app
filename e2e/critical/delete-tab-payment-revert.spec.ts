/**
 * @requirement REQ-096 — Tab deletion gains a "Reverse payment" choice
 * alongside the existing "Restock inventory" choice, guarded when the
 * tab has partial/split payments.
 *
 * AC6: super-admin reverses payment on a paid, non-cancelled linked order.
 * AC7: the "Reverse payment" choice is refused (disabled + explanatory
 *      note) when the tab has recorded partial payments.
 *
 * Tier: critical — HIGH risk, destructive admin action touching payments.
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import { withMongo, deleteTabById } from '../helpers/db-assertions';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');

const superAdminTest = base.extend<{ storageState: string }>({
  storageState: SUPER_ADMIN_FILE,
});

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/orders/tabs');
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
  tableNumber: string
): Record<string, unknown> {
  const total = 3000;
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
        name: 'E2E REQ-096 Tab Item',
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
    guestName: 'E2E REQ-096',
    guestEmail: 'e2e-req096-tab@test.com',
    orderType: 'dine-in',
    dineInDetails: { tableNumber },
    statusHistory: [{ status, timestamp: new Date(), note: 'E2E test setup' }],
  };
}

function makeTabDoc(
  orderIds: string[],
  total: number,
  tableNumber: string,
  partialPayments: unknown[] = []
): Record<string, unknown> {
  return {
    tabNumber: `E2E-096-${Date.now()}`,
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
    customerEmail: 'e2e-req096-tab@test.com',
    partialPayments,
  };
}

async function readOrder(orderId: string): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('orders').findOne({ _id: new ObjectId(orderId) })
  );
}

async function readTab(tabId: string): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('tabs').findOne({ _id: new ObjectId(tabId) })
  );
}

superAdminTest.describe(
  'REQ-096: tab deletion — reverse payment on paid orders (AC6)',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'Super-admin login failed — skipping');
      }
    });

    let tabId: string | null = null;
    superAdminTest.afterEach(async () => {
      if (tabId) {
        await deleteTabById(tabId).catch(() => {});
        tabId = null;
      }
    });

    superAdminTest(
      'super-admin deletes a tab reversing payment on its paid, non-cancelled order',
      async ({ page }) => {
        tagTest('REQ-096', 6);

        const orderNumber = `E2E096T-${Date.now()}`;
        const { orderId, tableNumber } = await withMongo(async (db) => {
          const tableNumber = `E2E-${Date.now() % 100000}`;
          const orderResult = await db
            .collection('orders')
            .insertOne(
              makeOrderDoc(orderNumber, 'preparing', 'paid', tableNumber)
            );
          return { orderId: String(orderResult.insertedId), tableNumber };
        });
        const tabResult = (await withMongo((db) =>
          db
            .collection('tabs')
            .insertOne(makeTabDoc([orderId], 3000, tableNumber))
        )) as { insertedId: ObjectId };
        tabId = String(tabResult.insertedId);

        await page.goto(`/dashboard/orders/tabs/${tabId}`);
        await page.waitForLoadState('networkidle');

        const deleteButton = page.getByRole('button', { name: 'Delete Tab' });
        await expect(deleteButton).toBeEnabled();
        await deleteButton.click();

        const dialog = page.locator('[role="alertdialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/super-admin override/i);

        const paymentCheckbox = page.locator('#revert-payment');
        await expect(paymentCheckbox).toBeVisible();
        await expect(paymentCheckbox).toBeChecked();
        // Canonical anchor for AC6 — kept at the default tier (this test's
        // only shot); see the equivalent note in delete-order.spec.ts.
        await evidenceShot(
          page,
          'REQ-096',
          6,
          'delete-tab-reverse-payment-checked'
        );

        await dialog.getByRole('button', { name: 'Delete Tab' }).click();
        await page.waitForURL(/\/dashboard\/orders\/tabs$/, { timeout: 15000 });

        await expect
          .poll(async () => await readTab(tabId!), { timeout: 10000 })
          .toBeNull();

        const finalOrder = await readOrder(orderId);
        expect(finalOrder?.paymentStatus).toBe('refunded');
        await deleteTabById(tabId).catch(() => {});
        await withMongo((db) =>
          db.collection('orders').deleteOne({ _id: new ObjectId(orderId) })
        );
        tabId = null;
      }
    );
  }
);

superAdminTest.describe(
  'REQ-096: tab deletion — partial payments guard (AC7)',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'Super-admin login failed — skipping');
      }
    });

    let tabId: string | null = null;
    superAdminTest.afterEach(async () => {
      if (tabId) {
        await deleteTabById(tabId).catch(() => {});
        tabId = null;
      }
    });

    superAdminTest(
      'reverse-payment choice is disabled with an explanatory note when the tab has partial payments',
      async ({ page }) => {
        tagTest('REQ-096', 7);

        const orderNumber = `E2E096T-${Date.now()}`;
        const { orderId, tableNumber } = await withMongo(async (db) => {
          const tableNumber = `E2E-${Date.now() % 100000}`;
          const orderResult = await db
            .collection('orders')
            .insertOne(
              makeOrderDoc(orderNumber, 'preparing', 'paid', tableNumber)
            );
          return { orderId: String(orderResult.insertedId), tableNumber };
        });
        const tabResult = (await withMongo((db) =>
          db.collection('tabs').insertOne(
            makeTabDoc([orderId], 3000, tableNumber, [
              {
                amount: 1000,
                note: 'E2E seeded partial payment',
                paymentType: 'cash',
                processedBy: new ObjectId(),
                paidAt: new Date(),
                tipAmount: 0,
              },
            ])
          )
        )) as { insertedId: ObjectId };
        tabId = String(tabResult.insertedId);

        await page.goto(`/dashboard/orders/tabs/${tabId}`);
        await page.waitForLoadState('networkidle');

        const deleteButton = page.getByRole('button', { name: 'Delete Tab' });
        await expect(deleteButton).toBeEnabled();
        await deleteButton.click();

        const dialog = page.locator('[role="alertdialog"]');
        await expect(dialog).toBeVisible();

        const paymentCheckbox = page.locator('#revert-payment');
        await expect(paymentCheckbox).toBeVisible();
        await expect(paymentCheckbox).toBeDisabled();
        await expect(dialog).toContainText(/partial\/split payments/i);
        await evidenceShot(
          page,
          'REQ-096',
          7,
          'delete-tab-payment-revert-disabled'
        );

        // The tab can still be deleted via the inventory-revert choice.
        const inventoryCheckbox = page.locator('#revert-items');
        if (await inventoryCheckbox.isVisible().catch(() => false)) {
          await expect(inventoryCheckbox).toBeChecked();
        }
        await dialog.getByRole('button', { name: 'Delete Tab' }).click();
        await page.waitForURL(/\/dashboard\/orders\/tabs$/, { timeout: 15000 });

        await expect
          .poll(async () => await readTab(tabId!), { timeout: 10000 })
          .toBeNull();

        await withMongo((db) =>
          db.collection('orders').deleteOne({ _id: new ObjectId(orderId) })
        );
        tabId = null;
      }
    );
  }
);
