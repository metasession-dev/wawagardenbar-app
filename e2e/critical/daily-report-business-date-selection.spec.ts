/**
 * @requirement REQ-095 - Cutoff-aware Daily Summary business-date selection
 *
 * Covers the Daily Summary report's date-selection contract fixed under
 * REQ-095 (issue #603): Today/Yesterday stay adjacent regardless of the
 * configured cutoff, Last 7 Days resolves to exactly seven inclusive
 * business-date labels, and a custom range attributes orders on either
 * side of the cutoff into the correct adjacent business-date reports.
 *
 * `__tests__/lib/business-date.test.ts` and
 * `__tests__/services/financial-report-service.business-day.test.ts`
 * already prove the pure date math and the query-boundary logic in
 * isolation. This spec proves the seam those unit tests can't reach: that
 * the UI → server action → report-query pipeline wires the resolved
 * business-date range correctly end to end.
 */
import { test as base, expect, Page, Locator } from '@playwright/test';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { tagTest } from '../helpers/test-tags';
import { evidenceShot } from '../helpers/evidence';

const ADMIN_FILE = path.join(__dirname, '../../.auth/admin.json');
const test = base.extend({ storageState: ADMIN_FILE });

const WAT_OFFSET_MS = 60 * 60 * 1000;
const KNOWN_CUTOFF = '15:00';

function mongoConn() {
  return {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGODB_WAWAGARDENBAR_APP_URI ||
      'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'wawagardenbar_test',
  };
}

async function withDb<T>(work: (db: any) => Promise<T>): Promise<T> {
  const { uri, dbName } = mongoConn();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return await work(client.db(dbName));
  } finally {
    await client.close();
  }
}

/** Mirrors `businessDateValueForLabel` in lib/business-date.ts — the
 * persisted UTC value for a WAT business-date label "YYYY-MM-DD". */
function businessDateValue(label: string): Date {
  const [y, m, d] = label.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - WAT_OFFSET_MS);
}

async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');
    return page.url().includes('/dashboard');
  } catch {
    return false;
  }
}

/**
 * `waitForLoadState('networkidle')` only proves the network request
 * finished — it doesn't wait for the response's promise chain (JSON
 * parse, setState, re-render) to actually commit to the DOM, which can
 * trail the network event by a beat. Every quick-action here is async
 * end-to-end, so wait on the app's own loading indicator instead of
 * inferring settlement from network activity.
 */
async function waitForReportSettled(page: Page): Promise<void> {
  await page
    .getByText('Generating report...')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});
}

/**
 * Read the DateRangePicker trigger's resolved "MMM dd, yyyy - MMM dd, yyyy"
 * text. The "Generating report..." wait alone isn't sufficient: if the
 * fetch is fast, loading can flip true→false before this function starts
 * watching for it, so `waitForReportSettled` would resolve immediately
 * without ever having observed the *new* value settle. Poll until two
 * consecutive reads agree, which is correct regardless of that timing.
 */
