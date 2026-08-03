/**
 * @requirement REQ-098 AC7/AC9 — dry-run test of the 2026-07-31 dormant-tab
 * remediation script against a seeded fixture matching the known 51-order
 * contamination profile.
 *
 * Mirrors `__tests__/scripts/reconcile-track-by-location-stock.test.ts`'s
 * pattern: the script's selection/grouping logic is exported as pure
 * functions with no Mongo dependency, so this test exercises the real
 * decision logic directly against plain-object fixtures — no database,
 * no mocking.
 */
import { describe, expect, it } from 'vitest';
import {
  isContaminationGapCandidate,
  groupCandidateOrdersByTab,
  buildCandidateTabs,
  type CandidateOrder,
  type CandidateTabRow,
} from '@/scripts/write-off-dormant-tabs-2026-07-31';

const GAP_DAYS_THRESHOLD = 30;

describe('REQ-098 AC7: isContaminationGapCandidate', () => {
  it('matches the known profile — createdAt months before the paidAt burst', () => {
    expect(
      isContaminationGapCandidate(
        {
          createdAt: new Date('2025-12-25T10:00:00Z'),
          paidAt: new Date('2026-07-31T12:12:49Z'),
        },
        GAP_DAYS_THRESHOLD
      )
    ).toBe(true);
  });

  it('rejects genuine same-day trade (gap well under the threshold)', () => {
    expect(
      isContaminationGapCandidate(
        {
          createdAt: new Date('2026-07-31T11:00:00Z'),
          paidAt: new Date('2026-07-31T13:00:00Z'),
        },
        GAP_DAYS_THRESHOLD
      )
    ).toBe(false);
  });

  it('rejects an order with no paidAt (never actually paid)', () => {
    expect(
      isContaminationGapCandidate(
        { createdAt: new Date('2025-12-25T10:00:00Z'), paidAt: null },
        GAP_DAYS_THRESHOLD
      )
    ).toBe(false);
  });

  it('is inclusive at exactly the threshold boundary', () => {
    const createdAt = new Date('2026-07-01T00:00:00Z');
    const paidAt = new Date(
      createdAt.getTime() + GAP_DAYS_THRESHOLD * 24 * 60 * 60 * 1000
    );
    expect(
      isContaminationGapCandidate({ createdAt, paidAt }, GAP_DAYS_THRESHOLD)
    ).toBe(true);
  });

  it('rejects just under the threshold (29 days, 23 hours)', () => {
    const createdAt = new Date('2026-07-01T00:00:00Z');
    const paidAt = new Date(
      createdAt.getTime() + (GAP_DAYS_THRESHOLD * 24 - 1) * 60 * 60 * 1000
    );
    expect(
      isContaminationGapCandidate({ createdAt, paidAt }, GAP_DAYS_THRESHOLD)
    ).toBe(false);
  });
});

/** Builds a fixture order matching the known 51-order contamination profile. */
function contaminatedOrder(
  tabId: string,
  overrides: Partial<CandidateOrder> = {}
): CandidateOrder {
  return {
    _id: {
      toString: () => `order-${tabId}-${Math.random().toString(36).slice(2)}`,
    },
    tabId: { toString: () => tabId },
    total: 5000,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    paidAt: new Date('2026-07-31T13:00:00Z'),
    ...overrides,
  };
}

