/**
 * @requirement REQ-048 — Tab-checkout eligible-rewards list (#117 P0 #4)
 *
 * Verifies prepareTabForCheckout wires the rewards service to the tab subtotal
 * instead of returning the old `[]` placeholder. TabModel + RewardsService are
 * mocked; recalculateTabTotals is stubbed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';

const mockFindById = vi.fn();
vi.mock('@/models/tab-model', () => ({
  default: { findById: (...a: unknown[]) => mockFindById(...a) },
}));

const mockGetEligible = vi.fn();
vi.mock('@/services/rewards-service', () => ({
  RewardsService: {
    getEligibleRules: (...a: unknown[]) => mockGetEligible(...a),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  vi.clearAllMocks();
  // prepareTabForCheckout calls this; stub it so the test stays unit-scoped.
  vi.spyOn(TabService, 'recalculateTabTotals').mockResolvedValue(
    undefined as never
  );
});

const primeFindById = (leanTab: Record<string, unknown>) => {
  const openTab = { _id: TAB_ID, status: 'open', tipAmount: 0, save: vi.fn() };
  // 1st findById(id) → open doc; 2nd findById(id).lean() → leanTab
  mockFindById
    .mockReturnValueOnce(Promise.resolve(openTab))
    .mockReturnValueOnce({ lean: () => Promise.resolve(leanTab) });
};

describe('REQ-048: TabService.prepareTabForCheckout eligible rewards', () => {
  it('returns reward rules eligible for the tab subtotal', async () => {
    primeFindById({ _id: TAB_ID, status: 'open', subtotal: 5000 });
    mockGetEligible.mockResolvedValue([{ _id: 'r1', spendThreshold: 1000 }]);

    const result = await TabService.prepareTabForCheckout(TAB_ID, 0);

    expect(mockGetEligible).toHaveBeenCalledWith(5000);
    expect(result.eligibleRewards).toHaveLength(1);
    expect(result.eligibleRewards[0]._id).toBe('r1');
  });

  it('returns an empty list when no rules apply', async () => {
    primeFindById({ _id: TAB_ID, status: 'open', subtotal: 100 });
    mockGetEligible.mockResolvedValue([]);

    const result = await TabService.prepareTabForCheckout(TAB_ID, 0);

    expect(mockGetEligible).toHaveBeenCalledWith(100);
    expect(result.eligibleRewards).toEqual([]);
  });
});