async function readPickerRange(page: Page): Promise<{ from: Date; to: Date }> {
  await waitForReportSettled(page);
  const trigger = page.getByRole('button', { name: /\d{4}/ }).first();

  let previous: string | null = null;
  let text = (await trigger.textContent()) ?? '';
  for (let attempt = 0; attempt < 10 && text !== previous; attempt++) {
    previous = text;
    await page.waitForTimeout(100);
    text = (await trigger.textContent()) ?? '';
  }

  const [fromText, toText] = text.split(' - ').map((s) => s.trim());
  return { from: new Date(fromText), to: new Date(toText ?? fromText) };
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

async function readTotalRevenueOnce(page: Page): Promise<number> {
  return page.evaluate(() => {
    const amountEls = document.querySelectorAll(
      '.text-2xl.font-bold, [class*="text-2xl"][class*="font-bold"]'
    );
    for (const el of amountEls) {
      const card = el.closest('[class*="rounded"]');
      if (!card) continue;
      const titleText =
        card.querySelector('[class*="font-medium"]')?.textContent?.trim() ?? '';
      if (titleText === 'Total Revenue') {
        const match = (el.textContent ?? '').match(
          /(?:₦|NGN)\s*([\d,]+(?:\.\d+)?)/
        );
        return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
      }
    }
    return 0;
  });
}

/** See readPickerRange's doc comment — same settle-then-stabilize race. */
async function getTotalRevenue(page: Page): Promise<number> {
  await waitForReportSettled(page);

  let previous: number | null = null;
  let value = await readTotalRevenueOnce(page);
  for (let attempt = 0; attempt < 10 && value !== previous; attempt++) {
    previous = value;
    await page.waitForTimeout(100);
    value = await readTotalRevenueOnce(page);
  }
  return value;
}

/**
 * react-day-picker labels each day button with a full accessible name
 * like "Sunday, April 14th, 2024" (weekday + month + ordinal day + year,
 * plus a "Today, …, selected" prefix on the active day). Match on month +
 * day-of-month rather than the bare day number — `getByText('14')`
 * ambiguously matches both the gridcell and the button it wraps, since
 * the cell's only content is that button.
 */
async function selectCalendarDay(
  dialog: Locator,
  monthName: string,
  day: number
) {
  await dialog
    .getByRole('button', { name: new RegExp(`${monthName} ${day}\\w*,`) })
    .click();
}

/**
 * Open the Date Range picker and select Apr 14 - Apr 15, 2024. The clock
 * is pinned to Apr 15 10:00 WAT, before the 15:00 cutoff pinned in
 * beforeAll — so the picker's default single-day selection is Apr 14
 * (the mount effect resolves Today through the same cutoff-aware path
 * this suite exists to verify, not the raw calendar date). A single
 * click on Apr 15 extends that existing degenerate {14,14} range to
 * {14,15} directly (react-day-picker range-select adjusts the nearer
 * endpoint rather than always starting a fresh range). Clicking Apr 14
 * again would instead start a new range there, undoing the selection —
 * only the *other* boundary should be clicked.
 */
async function selectAprilBoundaryRange(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Date Range' }).click();
  const trigger = page.getByRole('button', { name: /\d{4}/ }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await selectCalendarDay(dialog, 'April', 15);
  await page.keyboard.press('Escape');
  await page.waitForLoadState('networkidle');
}

async function seedOrdersOnLabels(
  prefix: string,
  entries: Array<{ label: string; total: number }>
): Promise<{ menuItemId: string; orderIds: string[] }> {
  return withDb(async (db) => {
    const menuItem = await db.collection('menuitems').insertOne({
      kind: 'menu-item',
      name: `${prefix}-item`,
      description: 'REQ-095 seed',
      mainCategory: 'food',
      category: 'rice-dishes',
      price: 1000,
      costPerUnit: 100,
      preparationTime: 1,
      isAvailable: true,
    });
    const itemId = menuItem.insertedId;

    function mkOrder(n: number, businessDate: Date, total: number) {
      return {
        orderNumber: `EQ${Date.now().toString(36).slice(-6)}${n}`,
        orderType: 'pickup',
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        businessDate,
        paidAt: businessDate,
        createdAt: businessDate,
        updatedAt: businessDate,
        items: [
          {
            menuItemId: itemId,
            name: `${prefix}-item`,
            price: total,
            quantity: 1,
            costPerUnit: 100,
            portionSize: 'full',
          },
        ],
        subtotal: total,
        serviceFee: 0,
        tax: 0,
        deliveryFee: 0,
        discount: 0,
        tipAmount: 0,
        total,
        totalCost: 100,
        grossProfit: total - 100,
        profitMargin: ((total - 100) / total) * 100,
        operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
        createdByRole: 'staff',
      };
    }

    const orders = await db
      .collection('orders')
      .insertMany(
        entries.map((entry, i) =>
          mkOrder(i + 1, businessDateValue(entry.label), entry.total)
        )
      );

    return {
      menuItemId: String(itemId),
      orderIds: Object.values(orders.insertedIds).map((id) => String(id)),
    };
  });
}

async function cleanupSeeded(
  fixture: { menuItemId: string; orderIds: string[] } | null
): Promise<void> {
  if (!fixture) return;
  await withDb(async (db) => {
    if (fixture.orderIds.length) {
      await db.collection('orders').deleteMany({
        _id: { $in: fixture.orderIds.map((id) => new ObjectId(id)) },
      });
    }
    await db.collection('menuitems').deleteOne({
      _id: new ObjectId(fixture.menuItemId),
    });
  });
}

// The configured cutoff is global state shared with other specs/operators.
// Pin it to a known value for this file's duration and restore it
// afterwards, rather than assuming whatever is currently configured.
let originalCutoff: string | undefined;

test.beforeAll(async () => {
  originalCutoff = await withDb(async (db) => {
    const doc = await db
      .collection('systemsettings')
      .findOne({ key: 'business-day-cutoff' });
    return doc?.value as string | undefined;
  });
  await withDb((db) =>
    db
      .collection('systemsettings')
      .updateOne(
        { key: 'business-day-cutoff' },
        { $set: { value: KNOWN_CUTOFF } },
        { upsert: true }
      )
  );
});

test.afterAll(async () => {
  await withDb((db) =>
    db
      .collection('systemsettings')
      .updateOne(
        { key: 'business-day-cutoff' },
        { $set: { value: originalCutoff ?? KNOWN_CUTOFF } },
        { upsert: true }
      )
  );
});

// ── AC1+AC2: Today/Yesterday stay adjacent across the cutoff ───────────────
//
// Today/Yesterday resolve as literal WAT calendar-date labels on the
// client (see daily-report-client.tsx handleQuickDate + report-actions.ts,
// which uses a passed string label as-is with no server-side cutoff
// shift) — cutoff-awareness lives in which business date each order was
// attributed to at payment time, not in what the buttons label. The
// regression this guards against is the original bug: cutoff-shift logic
// applied unevenly to Today vs. Yesterday, breaking their adjacency
// depending on which side of the cutoff "now" fell on.
test.describe('REQ-095: Today/Yesterday remain adjacent across the cutoff', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin session not configured — skipping');
    }
  });

  test('adjacent when clicked before the configured cutoff', async ({
    page,
  }) => {
    tagTest('REQ-095', 1);
    // 10:00 WAT, well before the 15:00 cutoff pinned in beforeAll. Chosen
    // mid-day so a UTC-vs-WAT day-boundary mismatch in the runner's local
    // timezone can't shift which calendar date this resolves to.
    await page.clock.setFixedTime(new Date('2024-04-10T09:00:00Z'));
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForLoadState('networkidle');
    const today = await readPickerRange(page);

    await page.getByRole('button', { name: 'Yesterday' }).click();
    await page.waitForLoadState('networkidle');
    const yesterday = await readPickerRange(page);

    expect(daysBetween(yesterday.from, today.from)).toBe(1);
    await evidenceShot(
      page,
      'REQ-095',
      1,
      'today-yesterday-adjacent-before-cutoff'
    );
  });

  test('adjacent when clicked after the configured cutoff', async ({
    page,
  }) => {
    tagTest('REQ-095', 2);
    // 16:00 WAT, after the 15:00 cutoff.
    await page.clock.setFixedTime(new Date('2024-04-10T15:00:00Z'));
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForLoadState('networkidle');
    const today = await readPickerRange(page);

    await page.getByRole('button', { name: 'Yesterday' }).click();
    await page.waitForLoadState('networkidle');
    const yesterday = await readPickerRange(page);

    expect(daysBetween(yesterday.from, today.from)).toBe(1);
    expect(today.from.getTime()).not.toBe(yesterday.from.getTime());
    await evidenceShot(
      page,
      'REQ-095',
      2,
      'today-yesterday-adjacent-after-cutoff'
    );
  });
});

