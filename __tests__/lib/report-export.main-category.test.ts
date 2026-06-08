/**
 * @requirement REQ-076 — Per-main-category report exports
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins the CSV string contract + filename pattern. PDF / Excel writers
 * are file-I/O paths that exercise jsPDF / XLSX directly; we don't
 * smoke-test those here (they're covered by Spec 3 of the E2E pack
 * via Playwright's `page.waitForEvent('download')`).
 */
import { describe, it, expect } from 'vitest';
import {
  buildMainCategoryReportCSV,
  mainCategoryReportFilename,
} from '@/lib/report-export';
import type { MainCategoryReport } from '@/services/financial-report-service';

function fixture(
  overrides: Partial<MainCategoryReport> = {}
): MainCategoryReport {
  return {
    date: new Date('2020-01-01T00:00:00Z'),
    startDate: new Date('2020-01-01T00:00:00Z'),
    endDate: new Date('2020-01-01T00:00:00Z'),
    mainCategorySlug: 'food',
    mainCategoryLabel: 'Food',
    revenue: {
      items: [
        { name: 'Jollof Rice', quantity: 3, price: 4500, total: 13500 },
        { name: 'Suya', quantity: 2, price: 3000, total: 6000 },
      ],
      totalRevenue: 19500,
      itemCount: 5,
    },
    costs: {
      items: [
        {
          name: 'Jollof Rice',
          quantity: 3,
          price: 4500,
          costPerUnit: 400,
          total: 1200,
        } as never, // type: name+qty+costPerUnit+total only
        { name: 'Suya', quantity: 2, costPerUnit: 800, total: 1600 } as never,
      ],
      totalCost: 2800,
    },
    grossProfit: 16700,
    grossProfitMargin: 85.64,
    orderCount: 2,
    ...overrides,
  };
}

describe('REQ-076 — buildMainCategoryReportCSV', () => {
  it('emits the summary block with metric/value pairs', () => {
    const csv = buildMainCategoryReportCSV(fixture());
    expect(csv).toContain('Wawa Garden Bar');
    expect(csv).toContain('Food Report');
    expect(csv).toContain('Period,2020-01-01');
    expect(csv).toContain('Revenue,19500');
    expect(csv).toContain('Cost,2800');
    expect(csv).toContain('Gross Profit,16700');
    expect(csv).toContain('Margin (%),85.64');
    expect(csv).toContain('Items sold,5');
    expect(csv).toContain('Orders,2');
  });

  it('emits the revenue items section with each row', () => {
    const csv = buildMainCategoryReportCSV(fixture());
    expect(csv).toContain('Revenue items');
    expect(csv).toContain('Item,Qty,Unit Price,Line Total');
    expect(csv).toContain('Jollof Rice,3,4500,13500');
    expect(csv).toContain('Suya,2,3000,6000');
  });

  it('emits the cost items section with cost-per-unit', () => {
    const csv = buildMainCategoryReportCSV(fixture());
    expect(csv).toContain('Cost items');
    expect(csv).toContain('Item,Qty,Cost/Unit,Line Total');
  });

  it('includes the honesty footer note', () => {
    const csv = buildMainCategoryReportCSV(fixture());
    expect(csv).toMatch(/Payments \+ tips are aggregate-only/);
  });

  it('uses the slug in the date label when start === end', () => {
    const csv = buildMainCategoryReportCSV(fixture());
    expect(csv).toContain('Period,2020-01-01');
    expect(csv).not.toContain('2020-01-01-');
  });

  it('uses dashed date range when start !== end', () => {
    const report = fixture({
      startDate: new Date('2020-01-01T00:00:00Z'),
      endDate: new Date('2020-01-31T00:00:00Z'),
    });
    const csv = buildMainCategoryReportCSV(report);
    expect(csv).toContain('Period,2020-01-01-2020-01-31');
  });
});

describe('REQ-076 — mainCategoryReportFilename', () => {
  it('formats single-day filename', () => {
    expect(mainCategoryReportFilename(fixture(), 'pdf')).toBe(
      'main-category-report-food-2020-01-01.pdf'
    );
  });

  it('formats date-range filename', () => {
    const report = fixture({
      startDate: new Date('2020-01-01T00:00:00Z'),
      endDate: new Date('2020-01-31T00:00:00Z'),
    });
    expect(mainCategoryReportFilename(report, 'xlsx')).toBe(
      'main-category-report-food-2020-01-01-2020-01-31.xlsx'
    );
  });

  it('varies filename by slug', () => {
    const drinks = fixture({
      mainCategorySlug: 'drinks',
      mainCategoryLabel: 'Drinks',
    });
    expect(mainCategoryReportFilename(drinks, 'csv')).toBe(
      'main-category-report-drinks-2020-01-01.csv'
    );
  });
});
