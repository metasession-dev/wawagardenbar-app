/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins the PDF / Excel / CSV export downloads from the per-main report
 * page. Excel content is read via the `xlsx` lib already in deps; CSV
 * is parsed as text; PDF gets a filename + byte-presence check
 * (operator validates PDF visual readability during the manual UAT
 * step, which the spec-design intentionally keeps minimal).
 *
 * What this spec pins:
 *   ✓ AC7 — PDF download with correct filename + non-trivial size
 *   ✓ AC7 — Excel download with correct filename + Summary sheet rows
 *   ✓ AC7 — CSV download with correct filename + Revenue rows
 *   ✓ AC7 — filename varies by selected slug
 *
 * Uses the same seeded fixture as Spec 1 so the export contents are
 * deterministic.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as XLSX from 'xlsx';
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
const SEED_PREFIX = `e2e-req076-spec3-${Date.now().toString(36)}`;

test.use({ storageState: SUPER_ADMIN_STATE });
test.describe.configure({ mode: 'serial' });

test.describe('REQ-076 — Per-main-category report exports (REQ-MENUMGT-006)', () => {
  let fixture: SeededReportFixture | null = null;

  test.beforeAll(async () => {
    fixture = await seedReportFixture(SEED_PREFIX);
  });

  test.afterAll(async () => {
    await cleanupReportFixture(fixture);
  });

  test('AC7 — PDF download has expected filename + non-trivial size', async ({
    page,
  }) => {
    test.skip(!fixture, 'Fixture failed to seed');
    await openPageAndSelectFood(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-pdf').click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `main-category-report-food-${SYNTHETIC_DATE_ISO}.pdf`
    );
    // Save and stat the file to verify it's not empty
    const tmp = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmp);
    const stat = fs.statSync(tmp);
    expect(stat.size).toBeGreaterThan(1024); // > 1KB rules out empty PDF
    fs.unlinkSync(tmp);
    await evidenceShot(page, 'REQ-076', 7, 'pdf-downloaded', {
      tier: 'feature',
    });
  });

  test('AC7 — Excel download Summary sheet has expected revenue total', async ({
    page,
  }) => {
    test.skip(!fixture, 'Fixture failed to seed');
    await openPageAndSelectFood(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-excel').click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `main-category-report-food-${SYNTHETIC_DATE_ISO}.xlsx`
    );

    const tmp = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmp);

    const workbook = XLSX.readFile(tmp);
    expect(workbook.SheetNames).toContain('Summary');
    expect(workbook.SheetNames).toContain('Revenue');
    expect(workbook.SheetNames).toContain('Costs');

    // Summary sheet has rows starting with metric labels. Convert to
    // 2D array and find the Revenue / Cost rows.
    const summary = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets.Summary,
      { header: 1 }
    );
    const revRow = summary.find((r) => r[0] === 'Revenue');
    const costRow = summary.find((r) => r[0] === 'Cost');
    expect(revRow?.[1]).toBe(fixture!.expectedFoodRevenue);
    expect(costRow?.[1]).toBe(fixture!.expectedFoodCost);

    fs.unlinkSync(tmp);
  });

  test('AC7 — CSV download contains expected revenue line', async ({
    page,
  }) => {
    test.skip(!fixture, 'Fixture failed to seed');
    await openPageAndSelectFood(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-csv').click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `main-category-report-food-${SYNTHETIC_DATE_ISO}.csv`
    );
    const tmp = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmp);
    const text = fs.readFileSync(tmp, 'utf-8');
    expect(text).toContain(`Revenue,${fixture!.expectedFoodRevenue}`);
    expect(text).toContain(`Cost,${fixture!.expectedFoodCost}`);
    expect(text).toContain('Period,2020-01-01');
    // Item rows present
    expect(text).toContain(`${SEED_PREFIX}-jollof`);
    fs.unlinkSync(tmp);
  });

  test('AC7 — filename varies by selected slug (Drinks)', async ({ page }) => {
    test.skip(!fixture, 'Fixture failed to seed');
    await openPageAndSelect(page, 'Drinks');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-csv').click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `main-category-report-drinks-${SYNTHETIC_DATE_ISO}.csv`
    );
  });

  async function openPageAndSelectFood(page: import('@playwright/test').Page) {
    await openPageAndSelect(page, 'Food');
  }

  async function openPageAndSelect(
    page: import('@playwright/test').Page,
    label: 'Food' | 'Drinks'
  ) {
    await page.goto('/dashboard/reports/by-main-category');
    await page.waitForLoadState('networkidle');
    await pickSyntheticDate(page);
    await page.getByTestId('main-category-selector').click();
    await page.getByRole('option', { name: new RegExp(`^${label}$`) }).click();
    await expect(page.getByTestId('summary-cards')).toBeVisible({
      timeout: 15000,
    });
  }
});

async function pickSyntheticDate(
  page: import('@playwright/test').Page
): Promise<void> {
  // Trigger's accessible name is the current date range (e.g.
  // "Jun 09, 2026 - Jun 09, 2026") — match by 4-digit year.
  const trigger = page
    .getByRole('button', { name: /\d{4}|Pick a date/ })
    .first();
  await trigger.click({ timeout: 5000 });
  const targetCaption = 'January 2020';
  for (let i = 0; i < 200; i += 1) {
    const captionVisible = await page
      .getByRole('grid', { name: new RegExp(targetCaption, 'i') })
      .isVisible()
      .catch(() => false);
    if (captionVisible) break;
    await page
      .getByRole('button', {
        name: /previous month|go to previous month/i,
      })
      .first()
      .click({ timeout: 1500 })
      .catch(() => {});
  }
  // single-day: click "1" twice
  await page.getByRole('gridcell', { name: '1', exact: true }).first().click();
  await page.getByRole('gridcell', { name: '1', exact: true }).first().click();
  await page.keyboard.press('Escape');
}
