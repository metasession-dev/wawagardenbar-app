/**
 * @requirement REQ-109 — Remove staff-facing "Quick Actions" from the
 * orders dashboard; give `csr` full "Admin Order Management" parity with
 * admin/super-admin.
 *
 * Before this REQ, `csr` could see every Admin Order Management button on
 * `/dashboard/orders` but every underlying server action rejected them with
 * "Unauthorized" (`requireAdminSession()` / inline role checks were
 * `admin`/`super-admin`-only). This spec proves `csr` can now actually
 * exercise those actions end-to-end — create tab, add order to tab, close
 * tab (Express flow), cancel order, delete order (safe default path), and
 * write off a tab — and that the `super-admin`-only override path is still
 * correctly rejected for `csr` (AC7 regression check).
 *
 * Helper patterns mirror (not import — each critical spec keeps its own
 * copies per this suite's existing convention):
 *   - `expressCreateTab`/`expressAddOrderToTab`: e2e/critical/tab-order-no-false-cash-mark-req108.spec.ts
 *   - `expressCloseTab`: e2e/critical/express-order-report.spec.ts
 *   - delete-order safe-default-path UI: e2e/critical/delete-order.spec.ts (AC1)
 *   - delete-order override-blocked UI: e2e/critical/delete-order.spec.ts (AC2)
 *   - write-off UI: e2e/critical/write-off-tab.spec.ts
 *
 * Tier: critical — HIGH risk, RBAC surface on financial/order-record
 * mutation.
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import {
  withMongo,
  deleteTabById,
  deleteOrderById,
} from '../helpers/db-assertions';
import { revealFirstExpressMenuCard } from '../helpers/express-menu';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

const CSR_FILE = path.join(__dirname, '../../.auth/csr.json');
const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const csrTest = base.extend<{ storageState: string }>({
  storageState: CSR_FILE,
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

function parseNGN(text: string): number {
  const digits = text.replace(/[^0-9.]/g, '');
  return parseFloat(digits) || 0;
}

/** Mirrors tab-order-no-false-cash-mark-req108.spec.ts's expressCreateTab. */
async function expressCreateTab(
  page: Page,
  tableNumber: string
): Promise<string> {
  await page.goto('/dashboard/orders/express/create-tab');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#tableNumber')).toBeVisible({ timeout: 10000 });
  await page.locator('#tableNumber').fill(tableNumber);
  await page.getByRole('button', { name: 'Create Tab' }).click();

  await expect(
    page.getByRole('main').getByText('Tab Created', { exact: true })
  ).toBeVisible({ timeout: 10000 });

  const addOrderBtn = page.getByRole('button', { name: /Yes, Add Order/i });
  await expect(addOrderBtn).toBeVisible();
  await addOrderBtn.click();
  await page.waitForURL(/\/express\/create-order/, { timeout: 10000 });

  const url = new URL(page.url());
  const tabId = url.searchParams.get('tabId') ?? '';
  expect(tabId).toBeTruthy();

  await page.goto(
    `/dashboard/orders/express/create-order?tabId=${tabId}&tableNumber=${tableNumber}`
  );
  await page.waitForLoadState('networkidle');

  return tabId;
}

