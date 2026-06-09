/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins the UI happy path + numbers for the new
 * `/dashboard/reports/by-main-category` page. Super-admin storage state
 * + synthetic-past-date orders seeded directly into UAT Mongo.
 *
 * What this spec pins:
 *   ✓ AC1 — super-admin sees all enabled mains in the dropdown
 *   ✓ AC2 — picking a main + date range renders revenue, costs, summary
 *           cards (revenue, cost, gross profit, margin, item count,
 *           order count) and per-item tables; switching mains updates
 *   ✓ Empty state — picking a date with zero seeded data renders the
 *           "No items sold" empty-state UI (no crash, no stale data)
 *
 * What this spec does NOT pin (covered elsewhere):
 *   ✗ RBAC restricted-admin behaviour → main-category-report-access-control.spec.ts
 *   ✗ Numbers tie-out with daily report → by-main-category-numbers-tie-out.spec.ts
 *   ✗ PDF/Excel/CSV download → by-main-category-report-export.spec.ts
 *   ✗ Admin permission editor UI → main-category-report-permissions-ui.spec.ts
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import {
  cleanupReportFixture,
  seedReportFixture,
  SYNTHETIC_DATE_ISO,
  type SeededReportFixture,
} from '../helpers/main-category-report-seed';
import { evidenceShot } from '../helpers/evidence';

const SUPER_ADMIN_STATE = path.resolve(
  __dirname,
  '../../.auth/super-admin.json'
);
const SEED_PREFIX = `e2e-req076-spec1-${Date.now().toString(36)}`;

test.use({ storageState: SUPER_ADMIN_STATE });
test.describe.configure({ mode: 'serial' });

test.describe('REQ-076 — Per-main-category report UI (REQ-MENUMGT-006)', () => {
  let fixture: SeededReportFixture | null = null;

  test.beforeAll(async () => {
    fixture = await seedReportFixture(SEED_PREFIX);
  });

  test.afterAll(async () => {
    await cleanupReportFixture(fixture);
  });

  test('AC1 — super-admin sees all enabled mains in the dropdown', async ({
    page,
  }) => {
    await page.goto('/dashboard/reports/by-main-category');
    await page.waitForLoadState('networkidle');

    // Page-level header proves the route resolved (not redirected)
    await expect(
      page.getByRole('heading', { name: /Per-Main-Category Report/i })
    ).toBeVisible();

    // Selector renders with the default-seed pair (food + drinks);
    // additional mains depend on the registry state of UAT — we only
    // assert that food + drinks are present.
    const selector = page.getByTestId('main-category-selector');
    await expect(selector).toBeVisible();
    await selector.click();
    // Radix Select renders options inside a popover; assert by role
    await expect(page.getByRole('option', { name: /^Food$/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Drinks$/ })).toBeVisible();
    await evidenceShot(page, 'REQ-076', 1, 'selector-shows-all-mains');
    // Close popover before next interactions
    await page.keyboard.press('Escape');
  });

  test('AC2 — pick Food + synthetic date → revenue / cost / summary render', async ({
    page,
  }) => {
    test.skip(!fixture, 'Fixture failed to seed');
    await page.goto('/dashboard/reports/by-main-category');
    await page.waitForLoadState('networkidle');

    // Date picker — the existing DateRangePicker accepts {from, to} via
    // value. The page initialises to today; we navigate to the
    // synthetic past date via the input. The picker is a popover with a
    // calendar so direct date selection is the most reliable path.
    // We set the date programmatically by interacting with the trigger
    // button's text content; if the calendar widget changes, this test
    // gets updated. As a defensive layer we also pass the date via the
    // URL hash query — but the current implementation doesn't read
    // those — so the calendar interaction is the only path.
    await pickSyntheticDateRange(page);

    // Pick Food in the selector
    await page.getByTestId('main-category-selector').click();
    await page.getByRole('option', { name: /^Food$/ }).click();

    // Wait for the action to complete + the summary block to render
    await expect(page.getByTestId('summary-cards')).toBeVisible({
      timeout: 15000,
    });

    // Numbers from the fixture: Food revenue = 28500, cost = 3600,
    // grossProfit = 24900, itemCount = 7, orderCount = 3.
    // Use partial text matching because the page formats as NGN.
    const total = page.getByTestId('total-revenue');
    await expect(total).toContainText('28,500');
    const cost = page.getByTestId('total-cost');
    await expect(cost).toContainText('3,600');
    const gross = page.getByTestId('gross-profit');
    await expect(gross).toContainText('24,900');
    await expect(page.getByTestId('item-count')).toContainText('7');
    await expect(page.getByTestId('order-count')).toContainText('3');

    // Revenue table renders the seeded item names
    const revenueRows = page.getByTestId('revenue-table-body');
    await expect(revenueRows).toContainText(`${SEED_PREFIX}-jollof`);
    await expect(revenueRows).toContainText(`${SEED_PREFIX}-suya`);

    // Costs table renders the same items with cost-per-unit
    const costRows = page.getByTestId('cost-table-body');
    await expect(costRows).toContainText(`${SEED_PREFIX}-jollof`);
    await evidenceShot(page, 'REQ-076', 2, 'food-report-numbers');
  });

  test('AC2 (switch) — switching to Drinks updates the report', async ({
    page,
  }) => {
    test.skip(!fixture, 'Fixture failed to seed');
    await page.goto('/dashboard/reports/by-main-category');
    await page.waitForLoadState('networkidle');
    await pickSyntheticDateRange(page);

    await page.getByTestId('main-category-selector').click();
    await page.getByRole('option', { name: /^Drinks$/ }).click();

    await expect(page.getByTestId('summary-cards')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('total-revenue')).toContainText('7,500');
    await expect(page.getByTestId('order-count')).toContainText('2');
    const revenueRows = page.getByTestId('revenue-table-body');
    await expect(revenueRows).toContainText(`${SEED_PREFIX}-beer`);
  });

  test('Empty state — date with no seeded orders renders no-items copy', async ({
    page,
  }) => {
    await page.goto('/dashboard/reports/by-main-category');
    await page.waitForLoadState('networkidle');

    // Pick the day BEFORE the synthetic seed date — guaranteed empty.
    await pickEmptyDateRange(page);

    await page.getByTestId('main-category-selector').click();
    await page.getByRole('option', { name: /^Food$/ }).click();

    await expect(page.getByTestId('summary-cards')).toBeVisible({
      timeout: 15000,
    });
    // 0 revenue + empty-state copy on the items tables
    await expect(page.getByTestId('total-revenue')).toContainText('0');
    await expect(page.getByTestId('revenue-empty')).toBeVisible();
    await expect(page.getByTestId('cost-empty')).toBeVisible();
    await evidenceShot(page, 'REQ-076', 2, 'empty-state', { tier: 'feature' });
  });
});

