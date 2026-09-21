/**
 * @requirement REQ-108 — Tab-linked orders must not be falsely auto-marked
 * paymentStatus:'paid'/paymentMethod:'cash' when their kitchen status is
 * progressed to 'completed'.
 *
 * Root cause fixed by this REQ: `TabService.addOrderToTab` previously never
 * set `Order.tabId` on attach, so `updateOrderStatusAction`'s auto-cash-mark
 * exclusion guard (`!order.tabId`) failed open for orders attached via the
 * express/POS "add to tab" flow — exactly the flow this spec drives, so the
 * real fix (not a hand-crafted DB fixture) is exercised end-to-end.
 *
 * Sibling of e2e/critical/tab-payment-no-status-reset.spec.ts (REQ-085),
 * which tests the opposite direction (paying a tab doesn't reset kitchen
 * status). This spec covers the reverse: progressing kitchen status must
 * not corrupt tab-scoped payment status.
 *
 * Tier: critical — HIGH risk, financial-correctness (revenue/cash-method
 * reporting, cash-position feature).
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
import { revealFirstExpressMenuCard } from '../helpers/express-menu';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
});

const TABLE_NUMBER = `REQ108-${Date.now()}`;

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

/**
 * Create a tab via the real express "create tab" flow and navigate to the
 * create-order page for it — mirrors the pattern in
 * e2e/critical/express-order-report.spec.ts.
 */
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

/**
 * Add one menu item to the cart and submit it to the pre-selected tab via
 * `expressCreateOrderAction` — the real, currently-buggy-before-this-REQ
 * attach path. The resulting order is located afterward via the tab's
 * `orders[]` array.
 */
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

  const totalText = await page
    .locator('.font-bold.text-lg')
    .filter({ hasText: '₦' })
    .last()
    .textContent();
  expect(parseNGN(totalText ?? '')).toBeGreaterThan(0);

  await submitBtn.click();

  await expect(page.getByText(/Order Added to Tab/i).first()).toBeVisible({
    timeout: 10000,
  });
  await page.waitForURL(/\/dashboard\/orders/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function readOrderPaymentFields(orderId: string) {
  return withMongo(async (db) => {
    const { ObjectId } = await import('mongodb');
    return db.collection('orders').findOne(
      { _id: new ObjectId(orderId) },
      {
        projection: {
          paymentStatus: 1,
          paymentMethod: 1,
          tabId: 1,
          status: 1,
          orderNumber: 1,
        },
      }
    );
  });
}

test.describe('REQ-108: kitchen completion must not falsely mark a tab order as cash-paid', () => {
  let testTabId: string | null = null;
  let testOrderId: string | null = null;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test.afterEach(async () => {
    if (testOrderId) {
      await deleteOrderById(testOrderId).catch(() => {});
    }
    if (testTabId) {
      await deleteTabById(testTabId).catch(() => {});
    }
    testOrderId = null;
    testTabId = null;
  });

  test('[REQ-108][AC1] order attached via the real express add-to-tab flow keeps paymentStatus pending through kitchen completion', async ({
    page,
  }) => {
    tagTest('REQ-108', 1);

    // Create an open tab and attach an order to it via the real
    // expressCreateOrderAction flow — this is the exact attach path that
    // left Order.tabId unset before this REQ's fix.
    testTabId = await expressCreateTab(page, TABLE_NUMBER);
    await expressAddOrderToTab(page);

    // Look up the order the tab now references (the attach flow doesn't
    // surface the order id directly in the UI redirect).
    const { ObjectId } = await import('mongodb');
    const tab = await withMongo<{ orders: unknown[] } | null>((db) =>
      db.collection('tabs').findOne({ _id: new ObjectId(testTabId!) })
    );
    expect(tab?.orders?.length).toBeGreaterThan(0);
    const orderId = String(tab!.orders[tab!.orders.length - 1]);
    testOrderId = orderId;

    // Confirm the root-cause fix: tabId is set on attach, not left unset.
    const beforeCompletion = await readOrderPaymentFields(orderId);
    expect(String(beforeCompletion?.tabId)).toBe(String(testTabId));
    expect(beforeCompletion?.paymentStatus).toBe('pending');
    const orderNumber = beforeCompletion?.orderNumber as string;
    expect(orderNumber).toBeTruthy();

    await evidenceShot(page, 'REQ-108', 1, 'order-attached-tabid-set', {
      tier: 'feature',
    });

    // Drive the order through kitchen statuses to completed.
    await page.goto('/dashboard/kitchen-display');
    await page.waitForLoadState('networkidle');

    const cookieBanner = page.getByTestId('cookie-consent-banner');
    if (await cookieBanner.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /got it/i }).click();
    }

    async function clickAndAwaitStatus(
      buttonText: string,
      expectedNext: string
    ) {
      const heading = page.getByRole('heading', {
        name: orderNumber,
        level: 2,
      });
      await expect(heading).toBeVisible({ timeout: 15000 });
      const card = heading.locator(
        'xpath=ancestor::div[contains(@class, "border-2")][1]'
      );
      const btn = card.getByRole('button', {
        name: new RegExp(buttonText, 'i'),
      });
      await expect(btn).toBeVisible({ timeout: 15000 });
      await expect(btn).toBeEnabled();
      await btn.click();
      await expect
        .poll(
          async () => {
            const doc = await readOrderPaymentFields(orderId);
            return doc?.status;
          },
          { timeout: 20000 }
        )
        .toBe(expectedNext);
    }

    await clickAndAwaitStatus('Start Preparing', 'preparing');
    await page.reload();
    await page.waitForLoadState('networkidle');

    await clickAndAwaitStatus('Mark Ready', 'ready');
    await page.reload();
    await page.waitForLoadState('networkidle');

    await clickAndAwaitStatus('Complete Order', 'completed');

    // The actual assertion this REQ exists for: kitchen completion must
    // NOT have flipped a tab-linked order to paid/cash.
    const afterCompletion = await readOrderPaymentFields(orderId);
    expect(afterCompletion?.status).toBe('completed');
    expect(afterCompletion?.paymentStatus).toBe('pending');
    expect(afterCompletion?.paymentMethod).toBeFalsy();

    await evidenceShot(
      page,
      'REQ-108',
      1,
      'completed-payment-status-unchanged'
    );
  });
});
