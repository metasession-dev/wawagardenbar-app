/**
 * @requirement REQ-035 — Tip recording on close-tab payment rows
 *
 * Verifies that the close-tab full-payment dialog captures a tip on the
 * closing partial-payment row, and that the resulting Tab persists the
 * tip on the row (with the row's paymentType serving as the tip method).
 *
 * Seeds its own open tab (unique table number) and removes it afterwards, so it
 * no longer depends on an open tab already existing in the shared database
 * (it used to skip with "No open tabs to close").
 *
 * Retry-safe assertion model (#352): instead of asserting on a daily-
 * report aggregate delta (which retry-doubles when describe.serial
 * blocks re-run after a failure), captures a timestamp before the UI
 * flow and queries Mongo directly for the tab closed after that
 * timestamp whose partialPayments contain the exact (tipAmount +
 * paymentType) row. The aggregation correctness is unit-tested at
 * `__tests__/services/financial-report-service.tip.test.ts`.
 *
 * Cleanup: the seeded tab is deleted in afterEach, whether or not the test
 * closed it.
 *
 * See SDLC/test-isolation.md for the contract.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  deleteTabById,
  findRecentTabWithTip,
  withMongo,
} from '../helpers/db-assertions';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend({
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

test.describe('REQ-035: close-tab tip capture', () => {
  const TIP = 250;
  let seededTabId: string | null = null;
  let seededTableNumber = '';

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
    // Seed this spec's own open tab; the table number is unique so the UI
    // can pick out exactly this tab among whatever else is open.
    seededTableNumber = `T-035-${randomUUID().slice(0, 8)}`;
    seededTabId = await withMongo(async (db) => {
      const result = await db.collection('tabs').insertOne({
        tabNumber: `E2E-035-${randomUUID().slice(0, 8)}`,
        tableNumber: seededTableNumber,
        status: 'open',
        paymentStatus: 'pending',
        orders: [],
        total: 4500,
        subtotal: 4500,
        serviceFee: 0,
        tax: 0,
        deliveryFee: 0,
        discountTotal: 0,
        tipAmount: 0,
        openedAt: new Date(),
        customerEmail: 'e2e-035@test.com',
        partialPayments: [],
      });
      return String(result.insertedId);
    });
  });

  test.afterEach(async () => {
    if (seededTabId) {
      await deleteTabById(seededTabId).catch(() => {
        /* idempotent — best-effort */
      });
      seededTabId = null;
    }
  });

  test('AC2 — close an open tab with a ₦250 cash tip; partialPayments row persists with paymentType:cash + tipAmount:250', async ({
    page,
  }) => {
    const since = new Date();

    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const card = page
      .locator('div')
      .filter({
        has: page.getByRole('heading', { name: `Table ${seededTableNumber}` }),
      })
      .filter({
        has: page.getByRole('button', { name: /Customer Wants to Pay/i }),
      })
      .last();
    const payButton = card.getByRole('button', {
      name: /Customer Wants to Pay/i,
    });
    await expect(payButton).toBeVisible({ timeout: 10000 });
    await payButton.click();

    // Manual full-payment radio is the default. Choose Cash.
    const cashRadio = page.locator('#cash');
    await expect(cashRadio).toBeVisible({ timeout: 5000 });
    await cashRadio.click();

    // Receipt number / reference.
    const refInput = page.locator('#reference');
    await refInput.fill('REQ035-TIP-TEST');

    // Tip input.
    const tipInput = page.locator('#tab-close-tip');
    await expect(tipInput).toBeVisible();
    await tipInput.fill(String(TIP));

    // Submit close-tab.
    const submit = page.getByRole('button', { name: /Pay ₦.*Close Tab/i });
    await submit.click();
    await page.waitForLoadState('networkidle');

    // Direct DB assertion — find the tab that was closed after `since`
    // whose partialPayments include a row with our tip + paymentType.
    const tab = await findRecentTabWithTip({
      since,
      tipAmount: TIP,
      paymentType: 'cash',
    });
    expect(tab).toBeTruthy();
    expect(tab.status).toBe('closed');
    expect(tab.paymentStatus).toBe('paid');

    expect(String(tab._id)).toBe(seededTabId);

    const partials = tab.partialPayments as Array<{
      tipAmount?: number;
      paymentType: string;
    }>;
    expect(
      partials.some((p) => p.tipAmount === TIP && p.paymentType === 'cash')
    ).toBe(true);
  });
});