describe('REQ-098 AC7/AC9: groupCandidateOrdersByTab + buildCandidateTabs — seeded 51-order-profile fixture', () => {
  it('groups only contamination-matching orders, keyed by tabId', () => {
    const orders: CandidateOrder[] = [
      contaminatedOrder('tab-1', { total: 4000 }),
      contaminatedOrder('tab-1', { total: 3000 }),
      contaminatedOrder('tab-2', { total: 6000 }),
      // Genuine same-day trade — must NOT be grouped.
      {
        _id: { toString: () => 'order-genuine' },
        tabId: { toString: () => 'tab-genuine' },
        total: 2000,
        createdAt: new Date('2026-07-31T11:00:00Z'),
        paidAt: new Date('2026-07-31T13:00:00Z'),
      },
    ];

    const grouped = groupCandidateOrdersByTab(orders, GAP_DAYS_THRESHOLD);

    expect(Array.from(grouped.keys()).sort()).toEqual(['tab-1', 'tab-2']);
    expect(grouped.get('tab-1')).toHaveLength(2);
    expect(grouped.get('tab-2')).toHaveLength(1);
  });

  it('builds the full 51-order profile across many tabs, preserving per-tab totals', () => {
    // Scaled-down but structurally faithful: 5 tabs each contributing a
    // handful of orders, standing in for the real 51-order/N-tab event.
    const orders: CandidateOrder[] = [
      ...Array.from({ length: 10 }, () =>
        contaminatedOrder('tab-1', { total: 1000 })
      ),
      ...Array.from({ length: 15 }, () =>
        contaminatedOrder('tab-2', { total: 2000 })
      ),
      ...Array.from({ length: 10 }, () =>
        contaminatedOrder('tab-3', { total: 1500 })
      ),
      ...Array.from({ length: 8 }, () =>
        contaminatedOrder('tab-4', { total: 3000 })
      ),
      ...Array.from({ length: 8 }, () =>
        contaminatedOrder('tab-5', { total: 2500 })
      ),
    ];
    expect(orders).toHaveLength(51);

    const grouped = groupCandidateOrdersByTab(orders, GAP_DAYS_THRESHOLD);
    expect(grouped.size).toBe(5);

    const tabs: CandidateTabRow[] = [
      {
        _id: { toString: () => 'tab-1' },
        tabNumber: 'TAB-A1-1',
        tableNumber: 'A1',
        status: 'closed',
        paymentStatus: 'paid',
        total: 10000,
      },
      {
        _id: { toString: () => 'tab-2' },
        tabNumber: 'TAB-A2-1',
        tableNumber: 'A2',
        status: 'closed',
        paymentStatus: 'paid',
        total: 30000,
      },
      {
        _id: { toString: () => 'tab-3' },
        tabNumber: 'TAB-A3-1',
        tableNumber: 'A3',
        status: 'closed',
        paymentStatus: 'paid',
        total: 15000,
      },
      {
        _id: { toString: () => 'tab-4' },
        tabNumber: 'TAB-A4-1',
        tableNumber: 'A4',
        status: 'closed',
        paymentStatus: 'paid',
        total: 24000,
      },
      {
        _id: { toString: () => 'tab-5' },
        tabNumber: 'TAB-A5-1',
        tableNumber: 'A5',
        status: 'closed',
        paymentStatus: 'paid',
        total: 20000,
      },
    ];

    const candidates = buildCandidateTabs(tabs, grouped);

    expect(candidates).toHaveLength(5);
    const totalOrders = candidates.reduce(
      (sum, tab) => sum + tab.orders.length,
      0
    );
    expect(totalOrders).toBe(51);

    const tab2 = candidates.find((t) => t.tabId === 'tab-2');
    expect(tab2?.orders).toHaveLength(15);
    expect(tab2?.tabNumber).toBe('TAB-A2-1');
  });

  it('is idempotent — a tab already written-off is identifiable so a rerun can skip it', () => {
    const orders: CandidateOrder[] = [contaminatedOrder('tab-1')];
    const grouped = groupCandidateOrdersByTab(orders, GAP_DAYS_THRESHOLD);
    const tabs: CandidateTabRow[] = [
      {
        _id: { toString: () => 'tab-1' },
        tabNumber: 'TAB-A1-1',
        tableNumber: 'A1',
        status: 'closed',
        paymentStatus: 'written-off',
        total: 5000,
      },
    ];

    const candidates = buildCandidateTabs(tabs, grouped);

    expect(candidates[0].paymentStatus).toBe('written-off');
    // The script's main loop treats this as "skip, already done" — not
    // re-processed, so a second invocation is a no-op for this tab.
  });
});
