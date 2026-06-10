/**
 * @requirement REQ-035 — Tip recording on close-tab payment rows
 *
 * Verifies that the close-tab full-payment dialog captures a tip on the
 * closing partial-payment row, and that the resulting Tab persists the
 * tip on the row (with the row's paymentType serving as the tip method).
 *
 * Skips if no open tabs exist on the test environment.
 *
 * Retry-safe assertion model (#352): instead of asserting on a daily-
 * report aggregate delta (which retry-doubles when describe.serial
 * blocks re-run after a failure), captures a timestamp before the UI
 * flow and queries Mongo directly for the tab closed after that
 * timestamp whose partialPayments contain the exact (tipAmount +
 * paymentType) row. The aggregation correctness is unit-tested at
 * `__tests__/services/financial-report-service.tip.test.ts`.
 *
 * Cleanup: the tab is RESTORED to `open` status (not deleted) so the
 * subsequent run has the same open tab to exercise. This is the
 * idempotent equivalent of "leave the test fixture as you found it".
 *
 * See SDLC/test-isolation.md for the contract.
 */
import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import { findRecentTabWithTip, withMongo } from '../helpers/db-assertions';

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
  let closedTabId: string | null = null;
  let closingRowAddedIndex: number | null = null;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  test.afterEach(async () => {
    // Restore the tab to `open` status + remove the closing partial-
    // payment row this test added. Keeps the seeded open-tab fixture
    // available for subsequent runs (retry / schedule / dispatch).
    if (closedTabId && closingRowAddedIndex !== null) {
      const tabId = closedTabId;
      const addedIndex = closingRowAddedIndex;
      await withMongo(async (db) => {
        const { ObjectId } = await import('mongodb');
        const tab = await db
          .collection('tabs')
          .findOne({ _id: new ObjectId(tabId) });
        if (!tab) return;
        const updatedPartials = (tab.partialPayments || []).filter(
          (_: unknown, i: number) => i !== addedIndex
        );
        await db.collection('tabs').updateOne(
          { _id: new ObjectId(tabId) },
          {
            $set: {
              status: 'open',
              paymentStatus: 'unpaid',
              partialPayments: updatedPartials,
            },
            $unset: { paidAt: '', closedAt: '', paymentReference: '' },
          }
        );
      }).catch(() => {
        /* idempotent — best-effort */
      });
      closedTabId = null;
      closingRowAddedIndex = null;
    }
  });

  test('AC2 — close an open tab with a ₦250 cash tip; partialPayments row persists with paymentType:cash + tipAmount:250', async ({
    page,
  }) => {
    const since = new Date();

    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const payButton = page
      .getByRole('button', { name: /Customer Wants to Pay/i })
      .first();
    if (!(await payButton.isVisible().catch(() => false))) {
      test.skip(
        true,
        'No open tabs to close — seed an open tab to exercise this spec'
      );
      return;
    }
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

    // Record the closing-row index for afterEach cleanup. The closing
    // row was the LAST partialPayment added.
    const partials = tab.partialPayments as Array<{
      tipAmount?: number;
      paymentType: string;
    }>;
    const closingRowIndex = partials.findIndex(
      (p) => p.tipAmount === TIP && p.paymentType === 'cash'
    );
    expect(closingRowIndex).toBeGreaterThanOrEqual(0);
    closedTabId = String(tab._id);
    closingRowAddedIndex = closingRowIndex;
  });
});