// ── AC3: Last 7 Days resolves to exactly seven inclusive labels ────────────
//
// The preset's anchor (`businessDateLabelForInstant(new Date(), cutoff)`)
// is resolved server-side in report-actions.ts against the server
// process's real clock — `page.clock` only fakes the browser, so this
// scenario deliberately runs unpinned against the real current date.
test.describe('REQ-095: Last 7 Days resolves exactly seven business-date labels', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin session not configured — skipping');
    }
  });

  test('range spans exactly seven inclusive days', async ({ page }) => {
    tagTest('REQ-095', 3);
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Last 7 Days' }).click();
    await page.waitForLoadState('networkidle');

    const range = await readPickerRange(page);
    // 6 days between an inclusive from/to boundary = 7 labels.
    expect(daysBetween(range.from, range.to)).toBe(6);
    await evidenceShot(page, 'REQ-095', 3, 'last-7-days-seven-labels');
  });

  // Regression found while verifying this suite: `generateDateRangeReportAction`
  // has always resolved the `last-7-days` preset server-side from the
  // operational "now" (ignoring the client-sent dates), but the picker
  // display was built from the client's own raw `subDays(new Date(), 6)` —
  // correct span, wrong anchor whenever real time is before the cutoff.
  //
  // `page.clock` only fakes the *browser* — the preset's anchor is
  // resolved by the Next.js server process's own `new Date()` (see
  // report-actions.ts), which a browser-side clock can't reach. To
  // reproduce "before cutoff" deterministically regardless of when this
  // suite happens to run, push the cutoff late enough (23:30) that the
  // real current time is (barring a ~30min window near WAT midnight)
  // always before it, then derive the expected anchor from Today's own
  // resolution rather than re-deriving the WAT/cutoff math independently
  // — that would risk the test and the implementation sharing the same
  // latent bug.
  test('picker range matches the operational anchor when the real time is before cutoff, not the raw calendar date', async ({
    page,
  }) => {
    tagTest('REQ-095', 7);
    await withDb((db) =>
      db
        .collection('systemsettings')
        .updateOne({ key: 'business-day-cutoff' }, { $set: { value: '23:30' } })
    );
    try {
      await page.goto('/dashboard/reports/daily');
      await page.waitForLoadState('networkidle');
      const today = await readPickerRange(page);

      await page.getByRole('button', { name: 'Last 7 Days' }).click();
      const range = await readPickerRange(page);

      expect(range.to.getTime()).toBe(today.from.getTime());
      expect(daysBetween(range.from, range.to)).toBe(6);
      await evidenceShot(
        page,
        'REQ-095',
        7,
        'last-7-days-matches-operational-date-before-cutoff'
      );
    } finally {
      await withDb((db) =>
        db
          .collection('systemsettings')
          .updateOne(
            { key: 'business-day-cutoff' },
            { $set: { value: KNOWN_CUTOFF } }
          )
      );
    }
  });
});

