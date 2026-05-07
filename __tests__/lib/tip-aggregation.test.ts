/**
 * @requirement REQ-035 — Tip recording at express checkout + tips breakdown
 *
 * Pure-helper tests for the daily-report tip aggregation. Mirrors the
 * shape of `aggregatePartialPayments` in `services/financial-report-service.ts`,
 * but isolated from any DB calls so it can be unit-tested cheaply.
 *
 * Covers:
 *  1. Empty input → all-zero breakdown.
 *  2. Single order with `tipAmount + tipPaymentMethod` → keyed by tip method.
 *  3. Order with `tipAmount > 0` and missing `tipPaymentMethod` → fallback to
 *     `paymentMethod` (legacy path for backfill misses).
 *  4. Order with `tipAmount > 0` and missing both → unspecified bucket.
 *  5. Tab partial-payments with tipAmount → keyed by row's paymentType.
 *  6. Tab partial-payments where `tipAmount` is missing on subdoc → 0.
 *  7. Mixed input across orders + tabs → sums correctly.
 *  8. Order with `tipAmount = 0` → contributes nothing to any bucket.
 */
import { describe, it, expect } from 'vitest';
import {
  aggregateOrderTipsByMethod,
  aggregatePartialPaymentTipsByMethod,
  formatTipBreakdownForDisplay,
  emptyTipBreakdown,
} from '@/lib/tip-aggregation';
import type { TipBreakdown } from '@/lib/tip-aggregation';

type OrderFixture = {
  tipAmount?: number;
  tipPaymentMethod?: string;
  paymentMethod?: string;
};

type TabFixture = {
  partialPayments?: Array<{
    amount: number;
    paymentType: string;
    tipAmount?: number;
  }>;
};

describe('REQ-035: aggregateOrderTipsByMethod', () => {
  it('returns all-zero breakdown for empty input', () => {
    const result = aggregateOrderTipsByMethod([] as OrderFixture[]);
    expect(result).toEqual(emptyTipBreakdown());
    expect(result.total).toBe(0);
  });

  it('keys by tipPaymentMethod when present', () => {
    const orders: OrderFixture[] = [
      { tipAmount: 500, tipPaymentMethod: 'cash', paymentMethod: 'card' },
    ];
    const result = aggregateOrderTipsByMethod(orders);
    expect(result.cash).toBe(500);
    expect(result.card).toBe(0);
    expect(result.total).toBe(500);
  });

  it('falls back to paymentMethod when tipPaymentMethod is missing (legacy)', () => {
    const orders: OrderFixture[] = [
      { tipAmount: 250, paymentMethod: 'transfer' },
    ];
    const result = aggregateOrderTipsByMethod(orders);
    expect(result.transfer).toBe(250);
    expect(result.unspecified).toBe(0);
    expect(result.total).toBe(250);
  });

  it('uses unspecified bucket when both methods are missing', () => {
    const orders: OrderFixture[] = [{ tipAmount: 100 }];
    const result = aggregateOrderTipsByMethod(orders);
    expect(result.unspecified).toBe(100);
    expect(result.total).toBe(100);
  });

  it('skips orders with tipAmount = 0', () => {
    const orders: OrderFixture[] = [
      { tipAmount: 0, paymentMethod: 'cash' },
      { paymentMethod: 'card' }, // no tipAmount field at all
    ];
    const result = aggregateOrderTipsByMethod(orders);
    expect(result.total).toBe(0);
    expect(result.cash).toBe(0);
    expect(result.card).toBe(0);
  });

  it('sums multiple orders correctly across methods', () => {
    const orders: OrderFixture[] = [
      { tipAmount: 500, tipPaymentMethod: 'cash' },
      { tipAmount: 300, tipPaymentMethod: 'cash' },
      { tipAmount: 200, tipPaymentMethod: 'transfer' },
    ];
    const result = aggregateOrderTipsByMethod(orders);
    expect(result.cash).toBe(800);
    expect(result.transfer).toBe(200);
    expect(result.total).toBe(1000);
  });
});

describe('REQ-035: aggregatePartialPaymentTipsByMethod', () => {
  it('keys by partial-payment paymentType', () => {
    const tabs: TabFixture[] = [
      {
        partialPayments: [
          { amount: 2000, paymentType: 'card', tipAmount: 200 },
          { amount: 1000, paymentType: 'cash', tipAmount: 100 },
        ],
      },
    ];
    const result = aggregatePartialPaymentTipsByMethod(tabs);
    expect(result.card).toBe(200);
    expect(result.cash).toBe(100);
    expect(result.total).toBe(300);
  });

  it('treats missing tipAmount on a subdoc as 0', () => {
    const tabs: TabFixture[] = [
      {
        partialPayments: [
          { amount: 2000, paymentType: 'card' /* no tipAmount */ },
        ],
      },
    ];
    const result = aggregatePartialPaymentTipsByMethod(tabs);
    expect(result.card).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles tabs without partialPayments arrays', () => {
    const tabs: TabFixture[] = [{}, { partialPayments: [] }];
    const result = aggregatePartialPaymentTipsByMethod(tabs);
    expect(result).toEqual(emptyTipBreakdown());
  });

  it('routes unrecognised paymentType to unspecified', () => {
    // Cast to the loose fixture type so we can supply a corrupted/legacy
    // value that should never appear in production but may exist in old data.
    const tabs: TabFixture[] = [
      {
        partialPayments: [
          { amount: 1000, paymentType: 'gift-voucher', tipAmount: 50 },
        ],
      },
    ];
    const result = aggregatePartialPaymentTipsByMethod(tabs);
    expect(result.unspecified).toBe(50);
    expect(result.total).toBe(50);
  });
});

describe('REQ-035: formatTipBreakdownForDisplay', () => {
  it('returns rows only for non-zero buckets, sorted by amount desc', () => {
    const breakdown: TipBreakdown = {
      cash: 500,
      card: 1500,
      transfer: 0,
      ussd: 0,
      phone: 0,
      unspecified: 250,
      total: 2250,
    };
    const result = formatTipBreakdownForDisplay(breakdown);
    expect(result).toHaveLength(3);
    expect(result[0].method).toBe('card');
    expect(result[0].amount).toBe(1500);
    expect(result[0].percent).toBeCloseTo((1500 / 2250) * 100, 1);
    expect(result[1].method).toBe('cash');
    expect(result[2].method).toBe('unspecified');
    // Must omit zero rows entirely
    expect(result.find((r) => r.method === 'transfer')).toBeUndefined();
  });

  it('returns empty array when total is 0', () => {
    const result = formatTipBreakdownForDisplay(emptyTipBreakdown());
    expect(result).toEqual([]);
  });
});
