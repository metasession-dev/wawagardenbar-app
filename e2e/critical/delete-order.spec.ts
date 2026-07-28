/**
 * @requirement REQ-096 — Order deletion (soft-delete, ADR-002) with
 * independent inventory/payment revert choices.
 *
 * AC1: default (safe) path — cancelled + unpaid order, no override.
 * AC2: super-admin override gate for a live order (not cancelled or paid);
 *      a non-super-admin sees the control disabled/blocked.
 * AC3/AC4/AC5 (combined): super-admin override with both revert choices
 *      checked (the dialog's default) flips status to cancelled and
 *      paymentStatus to refunded.
 *
 * Tier: critical — HIGH risk, destructive admin action touching payments.
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import { withMongo, deleteOrderById } from '../helpers/db-assertions';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

const SUPER_ADMIN_FILE = path.join(__dirname, '../../.auth/super-admin.json');
const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const superAdminTest = base.extend<{ storageState: string }>({
  storageState: SUPER_ADMIN_FILE,
});
const adminTest = base.extend<{ storageState: string }>({
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
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const total = 2500;
  return {
    orderNumber,
    status,
    paymentStatus,
    orderType: 'pickup',
    total,
    subtotal: total,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    tipAmount: 0,
    totalCost: 0,
    grossProfit: 0,
    profitMargin: 0,
    operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
    items: [
      {
        menuItemId: new ObjectId(),
        name: 'E2E REQ-096 Test Item',
        quantity: 1,
        price: total,
        subtotal: total,
        costPerUnit: 0,
        totalCost: 0,
        grossProfit: total,
        profitMargin: 100,
      },
    ],
    estimatedWaitTime: 20,
    inventoryDeducted: false,
    statusHistory: [{ status, timestamp: new Date(), note: 'E2E test setup' }],
    guestName: 'E2E REQ-096',
    guestEmail: 'e2e-req096@test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  };
}

async function seedOrder(
  status: string,
  paymentStatus: string,
  extra: Record<string, unknown> = {}
): Promise<{ orderId: string; orderNumber: string }> {
  const orderNumber = `E2E096-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  return withMongo(async (db) => {
    const result = await db
      .collection('orders')
      .insertOne(makeOrderDoc(orderNumber, status, paymentStatus, extra));
    return { orderId: String(result.insertedId), orderNumber };
  });
}

async function readOrder(orderId: string): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('orders').findOne({ _id: new ObjectId(orderId) })
  );
}

adminTest.describe('REQ-096: order deletion — safe default path (AC1)', () => {
  adminTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  let orderId: string | null = null;
  adminTest.afterEach(async () => {
    if (orderId) {
      await deleteOrderById(orderId).catch(() => {});
      orderId = null;
    }
  });

  adminTest(
    'admin deletes an already-cancelled, unpaid order with no override',
    async ({ page }) => {
      tagTest('REQ-096', 1);
      const seeded = await seedOrder('cancelled', 'pending');
      orderId = seeded.orderId;

      await page.goto(`/dashboard/orders/${orderId}`);
      await page.waitForLoadState('networkidle');

      const deleteButton = page.getByRole('button', { name: 'Delete Order' });
      await expect(deleteButton).toBeEnabled();
      await deleteButton.click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(/safely deleted/i);
      await evidenceShot(
        page,
        'REQ-096',
        1,
        'delete-order-safe-default-dialog'
      );

      await dialog.getByRole('button', { name: 'Delete Order' }).click();
      await page.waitForURL(/\/dashboard\/orders$/, { timeout: 15000 });

      await expect
        .poll(async () => (await readOrder(orderId!))?.isDeleted, {
          timeout: 10000,
        })
        .toBe(true);

      // Canonical anchor — the deleted order stays reachable by direct ID
      // (ADR-002 audit access) and shows the "Deleted" banner.
      await page.goto(`/dashboard/orders/${orderId}`);
      await expect(page.getByText(/this order was deleted/i)).toBeVisible();
      await evidenceShot(page, 'REQ-096', 1, 'delete-order-deleted-banner');
    }
  );
});

adminTest.describe(
  'REQ-096: order deletion — super-admin override gate (AC2)',
  () => {
    adminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'Admin login failed — skipping');
      }
    });

    let orderId: string | null = null;
    adminTest.afterEach(async () => {
      if (orderId) {
        await deleteOrderById(orderId).catch(() => {});
        orderId = null;
      }
    });

    adminTest(
      'a plain admin sees the delete control disabled for a live (paid, non-cancelled) order',
      async ({ page }) => {
        tagTest('REQ-096', 2);
        const seeded = await seedOrder('preparing', 'paid');
        orderId = seeded.orderId;

        await page.goto(`/dashboard/orders/${orderId}`);
        await page.waitForLoadState('networkidle');

        const disabledButton = page.getByRole('button', {
          name: /Cannot Delete \(Live Order\)/i,
        });
        await expect(disabledButton).toBeVisible();
        await expect(disabledButton).toBeDisabled();
        await evidenceShot(
          page,
          'REQ-096',
          2,
          'delete-order-blocked-for-admin'
        );
      }
    );
  }
);

superAdminTest.describe(
  'REQ-096: order deletion — super-admin override with revert choices (AC3/AC4/AC5)',
  () => {
    superAdminTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'Super-admin login failed — skipping');
      }
    });

    let orderId: string | null = null;
    superAdminTest.afterEach(async () => {
      if (orderId) {
        await deleteOrderById(orderId).catch(() => {});
        orderId = null;
      }
    });

    superAdminTest(
      'super-admin deletes a live, paid order with both revert checkboxes (default) — status cancelled, payment refunded',
      async ({ page }) => {
        tagTest('REQ-096', [3, 4]);
        const seeded = await seedOrder('preparing', 'paid');
        orderId = seeded.orderId;

        await page.goto(`/dashboard/orders/${orderId}`);
        await page.waitForLoadState('networkidle');

        const deleteButton = page.getByRole('button', { name: 'Delete Order' });
        await expect(deleteButton).toBeEnabled();
        await deleteButton.click();

        const dialog = page.locator('[role="alertdialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/super-admin override/i);

        // Both checkboxes default to checked — restock inventory + reverse payment.
        const inventoryCheckbox = page.locator('#revert-inventory');
        const paymentCheckbox = page.locator('#revert-payment');
        await expect(inventoryCheckbox).toBeChecked();
        await expect(paymentCheckbox).toBeChecked();
        // Canonical anchor for AC3 (restock-inventory choice) — kept at the
        // default tier since this test is AC3's only evidence-bearing shot;
        // a tier:'feature' shot here would vanish once this spec graduates
        // into the regression pack.
        await evidenceShot(
          page,
          'REQ-096',
          3,
          'delete-order-override-both-checked'
        );

        await dialog.getByRole('button', { name: 'Delete Order' }).click();
        await page.waitForURL(/\/dashboard\/orders$/, { timeout: 15000 });

        await expect
          .poll(async () => (await readOrder(orderId!))?.isDeleted, {
            timeout: 10000,
          })
          .toBe(true);

        const finalOrder = await readOrder(orderId!);
        expect(finalOrder?.status).toBe('cancelled');
        expect(finalOrder?.paymentStatus).toBe('refunded');

        // Canonical anchor — the deleted order stays reachable by direct ID
        // (ADR-002 audit access) and shows the "Deleted" banner.
        await page.goto(`/dashboard/orders/${orderId}`);
        await expect(page.getByText(/this order was deleted/i)).toBeVisible();
        await evidenceShot(
          page,
          'REQ-096',
          4,
          'delete-order-override-confirmed'
        );
      }
    );
  }
);
