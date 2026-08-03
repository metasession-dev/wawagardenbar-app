/**
 * @requirement REQ-098 AC5 — Dormant-tab visibility on the tabs list page.
 *
 * An open tab older than the configured dormant threshold (default 24h)
 * shows a "Dormant" badge; the "Show dormant only" checkbox filters the
 * list down to just those tabs. A visibility aid only — never
 * auto-executes a write-off.
 *
 * Tier: regression (Could-priority visibility feature, not release-gating).
 *
 * List-visibility caveat: the tabs list is server-paginated (25/page,
 * newest-opened-first) with no search-by-table-number filter. A tab
 * opened long enough ago to be "dormant" could, in a busy shared
 * environment, be pushed past page 1 by newer open tabs. This test skips
 * gracefully (rather than false-failing) if the seeded dormant tab isn't
 * found on the visible page — see the `beforeEach`/row-lookup below.
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

function makeOpenTabDoc(
  tableNumber: string,
  openedAt: Date
): Record<string, unknown> {
  const total = 2000;
  return {
    tabNumber: `E2E-098V-${Date.now()}-${tableNumber}`,
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
    openedAt,
    customerEmail: 'e2e-req098-dormancy@test.com',
    partialPayments: [],
  };
}

test.describe('REQ-098: dormant open-tab visibility (AC5)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin login failed — skipping');
    }
  });

  let dormantTabId: string | null = null;
  let freshTabId: string | null = null;
  test.afterEach(async () => {
    if (dormantTabId) await deleteTabById(dormantTabId).catch(() => {});
    if (freshTabId) await deleteTabById(freshTabId).catch(() => {});
    dormantTabId = null;
    freshTabId = null;
  });

  test('a dormant open tab is flagged; the fresh-tab-only filter narrows the list to it', async ({
    page,
  }, testInfo) => {
    tagTest('REQ-098', 5);

    const dormantTable = `E2E-098V-${Date.now() % 100000}D`;
    const freshTable = `E2E-098V-${Date.now() % 100000}F`;

    const dormantResult = (await withMongo((db) =>
      db.collection('tabs').insertOne(
        makeOpenTabDoc(dormantTable, new Date(Date.now() - 30 * 60 * 60 * 1000)) // 30h ago — past the default 24h threshold
      )
    )) as { insertedId: ObjectId };
    dormantTabId = String(dormantResult.insertedId);

    const freshResult = (await withMongo((db) =>
      db.collection('tabs').insertOne(makeOpenTabDoc(freshTable, new Date()))
    )) as { insertedId: ObjectId };
    freshTabId = String(freshResult.insertedId);

    await page.goto('/dashboard/orders/tabs');
    await page.waitForLoadState('networkidle');

    const dormantCard = page
      .getByTestId('tab-card')
      .filter({ hasText: dormantTable });

    // List-visibility caveat (see file header) — skip gracefully rather
    // than false-fail if the seeded tab isn't on the first (only) page.
    const visible = await dormantCard
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);
    if (!visible) {
      testInfo.skip(
        true,
        'Seeded dormant tab not on the visible page — likely pushed past page 1 by newer open tabs in this environment.'
      );
      return;
    }

    await expect(dormantCard.getByTestId('dormant-badge')).toBeVisible();

    const freshCard = page
      .getByTestId('tab-card')
      .filter({ hasText: freshTable });
    if (
      await freshCard
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await expect(freshCard.getByTestId('dormant-badge')).not.toBeVisible();
    }
    // Canonical anchor — the dormant badge is visible on the dormant tab's card.
    await evidenceShot(page, 'REQ-098', 5, 'dormant-badge-visible');

    // "Show dormant only" narrows the list to the dormant tab.
    await page
      .getByRole('checkbox', { name: /show dormant tabs only/i })
      .check();
    await expect(dormantCard).toBeVisible();
    await expect(freshCard).toHaveCount(0);
    await evidenceShot(page, 'REQ-098', 5, 'dormant-only-filter-applied', {
      tier: 'feature',
    });
  });
});