// Regression found while verifying this suite: Today/Yesterday resolve as
// literal calendar-date labels (see the describe block above), but an
// order paid moments ago, before the cutoff, is attributed to the
// *previous* business date at write time. Before the fix, clicking Today
// asked for the literal calendar date and silently missed that order —
// exactly the confusion issue #603 was filed over, just from a different
// angle than the adjacency check above. Caught live by daily-report-payments
// .spec.ts (REQ-013) happening to run before the real cutoff; pinned here
// so it's deterministic.
test.describe
  .serial('REQ-095: Today shows orders attributed to the operational business date across the cutoff', () => {
  const LABEL_BEFORE_CUTOFF = '2024-04-19';
  let fixture: { menuItemId: string; orderIds: string[] } | null = null;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin session not configured — skipping');
    }
  });

  test('seed one order on the business date preceding a pinned pre-cutoff instant', async () => {
    fixture = await seedOrdersOnLabels('req095today', [
      { label: LABEL_BEFORE_CUTOFF, total: 6000 },
    ]);
    expect(fixture.orderIds).toHaveLength(1);
  });

  test('Today resolves to the operational date and includes the order when loaded before cutoff', async ({
    page,
  }) => {
    tagTest('REQ-095', 6);
    // 10:00 WAT on Apr 20 — before the 15:00 cutoff. Relies on the
    // mount-time resolution (no explicit "Today" click) so this also
    // covers the initial page load, which had the same defect.
    await page.clock.setFixedTime(new Date('2024-04-20T09:00:00Z'));
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    const range = await readPickerRange(page);
    expect(range.from.getDate()).toBe(19);

    const total = await getTotalRevenue(page);
    expect(total).toBe(6000);
    await evidenceShot(
      page,
      'REQ-095',
      6,
      'today-matches-operational-date-before-cutoff'
    );
  });

  test.afterAll(async () => {
    await cleanupSeeded(fixture);
  });
});

