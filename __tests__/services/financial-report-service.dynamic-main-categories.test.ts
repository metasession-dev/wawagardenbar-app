/**
 * @requirement REQ-094 — Shared financial reports must follow the dynamic
 * Main Categories registry rather than the legacy food/drinks split.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
const orderFindMock = vi.fn();
const tabFindMock = vi.fn();
const expenseFindMock = vi.fn();
const menuItemFindByIdMock = vi.fn();
const getMainCategoriesMock = vi.fn();

vi.mock('@/models/order-model', () => ({
  default: { find: () => ({ lean: () => orderFindMock() }) },
}));
vi.mock('@/models/tab-model', () => ({
  default: { find: () => ({ lean: () => tabFindMock() }) },
}));
vi.mock('@/models/expense-model', () => ({
  ExpenseModel: {
    find: () => ({
      populate: () => ({ lean: () => expenseFindMock() }),
      lean: () => expenseFindMock(),
    }),
  },
}));
vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: (id: string) => ({ lean: () => menuItemFindByIdMock(id) }),
  },
}));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue('15:00'),
    getMainCategories: (...args: unknown[]) => getMainCategoriesMock(...args),
  },
}));

import { FinancialReportService } from '@/services/financial-report-service';

beforeEach(() => {
  orderFindMock.mockReset();
  tabFindMock.mockResolvedValue([]);
  expenseFindMock.mockResolvedValue([]);
  menuItemFindByIdMock.mockReset();
  getMainCategoriesMock.mockResolvedValue([
    { slug: 'kitchen', label: 'Kitchen', order: 0, isEnabled: true },
    { slug: 'drinks', label: 'Drinks', order: 1, isEnabled: true },
    { slug: 'grill', label: 'Grill', order: 2, isEnabled: true },
  ]);
});

describe('REQ-094 dynamic shared report categories', () => {
  it('keeps every configured category distinct and in registry order', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 3000,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Jollof',
            quantity: 1,
            price: 1000,
            costPerUnit: 400,
          },
          {
            menuItemId: 'grill-item',
            name: 'Suya',
            quantity: 1,
            price: 2000,
            costPerUnit: 800,
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockImplementation((id: string) =>
      Promise.resolve({
        category: 'menu',
        mainCategory: id === 'kitchen-item' ? 'kitchen' : 'grill',
        costPerUnit: id === 'kitchen-item' ? 400 : 800,
      })
    );

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-19')
    );

    expect(report.categories.map((category) => category.label)).toEqual([
      'Kitchen',
      'Drinks',
      'Grill',
    ]);
    expect(
      report.categories.find((category) => category.slug === 'kitchen')?.revenue
        .totalRevenue
    ).toBe(1000);
    expect(
      report.categories.find((category) => category.slug === 'grill')?.revenue
        .totalRevenue
    ).toBe(2000);
    expect(
      report.categories.find((category) => category.slug === 'drinks')?.revenue
        .totalRevenue
    ).toBe(0);
    expect(report.categories.some((category) => category.unmapped)).toBe(false);
  });

  it('keeps deleted historical category values visibly unmapped', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 500,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'legacy-item',
            name: 'Legacy item',
            quantity: 1,
            price: 500,
            costPerUnit: 100,
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockResolvedValue({
      category: 'legacy',
      mainCategory: 'retired-category',
      costPerUnit: 100,
    });

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-19')
    );
    const unmapped = report.categories.find(
      (category) => category.slug === 'retired-category'
    );

    expect(unmapped).toMatchObject({
      unmapped: true,
      revenue: { totalRevenue: 500 },
      costs: { totalCost: 100 },
      grossProfit: 400,
    });
  });

  it('REQ-100 follow-up: sums actual per-line revenue when the same item sells at more than one price', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 2000,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Beef',
            quantity: 2,
            price: 1000,
            costPerUnit: 400,
          },
        ],
      },
      {
        _id: 'order-2',
        total: 1500,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Beef',
            quantity: 3,
            price: 500,
            costPerUnit: 400,
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockResolvedValue({
      category: 'menu',
      mainCategory: 'kitchen',
      costPerUnit: 400,
    });

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-19')
    );
    const kitchen = report.categories.find(
      (category) => category.slug === 'kitchen'
    );

    // Correct: sum each line's own revenue (2000 + 1500 = 3500), not
    // first-seen-price (1000) × total quantity (5) = 5000.
    expect(kitchen?.revenue.totalRevenue).toBe(3500);
    expect(kitchen?.revenue.items).toHaveLength(1);
    expect(kitchen?.revenue.items[0].quantity).toBe(5);
    expect(kitchen?.revenue.items[0].total).toBe(3500);
    expect(kitchen?.costs.totalCost).toBe(2000);
  });

  it('REQ-100 follow-up: generateDateRangeReport sums actual per-line revenue for a multi-price item too', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 2000,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Beef',
            quantity: 2,
            price: 1000,
            costPerUnit: 400,
          },
        ],
      },
      {
        _id: 'order-2',
        total: 1500,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Beef',
            quantity: 3,
            price: 500,
            costPerUnit: 400,
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockResolvedValue({
      category: 'menu',
      mainCategory: 'kitchen',
      costPerUnit: 400,
    });

    const report = await FinancialReportService.generateDateRangeReport(
      new Date('2026-07-19'),
      new Date('2026-07-20')
    );
    const kitchen = report.categories.find(
      (category) => category.slug === 'kitchen'
    );

    expect(kitchen?.revenue.totalRevenue).toBe(3500);
    expect(kitchen?.revenue.items[0].quantity).toBe(5);
  });

  it('REQ-101: splits full vs half portion sales of the same item into separate rows', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 2000,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Peppered Meat',
            quantity: 2,
            price: 1000,
            portionSize: 'full',
            costPerUnit: 400,
          },
        ],
      },
      {
        _id: 'order-2',
        total: 500,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Peppered Meat',
            quantity: 1,
            price: 500,
            portionSize: 'half',
            costPerUnit: 400,
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockResolvedValue({
      category: 'menu',
      mainCategory: 'kitchen',
      costPerUnit: 400,
    });

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-19')
    );
    const kitchen = report.categories.find(
      (category) => category.slug === 'kitchen'
    );

    // Two distinct rows, not one blended ((2000+500)/(2+1) = 833.33) row.
    expect(kitchen?.revenue.items).toHaveLength(2);
    const full = kitchen?.revenue.items.find((i) => i.name === 'Peppered Meat');
    const half = kitchen?.revenue.items.find(
      (i) => i.name === 'Peppered Meat (Half)'
    );
    expect(full).toMatchObject({ quantity: 2, price: 1000, total: 2000 });
    expect(half).toMatchObject({ quantity: 1, price: 500, total: 500 });
    expect(kitchen?.revenue.totalRevenue).toBe(2500);
  });

  it('REQ-101: an item sold only at full portion is unaffected (regression pin, matches REQ-100 fixtures)', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 2000,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Beef',
            quantity: 2,
            price: 1000,
            costPerUnit: 400,
            // No portionSize field at all — legacy order shape, must default to 'full'.
          },
        ],
      },
      {
        _id: 'order-2',
        total: 1500,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'kitchen-item',
            name: 'Beef',
            quantity: 3,
            price: 500,
            portionSize: 'full',
            costPerUnit: 400,
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockResolvedValue({
      category: 'menu',
      mainCategory: 'kitchen',
      costPerUnit: 400,
    });

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-19')
    );
    const kitchen = report.categories.find(
      (category) => category.slug === 'kitchen'
    );

    // Still one blended row — an undefined portionSize and an explicit
    // 'full' portionSize must key identically.
    expect(kitchen?.revenue.items).toHaveLength(1);
    expect(kitchen?.revenue.items[0].quantity).toBe(5);
    expect(kitchen?.revenue.items[0].total).toBe(3500);
  });

  it('uses the sale-time category when current menu metadata has changed', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order-1',
        total: 1000,
        paymentMethod: 'cash',
        items: [
          {
            menuItemId: 'moved-item',
            name: 'Historic grill item',
            quantity: 1,
            price: 1000,
            costPerUnit: 250,
            mainCategoryAtSale: 'grill',
          },
        ],
      },
    ]);
    menuItemFindByIdMock.mockResolvedValue({
      category: 'current',
      mainCategory: 'drinks',
      costPerUnit: 250,
    });

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-19')
    );

    expect(
      report.categories.find((category) => category.slug === 'grill')?.revenue
        .totalRevenue
    ).toBe(1000);
    expect(
      report.categories.find((category) => category.slug === 'drinks')?.revenue
        .totalRevenue
    ).toBe(0);
  });
});