/**
 * Set the DateRangePicker to the synthetic seed date (2020-01-01).
 * The DateRangePicker uses react-day-picker via a Popover trigger
 * showing formatted text. We click the trigger to open the calendar,
 * then navigate back to January 2020 and click day 1 twice (from + to).
 *
 * Number of months to navigate back from "current" calendar is computed
 * at test runtime — the date 2020-01-01 is fixed.
 */
async function pickSyntheticDateRange(
  page: import('@playwright/test').Page
): Promise<void> {
  await pickDateRange(page, SYNTHETIC_DATE_ISO, SYNTHETIC_DATE_ISO);
}

async function pickEmptyDateRange(
  page: import('@playwright/test').Page
): Promise<void> {
  // Use a date guaranteed to have no orders: day before synthetic.
  await pickDateRange(page, '2019-12-31', '2019-12-31');
}

async function pickDateRange(
  page: import('@playwright/test').Page,
  startISO: string,
  endISO: string
): Promise<void> {
  // The shadcn DateRangePicker trigger's accessible name is the
  // currently-displayed date range (e.g. "Jun 09, 2026 - Jun 09, 2026"),
  // not a static "Pick a date" placeholder. Match by 4-digit year inside
  // the button text, with a fallback on the placeholder string for an
  // empty initial state.
  const trigger = page
    .getByRole('button', { name: /\d{4}|Pick a date/ })
    .first();
  await trigger.click({ timeout: 5000 });

  // Navigate to target month — click "Go to previous month" button until
  // the displayed caption matches the target. react-day-picker exposes
  // a `[name="previous-month"]` button by default.
  const targetCaption = new Date(startISO).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  for (let i = 0; i < 200; i += 1) {
    const captionVisible = await page
      .getByRole('grid', { name: new RegExp(targetCaption, 'i') })
      .isVisible()
      .catch(() => false);
    if (captionVisible) break;
    await page
      .getByRole('button', { name: /previous month|go to previous month/i })
      .first()
      .click({ timeout: 1500 })
      .catch(() => {
        /* swallow — the for-loop will break next iter if visible */
      });
  }

  // Click day from
  const dayFrom = String(new Date(startISO).getUTCDate());
  await page
    .getByRole('gridcell', { name: dayFrom, exact: true })
    .first()
    .click();

  if (startISO !== endISO) {
    const dayTo = String(new Date(endISO).getUTCDate());
    await page
      .getByRole('gridcell', { name: dayTo, exact: true })
      .first()
      .click();
  } else {
    // Single-day range: click the same day twice
    await page
      .getByRole('gridcell', { name: dayFrom, exact: true })
      .first()
      .click();
  }

  // Close the calendar popover
  await page.keyboard.press('Escape');
}
