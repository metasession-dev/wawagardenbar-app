/**
 * @requirement REQ-099 AC1/AC2 — Tabs Management list view distinguishes
 * written-off tabs from paid ones.
 *
 * Before this REQ, a written-off tab (`paymentStatus: 'written-off'`,
 * `status: 'closed'`) rendered the generic "closed" badge and the same
 * "Tab Paid" button as a genuinely-paid closed tab — visually
 * indistinguishable, reproducing the misleading signal REQ-098 fixed
 * elsewhere (daily report, tab detail page). This spec proves the list
 * view now shows a distinct "Written off" badge with no "Tab Paid"
 * button (AC1), and that the new "Written off" filter checkbox isolates
 * written-off tabs independent of the status checkboxes (AC2).
 *
 * Tier: regression (MEDIUM-risk display defect — financial-reporting
 * adjacent but not a data-integrity issue; mirrors
 * e2e/orders/dormant-tab-visibility.spec.ts's tier + seeding pattern).
 */
import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';
import { ObjectId } from 'mongodb';
import { withMongo, deleteTabById } from '../helpers/db-assertions';
import { evidenceShot } from '../helpers/evidence';
import { tagTest } from '../helpers/test-tags';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');

const test = base.extend<{ storageState: string }>({
  storageState: ADMIN_FILE,
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

function makeWrittenOffTabDoc(tableNumber: string): Record<string, unknown> {
  const total = 3200;
  return {
    tabNumber: `E2E-099-${Date.now()}`,
    tableNumber,
    status: 'closed',
    paymentStatus: 'written-off',
    orders: [],
    total,
    subtotal: total,
    serviceFee: 0,
    tax: 0,
    deliveryFee: 0,
    discountTotal: 0,
    tipAmount: 0,
    openedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    customerEmail: 'e2e-req099-writtenoff@test.com',
    partialPayments: [],
    writeOff: {
      reason: 'E2E: REQ-099 written-off-tab list-view fixture',
      amount: total,
      writtenOffAt: new Date(),
      writtenOffBy: 'e2e-fixture',
    },
  };
}

test.describe('REQ-099: Tabs Management list — written-off badge + filter (AC1/AC2)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  let writtenOffTabId: string | null = null;
  test.afterEach(async () => {
    if (writtenOffTabId) {
      await deleteTabById(writtenOffTabId).catch(() => {});
      writtenOffTabId = null;
    }
  });

  test('written-off tab shows a distinct badge with no Tab Paid button, and the Written off filter isolates it', async ({
    page,
  }) => {
    tagTest('REQ-099', [1, 2]);

    const tableNumber = `E2E-099-${Date.now() % 100000}`;
    const result = (await withMongo((db) =>
      db.collection('tabs').insertOne(makeWrittenOffTabDoc(tableNumber))
    )) as { insertedId: ObjectId };
    writtenOffTabId = String(result.insertedId);

    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    // AC2 — the default filter (status: open) does not surface a
    // closed/written-off tab. Open the filter panel and check the new,
    // status-checkbox-independent "Written off" checkbox.
    await page.getByRole('button', { name: /filter tabs/i }).click();
    await page.getByRole('checkbox', { name: 'Written off' }).check();
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('tab-card').filter({ hasText: tableNumber });
    await expect(card).toBeVisible();

    // AC1 — distinct badge, not the generic "closed" status badge.
    await expect(card.getByTestId('tab-writtenoff-badge')).toBeVisible();
    await expect(card.getByTestId('tab-writtenoff-badge')).toContainText(
      /written off/i
    );
    await expect(card.getByTestId('tab-status-badge')).toHaveCount(0);

    // AC1 — no "Tab Paid" action button for a written-off tab.
    await expect(card.getByTestId('tab-payment-status')).toHaveCount(0);
    await expect(card.getByText('Tab Paid')).toHaveCount(0);

    // Canonical anchor — proves AC1 + AC2 together end-to-end.
    await evidenceShot(
      page,
      'REQ-099',
      1,
      'written-off-badge-no-tab-paid-button'
    );
    await evidenceShot(page, 'REQ-099', 2, 'written-off-filter-isolates-tab', {
      tier: 'feature',
    });

    // AC3 (regression guard) — unchecking "Written off" and leaving only
    // the default "Open" status checked hides the written-off tab again
    // (status-checkbox-only behaviour is unchanged).
    await page.getByRole('checkbox', { name: 'Written off' }).uncheck();
    await page.waitForLoadState('networkidle');
    await expect(card).toHaveCount(0);
  });
});
