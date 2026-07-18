/** @requirement REQ-094 — report attribution and category filtering. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));

const findMock = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    find: (...args: unknown[]) => ({ lean: () => findMock(...args) }),
  },
}));

import { ProfitabilityAnalyticsService } from '@/services/profitability-analytics-service';

const item = (
  id: string,
  categoryAtSale: string,
  subtotal: number,
  totalCost: number
) => ({
  menuItemId: { toString: () => id },
  name: id,
  categoryAtSale,
  subtotal,
  totalCost,
  grossProfit: subtotal - totalCost,
});

describe('REQ-094: ProfitabilityAnalyticsService', () => {
  beforeEach(() => findMock.mockReset());

  it('queries paid orders by WAT-normalised businessDate, not createdAt', async () => {
    findMock.mockResolvedValue([]);
    await ProfitabilityAnalyticsService.generateProfitabilityReport(
      new Date('2026-07-18T00:00:00.000Z'),
      new Date('2026-07-18T00:00:00.000Z')
    );
    const query = findMock.mock.calls[0][0];
    expect(query.createdAt).toBeUndefined();
    expect(query.businessDate.$gte.toISOString()).toBe(
      '2026-07-17T23:00:00.000Z'
    );
    expect(query.businessDate.$lte.toISOString()).toBe(
      '2026-07-18T22:59:59.999Z'
    );
  });

  it('uses immutable category-at-sale fields and scopes category totals to matching lines', async () => {
    findMock.mockResolvedValue([
      {
        businessDate: new Date('2026-07-17T23:00:00.000Z'),
        orderType: 'dine-in',
        total: 1200,
        totalCost: 500,
        operationalCosts: { processing: 20 },
        items: [
          item('beer', 'beer-local', 700, 200),
          item('rice', 'rice-dishes', 500, 300),
        ],
      },
    ]);

    const report =
      await ProfitabilityAnalyticsService.generateProfitabilityReport(
        new Date('2026-07-18T00:00:00.000Z'),
        new Date('2026-07-18T00:00:00.000Z'),
        { category: 'beer-local' }
      );

    expect(report.summary.totalRevenue).toBe(700);
    expect(report.summary.totalCosts).toBe(200);
    expect(report.summary.grossProfit).toBe(500);
    expect(report.byCategory).toEqual([
      expect.objectContaining({
        category: 'beer-local',
        totalRevenue: 700,
        totalCost: 200,
      }),
    ]);
    expect(report.byItem).toHaveLength(1);
    expect(report.byItem[0].menuItemId).toBe('beer');
  });
});
