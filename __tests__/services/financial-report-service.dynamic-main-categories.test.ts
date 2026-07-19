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

vi.mock('@/models/order-model', () => ({ default: { find: () => ({ lean: () => orderFindMock() }) } }));
vi.mock('@/models/tab-model', () => ({ default: { find: () => ({ lean: () => tabFindMock() }) } }));
vi.mock('@/models/expense-model', () => ({ ExpenseModel: { find: () => ({ populate: () => ({ lean: () => expenseFindMock() }), lean: () => expenseFindMock() }) } }));
vi.mock('@/models/menu-item-model', () => ({ default: { findById: (id: string) => ({ lean: () => menuItemFindByIdMock(id) }) } }));
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
    orderFindMock.mockResolvedValue([{ _id: 'order-1', total: 3000, paymentMethod: 'cash', items: [
      { menuItemId: 'kitchen-item', name: 'Jollof', quantity: 1, price: 1000, costPerUnit: 400 },
      { menuItemId: 'grill-item', name: 'Suya', quantity: 1, price: 2000, costPerUnit: 800 },
    ] }]);
    menuItemFindByIdMock.mockImplementation((id: string) => Promise.resolve({
      category: 'menu', mainCategory: id === 'kitchen-item' ? 'kitchen' : 'grill', costPerUnit: id === 'kitchen-item' ? 400 : 800,
    }));

    const report = await FinancialReportService.generateDailySummary(new Date('2026-07-19'));

    expect(report.categories.map((category) => category.label)).toEqual(['Kitchen', 'Drinks', 'Grill']);
    expect(report.categories.find((category) => category.slug === 'kitchen')?.revenue.totalRevenue).toBe(1000);
    expect(report.categories.find((category) => category.slug === 'grill')?.revenue.totalRevenue).toBe(2000);
    expect(report.categories.find((category) => category.slug === 'drinks')?.revenue.totalRevenue).toBe(0);
    expect(report.categories.some((category) => category.unmapped)).toBe(false);
  });

  it('keeps deleted historical category values visibly unmapped', async () => {
    orderFindMock.mockResolvedValue([{ _id: 'order-1', total: 500, paymentMethod: 'cash', items: [
      { menuItemId: 'legacy-item', name: 'Legacy item', quantity: 1, price: 500, costPerUnit: 100 },
    ] }]);
    menuItemFindByIdMock.mockResolvedValue({ category: 'legacy', mainCategory: 'retired-category', costPerUnit: 100 });

    const report = await FinancialReportService.generateDailySummary(new Date('2026-07-19'));
    const unmapped = report.categories.find((category) => category.slug === 'retired-category');

    expect(unmapped).toMatchObject({ unmapped: true, revenue: { totalRevenue: 500 }, costs: { totalCost: 100 }, grossProfit: 400 });
  });

  it('uses the sale-time category when current menu metadata has changed', async () => {
    orderFindMock.mockResolvedValue([{ _id: 'order-1', total: 1000, paymentMethod: 'cash', items: [
      { menuItemId: 'moved-item', name: 'Historic grill item', quantity: 1, price: 1000, costPerUnit: 250, mainCategoryAtSale: 'grill' },
    ] }]);
    menuItemFindByIdMock.mockResolvedValue({ category: 'current', mainCategory: 'drinks', costPerUnit: 250 });

    const report = await FinancialReportService.generateDailySummary(new Date('2026-07-19'));

    expect(report.categories.find((category) => category.slug === 'grill')?.revenue.totalRevenue).toBe(1000);
    expect(report.categories.find((category) => category.slug === 'drinks')?.revenue.totalRevenue).toBe(0);
  });
});
