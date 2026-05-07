/**
 * @requirement REQ-035 — Tip recording at express checkout + tips breakdown
 *
 * Pure helpers used by the Daily Financial Report to aggregate tips by
 * payment method, separate from the existing `paymentBreakdown` (which
 * remains revenue-only — tips never inflate revenue figures, AC6).
 *
 * Mirrors the shape of `aggregatePartialPayments` in
 * `services/financial-report-service.ts`, but isolated from any DB calls.
 */
import {
  PAYMENT_METHODS_FULL,
  type PaymentMethod,
  type PaymentBreakdownKey,
} from '@/interfaces/payment-method.interface';

export type TipBreakdown = Record<PaymentBreakdownKey, number> & {
  total: number;
};

type OrderForTips = {
  tipAmount?: number;
  tipPaymentMethod?: string;
  paymentMethod?: string;
};

type PartialPaymentForTips = {
  paymentType: string;
  tipAmount?: number;
};

type TabForTips = {
  partialPayments?: PartialPaymentForTips[];
};

const KNOWN_METHODS = new Set<string>(PAYMENT_METHODS_FULL);

export function emptyTipBreakdown(): TipBreakdown {
  return {
    cash: 0,
    card: 0,
    transfer: 0,
    ussd: 0,
    phone: 0,
    unspecified: 0,
    total: 0,
  };
}

function bucketFor(method: string | undefined): PaymentBreakdownKey {
  if (method && KNOWN_METHODS.has(method)) {
    return method as PaymentMethod;
  }
  return 'unspecified';
}

/**
 * Walks paid orders and accumulates `tipAmount` keyed by
 * `tipPaymentMethod ?? paymentMethod ?? 'unspecified'`. Orders with
 * `tipAmount` of 0 (or missing) contribute nothing.
 *
 * The fallback to `paymentMethod` is intentional: legacy orders that
 * existed before REQ-035 carry a tip but no `tipPaymentMethod`. After the
 * one-shot backfill they will all have `tipPaymentMethod` set, but the
 * fallback stays in place as a defensive default.
 */
export function aggregateOrderTipsByMethod(
  orders: OrderForTips[]
): TipBreakdown {
  const breakdown = emptyTipBreakdown();
  for (const order of orders) {
    const tip = order.tipAmount ?? 0;
    if (tip <= 0) continue;
    const method = order.tipPaymentMethod ?? order.paymentMethod;
    breakdown[bucketFor(method)] += tip;
    breakdown.total += tip;
  }
  return breakdown;
}

/**
 * Walks tabs' partial-payment subdocs and accumulates `tipAmount` keyed
 * by the row's own `paymentType`. Subdocs without `tipAmount` are
 * treated as 0; unknown paymentType strings route to `unspecified`.
 */
export function aggregatePartialPaymentTipsByMethod(
  tabs: TabForTips[]
): TipBreakdown {
  const breakdown = emptyTipBreakdown();
  for (const tab of tabs) {
    for (const pp of tab.partialPayments ?? []) {
      const tip = pp.tipAmount ?? 0;
      if (tip <= 0) continue;
      breakdown[bucketFor(pp.paymentType)] += tip;
      breakdown.total += tip;
    }
  }
  return breakdown;
}

export type TipBreakdownDisplayRow = {
  method: PaymentBreakdownKey;
  amount: number;
  percent: number;
};

/**
 * Filters out zero-amount buckets and sorts the rest by amount descending.
 * Percentages are computed against `breakdown.total` and may not be
 * round numbers — leave display formatting to the consumer.
 */
export function formatTipBreakdownForDisplay(
  breakdown: TipBreakdown
): TipBreakdownDisplayRow[] {
  if (breakdown.total <= 0) return [];
  const rows: TipBreakdownDisplayRow[] = [];
  for (const key of [
    'cash',
    'card',
    'transfer',
    'ussd',
    'phone',
    'unspecified',
  ] as const) {
    const amount = breakdown[key];
    if (amount > 0) {
      rows.push({
        method: key,
        amount,
        percent: (amount / breakdown.total) * 100,
      });
    }
  }
  rows.sort((a, b) => b.amount - a.amount);
  return rows;
}