// ── AC4 + export: custom range is inclusive, attributes cutoff-boundary
// orders to the correct adjacent business dates, and the export period
// matches what's on screen ──────────────────────────────────────────────
//
// Two orders are seeded directly against `businessDate` (not `paidAt`),
// on adjacent synthetic labels — this tests the report-query layer's
// inclusive range handling, not `deriveBusinessDate`'s write-time
// attribution math, which is already covered by
// `__tests__/lib/business-date.test.ts`.
//
// The browser clock is pinned to the same synthetic month so the
// DateRangePicker's calendar opens already showing it — avoiding
// brittle month-navigation clicks — and so the seeded dates can never
// collide with real order data from any other run.
test.describe
  .serial('REQ-095: custom range inclusivity, cutoff-boundary attribution, export period', () => {
  const LABEL_BEFORE = '2024-04-14';
  const LABEL_AFTER = '2024-04-15';
  let fixture: { menuItemId: string; orderIds: string[] } | null = null;

  test.beforeEach(async ({ page }, testInfo) => {
    if (!(await isAuthenticated(page))) {
      testInfo.skip(true, 'Admin session not configured — skipping');
    }
  });

  test('seed two orders on adjacent business dates spanning a cutoff boundary', async () => {
    fixture = await seedOrdersOnLabels('req095', [
      { label: LABEL_BEFORE, total: 5000 },
      { label: LABEL_AFTER, total: 7000 },
    ]);
    expect(fixture.orderIds).toHaveLength(2);
  });

  test('custom range total equals the sum of both seeded orders', async ({
    page,
  }) => {
    tagTest('REQ-095', 4);
    await page.clock.setFixedTime(new Date('2024-04-15T10:00:00Z'));
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');

    await selectAprilBoundaryRange(page);

    const range = await readPickerRange(page);
    expect(daysBetween(range.from, range.to)).toBe(1);

    const total = await getTotalRevenue(page);
    expect(total).toBe(12000); // 5000 (Apr 14) + 7000 (Apr 15) — isolated synthetic dates
    await evidenceShot(
      page,
      'REQ-095',
      4,
      'custom-range-cutoff-boundary-total'
    );
  });

  test('export period includes both boundary dates, matching the on-screen range', async ({
    page,
  }) => {
    tagTest('REQ-095', 5);
    // Range selection from the previous test already loaded the report;
    // re-select here so this test is independently runnable.
    await page.clock.setFixedTime(new Date('2024-04-15T10:00:00Z'));
    await page.goto('/dashboard/reports/daily');
    await page.waitForLoadState('networkidle');
    await selectAprilBoundaryRange(page);

    const onScreenRange = await readPickerRange(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export CSV/i }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    const csvContent = Buffer.concat(chunks).toString('utf-8');

    const startLabel = onScreenRange.from.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    const endLabel = onScreenRange.to.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    expect(csvContent).toContain(startLabel);
    expect(csvContent).toContain(endLabel);
  });

  test.afterAll(async () => {
    await cleanupSeeded(fixture);
  });
});
