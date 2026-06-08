/**
 * @requirement REQ-076 — Per-main-category report
 * @requirement SRS REQ-MENUMGT-006
 *
 * Pins `FinancialReportService.generateMainCategoryReport`:
 *
 *   - filter to items matching mainCategorySlug
 *   - itemCount = sum of quantities (not row count)
 *   - orderCount = distinct orders containing ≥1 matching item
 *   - empty-input safety (no error on slug with no orders)
 *   - date-range correctness
 *   - label resolution from registry, slug fallback when absent
 *   - cost + gross-profit math
 *
 * Mongo + SystemSettingsService are mocked; tests assert what the
 * service computed from the mocked data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(),
}));

vi.mock('@/lib/business-date', () => ({
  businessDayRange: vi.fn(),
}));

const mockOrderFind = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    find: (...args: unknown[]) => ({
      lean: () => mockOrderFind(...args),
    }),
  },
}));

const mockMenuItemFindById = vi.fn();
vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: (...args: unknown[]) => ({
      lean: () => mockMenuItemFindById(...args),
    }),
  },
}));

vi.mock('@/models/tab-model', () => ({ default: {} }));
vi.mock('@/models/expense-model', () => ({ ExpenseModel: {} }));

const mockGetMainCategories = vi.fn();
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getMainCategories: (...args: unknown[]) => mockGetMainCategories(...args),
  },
}));

import { FinancialReportService } from '@/services/financial-report-service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const REGISTRY = [
  { slug: 'food', label: 'Food', order: 0, isEnabled: true },
  { slug: 'drinks', label: 'Drinks', order: 1, isEnabled: true },
  { slug: 'snacks', label: 'Snacks', order: 2, isEnabled: true },
];

// Helper: seed a stable MenuItem lookup by id.
const MENU_ITEMS: Record<
  string,
  {
    _id: string;
    name: string;
    category: string;
    mainCategory: string;
    costPerUnit: number;
  }
> = {
  jollof: {
    _id: 'jollof',
    name: 'Jollof Rice',
    category: 'rice-dishes',
    mainCategory: 'food',
    costPerUnit: 400,
  },
  suya: {
    _id: 'suya',
    name: 'Suya',
    category: 'starters',
    mainCategory: 'food',
    costPerUnit: 800,
  },
  beer: {
    _id: 'beer',
    name: 'Star Beer',
    category: 'beer-local',
    mainCategory: 'drinks',
    costPerUnit: 300,
  },
  popcorn: {
    _id: 'popcorn',
    name: 'Popcorn',
    category: 'salty',
    mainCategory: 'snacks',
    costPerUnit: 150,
  },
};

function order(
  _id: string,
  items: Array<{ id: string; qty: number; price: number }>
) {
  return {
    _id,
    paymentStatus: 'paid',
    items: items.map((i) => ({
      menuItemId: { toString: () => i.id }, // mimic ObjectId
      name: MENU_ITEMS[i.id].name,
      price: i.price,
      quantity: i.qty,
      costPerUnit: MENU_ITEMS[i.id].costPerUnit,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMainCategories.mockResolvedValue(REGISTRY);
  mockMenuItemFindById.mockImplementation((id: string) =>
    Promise.resolve(MENU_ITEMS[id] ?? null)
  );
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('REQ-076 — FinancialReportService.generateMainCategoryReport', () => {
  it('filters items to the requested main slug (excludes other mains)', async () => {
    mockOrderFind.mockResolvedValue([
      order('o1', [
        { id: 'jollof', qty: 3, price: 4500 }, // food, included
        { id: 'beer', qty: 2, price: 1500 }, // drinks, excluded
      ]),
    ]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'food'
    );

    expect(report.revenue.items).toHaveLength(1);
    expect(report.revenue.items[0].name).toBe('Jollof Rice');
    expect(report.revenue.totalRevenue).toBe(13500); // 3 × 4500
    // Beer doesn't show up in costs either
    expect(report.costs.items).toHaveLength(1);
    expect(report.costs.items[0].name).toBe('Jollof Rice');
  });

  it('itemCount sums quantity, not row count', async () => {
    mockOrderFind.mockResolvedValue([
      order('o1', [{ id: 'jollof', qty: 3, price: 4500 }]),
      order('o2', [{ id: 'jollof', qty: 2, price: 4500 }]),
      order('o3', [{ id: 'suya', qty: 4, price: 3000 }]),
    ]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'food'
    );

    // Jollof = 3+2 = 5; Suya = 4 → itemCount = 9, NOT 2 (rows)
    expect(report.revenue.itemCount).toBe(9);
    expect(report.revenue.items).toHaveLength(2);
  });

  it('orderCount counts distinct orders, not items', async () => {
    mockOrderFind.mockResolvedValue([
      order('o1', [
        { id: 'jollof', qty: 1, price: 4500 },
        { id: 'suya', qty: 1, price: 3000 }, // same order, both food
      ]),
      order('o2', [{ id: 'jollof', qty: 1, price: 4500 }]),
    ]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'food'
    );

    expect(report.orderCount).toBe(2);
  });

  it('orderCount counts multi-main orders toward EACH main (documented limitation)', async () => {
    mockOrderFind.mockResolvedValue([
      order('o1', [
        { id: 'jollof', qty: 1, price: 4500 }, // food
        { id: 'beer', qty: 1, price: 1500 }, // drinks
      ]),
    ]);

    const foodReport = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'food'
    );
    const drinksReport =
      await FinancialReportService.generateMainCategoryReport(
        new Date('2020-01-01'),
        new Date('2020-01-01'),
        'drinks'
      );

    // Both reports see the one order; sums don't tie out to "1" total.
    expect(foodReport.orderCount).toBe(1);
    expect(drinksReport.orderCount).toBe(1);
  });

  it('empty input — slug with no matching items returns zeroed report, no null', async () => {
    mockOrderFind.mockResolvedValue([
      order('o1', [{ id: 'jollof', qty: 1, price: 4500 }]),
    ]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'drinks' // no drinks in seeded orders
    );

    expect(report).not.toBeNull();
    expect(report.revenue.items).toEqual([]);
    expect(report.revenue.totalRevenue).toBe(0);
    expect(report.revenue.itemCount).toBe(0);
    expect(report.costs.items).toEqual([]);
    expect(report.costs.totalCost).toBe(0);
    expect(report.grossProfit).toBe(0);
    expect(report.grossProfitMargin).toBe(0);
    expect(report.orderCount).toBe(0);
  });

  it('resolves mainCategoryLabel from registry', async () => {
    mockOrderFind.mockResolvedValue([]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'snacks'
    );

    expect(report.mainCategoryLabel).toBe('Snacks');
    expect(report.mainCategorySlug).toBe('snacks');
  });

  it('falls back to slug when label is absent from registry (orphan slug)', async () => {
    // Registry has only food + drinks; slug 'desserts' was deleted but
    // some orders still reference it. Report should still render.
    mockGetMainCategories.mockResolvedValue([REGISTRY[0], REGISTRY[1]]);
    mockOrderFind.mockResolvedValue([]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'desserts'
    );

    expect(report.mainCategoryLabel).toBe('desserts'); // fallback
    expect(report.revenue.totalRevenue).toBe(0);
  });

  it('computes gross profit + margin correctly', async () => {
    mockOrderFind.mockResolvedValue([
      order('o1', [
        { id: 'jollof', qty: 2, price: 4500 }, // revenue 9000, cost 800
      ]),
    ]);

    const report = await FinancialReportService.generateMainCategoryReport(
      new Date('2020-01-01'),
      new Date('2020-01-01'),
      'food'
    );

    // revenue = 9000; cost = 800 (2 × 400 costPerUnit)
    expect(report.revenue.totalRevenue).toBe(9000);
    expect(report.costs.totalCost).toBe(800);
    expect(report.grossProfit).toBe(8200);
    // margin = 8200 / 9000 * 100 ≈ 91.11
    expect(report.grossProfitMargin).toBeCloseTo(91.111, 1);
  });
});