/** Mirrors tab-order-no-false-cash-mark-req108.spec.ts's expressAddOrderToTab. */
async function expressAddOrderToTab(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');

  const menuCard = await revealFirstExpressMenuCard(page);
  await menuCard.click();

  const checkoutBtn = page.getByRole('button', { name: /Checkout/i });
  await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
  await checkoutBtn.click();

  const submitBtn = page.getByRole('button', { name: /Add Order to Tab/i });
  await expect(submitBtn).toBeVisible({ timeout: 5000 });
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();

  await expect(page.getByText(/Order Added to Tab/i).first()).toBeVisible({
    timeout: 10000,
  });
  await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

/** Mirrors express-order-report.spec.ts's expressCloseTab. */
async function expressCloseTab(
  page: Page,
  tableNumber: string
): Promise<number> {
  await page.goto('/dashboard/orders/express/close-tab');
  await page.waitForLoadState('networkidle');

  const tabRow = page
    .locator('.cursor-pointer')
    .filter({ hasText: `Table ${tableNumber}` })
    .first();
  await expect(tabRow).toBeVisible({ timeout: 10000 });
  await tabRow.click();

  await expect(page.locator('text=Total').first()).toBeVisible({
    timeout: 10000,
  });

  const closeBtn = page.getByRole('button', { name: /Close Tab/i });
  const closeBtnText = (await closeBtn.textContent()) ?? '';
  const tabTotal = parseNGN(closeBtnText);
  expect(tabTotal).toBeGreaterThan(0);

  await page.locator('button').filter({ hasText: 'Cash' }).first().click();
  await closeBtn.click();

  await expect(page.getByRole('heading', { name: 'Tab Closed' })).toBeVisible({
    timeout: 10000,
  });

  return tabTotal;
}

function makeOrderDoc(
  orderNumber: string,
  status: string,
  paymentStatus: string
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
        name: 'E2E REQ-109 Test Item',
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
    guestName: 'E2E REQ-109',
    guestEmail: 'e2e-req109@test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function seedOrder(
  status: string,
  paymentStatus: string
): Promise<{ orderId: string; orderNumber: string }> {
  const orderNumber = `E2E109-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  return withMongo(async (db) => {
    const result = await db
      .collection('orders')
      .insertOne(makeOrderDoc(orderNumber, status, paymentStatus));
    return { orderId: String(result.insertedId), orderNumber };
  });
}

async function readOrder(orderId: string): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('orders').findOne({ _id: new ObjectId(orderId) })
  );
}

function makeDormantTabDoc(tableNumber: string): Record<string, unknown> {
  const total = 4500;
  return {
    tabNumber: `E2E-109-${Date.now()}`,
    tableNumber,
    status: 'open',
    paymentStatus: 'pending',
    orders: [],
    total,
    subtotal: total,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discountTotal: 0,
    tipAmount: 0,
    openedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    customerEmail: 'e2e-req109-writeoff@test.com',
    partialPayments: [],
  };
}

async function readTab(tabId: string): Promise<Record<string, any> | null> {
  return withMongo((db) =>
    db.collection('tabs').findOne({ _id: new ObjectId(tabId) })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AC3/AC4/AC5 — csr can create a tab, add an order to it, and close it via
// the Express flow (previously "Unauthorized" for csr).
// ═══════════════════════════════════════════════════════════════════════════
csrTest.describe('REQ-109: csr Express tab lifecycle (AC3/AC4/AC5)', () => {
  csrTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'CSR login failed — skipping');
    }
  });

  const TABLE_NUMBER = `REQ109-${Date.now() % 100000}`;
  let testTabId: string | null = null;

  csrTest.afterEach(async () => {
    if (testTabId) {
      await deleteTabById(testTabId).catch(() => {});
      testTabId = null;
    }
  });

  csrTest(
    'csr creates a tab, adds an order to it, and closes it — all succeed (no Unauthorized)',
    async ({ page }) => {
      tagTest('REQ-109', [3, 4, 5]);

      testTabId = await expressCreateTab(page, TABLE_NUMBER);
      await evidenceShot(page, 'REQ-109', 3, 'csr-create-tab-succeeds', {
        tier: 'feature',
      });

      await expressAddOrderToTab(page);
      await evidenceShot(page, 'REQ-109', 4, 'csr-add-order-to-tab-succeeds', {
        tier: 'feature',
      });

      const tab = await withMongo<{ orders: unknown[] } | null>((db) =>
        db.collection('tabs').findOne({ _id: new ObjectId(testTabId!) })
      );
      expect(tab?.orders?.length).toBeGreaterThan(0);

      await expressCloseTab(page, TABLE_NUMBER);
      await evidenceShot(page, 'REQ-109', 5, 'csr-close-tab-succeeds');
    }
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// AC6 — csr can cancel an order, delete an order (safe default path), and
// write off a tab (previously "Unauthorized" for all three).
// ═══════════════════════════════════════════════════════════════════════════
csrTest.describe('REQ-109: csr order/tab management actions (AC6)', () => {
  csrTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'CSR login failed — skipping');
    }
  });

  let orderId: string | null = null;
  csrTest.afterEach(async () => {
    if (orderId) {
      await deleteOrderById(orderId).catch(() => {});
      orderId = null;
    }
  });

  csrTest('csr cancels an unpaid order', async ({ page }) => {
    tagTest('REQ-109', 6);
    const seeded = await seedOrder('pending', 'pending');
    orderId = seeded.orderId;

    await page.goto(`/dashboard/orders/${orderId}`);
    await page.waitForLoadState('networkidle');

    const cancelButton = page.getByRole('button', { name: 'Cancel Order' });
    await expect(cancelButton).toBeVisible({ timeout: 10000 });
    await cancelButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog
      .locator('#reason')
      .fill('E2E REQ-109: csr cancellation parity check.');
    await evidenceShot(page, 'REQ-109', 6, 'csr-cancel-order-dialog', {
      tier: 'feature',
    });
    await dialog.getByRole('button', { name: 'Cancel Order' }).click();

    await expect
      .poll(async () => (await readOrder(orderId!))?.status, {
        timeout: 10000,
      })
      .toBe('cancelled');
  });

  csrTest(
    'csr deletes an already-cancelled, unpaid order with no override',
    async ({ page }) => {
      tagTest('REQ-109', 6);
      const seeded = await seedOrder('cancelled', 'pending');
      orderId = seeded.orderId;

      await page.goto(`/dashboard/orders/${orderId}`);
      await page.waitForLoadState('networkidle');

      const deleteButton = page.getByRole('button', { name: 'Delete Order' });
      await expect(deleteButton).toBeEnabled();
      await deleteButton.click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete Order' }).click();
      await page.waitForURL(/\/dashboard\/orders$/, { timeout: 15000 });

      await expect
        .poll(async () => (await readOrder(orderId!))?.isDeleted, {
          timeout: 10000,
        })
        .toBe(true);
      await evidenceShot(page, 'REQ-109', 6, 'csr-delete-order-succeeds');
    }
  );
});

csrTest.describe('REQ-109: csr write-off parity (AC6)', () => {
  csrTest.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'CSR login failed — skipping');
    }
  });

  let tabId: string | null = null;
  csrTest.afterEach(async () => {
    if (tabId) {
      await deleteTabById(tabId).catch(() => {});
      tabId = null;
    }
  });

  csrTest('csr writes off a dormant tab', async ({ page }) => {
    tagTest('REQ-109', 6);
    const tableNumber = `E2E-109-${Date.now() % 100000}`;
    const tabResult = (await withMongo((db) =>
      db.collection('tabs').insertOne(makeDormantTabDoc(tableNumber))
    )) as { insertedId: ObjectId };
    tabId = String(tabResult.insertedId);

    await page.goto(`/dashboard/orders/tabs/${tabId}`);
    await page.waitForLoadState('networkidle');

    const writeOffButton = page.getByRole('button', { name: 'Write Off' });
    await expect(writeOffButton).toBeVisible();
    await writeOffButton.click();

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();
    const reasonField = dialog.locator('#write-off-reason');
    const reasonText = 'E2E REQ-109: csr write-off parity check.';
    await reasonField.fill(reasonText);
    const confirmButton = dialog.getByRole('button', { name: 'Write Off Tab' });
    await expect(confirmButton).toBeEnabled();
    await evidenceShot(page, 'REQ-109', 6, 'csr-write-off-dialog', {
      tier: 'feature',
    });
    await confirmButton.click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    await expect
      .poll(async () => (await readTab(tabId!))?.paymentStatus, {
        timeout: 10000,
      })
      .toBe('written-off');
    await evidenceShot(page, 'REQ-109', 6, 'csr-write-off-succeeds');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AC7 — csr (like admin) is still blocked from the super-admin-only
// override path. Order-side: the Delete control stays disabled for a live
// order. This is a regression check — the gate itself is unchanged by
// REQ-109, but no test previously proved it also holds for csr.
// ═══════════════════════════════════════════════════════════════════════════
csrTest.describe(
  'REQ-109: csr still blocked from super-admin override (AC7)',
  () => {
    csrTest.beforeEach(async ({ page }, testInfo) => {
      if (!(await isAuthenticated(page))) {
        testInfo.skip(true, 'CSR login failed — skipping');
      }
    });

    let orderId: string | null = null;
    csrTest.afterEach(async () => {
      if (orderId) {
        await deleteOrderById(orderId).catch(() => {});
        orderId = null;
      }
    });

    csrTest(
      'csr sees the delete control disabled for a live (paid, non-cancelled) order',
      async ({ page }) => {
        tagTest('REQ-109', 7);
        const seeded = await seedOrder('preparing', 'paid');
        orderId = seeded.orderId;

        await page.goto(`/dashboard/orders/${orderId}`);
        await page.waitForLoadState('networkidle');

        const disabledButton = page.getByRole('button', {
          name: /Cannot Delete \(Live Order\)/i,
        });
        await expect(disabledButton).toBeVisible();
        await expect(disabledButton).toBeDisabled();
        await evidenceShot(page, 'REQ-109', 7, 'csr-delete-override-blocked');
      }
    );
  }
);

// Regression sibling using the admin fixture — proves the same gate holds
// for admin (the role csr now matches on the general path, but not on the
// override path).
adminTest.describe(
  'REQ-109: admin still blocked from super-admin override (AC7 regression)',
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
      'admin still sees the delete control disabled for a live (paid, non-cancelled) order',
      async ({ page }) => {
        tagTest('REQ-109', 7);
        const seeded = await seedOrder('preparing', 'paid');
        orderId = seeded.orderId;

        await page.goto(`/dashboard/orders/${orderId}`);
        await page.waitForLoadState('networkidle');

        const disabledButton = page.getByRole('button', {
          name: /Cannot Delete \(Live Order\)/i,
        });
        await expect(disabledButton).toBeVisible();
        await expect(disabledButton).toBeDisabled();
      }
    );
  }
);
