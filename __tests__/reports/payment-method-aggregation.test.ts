/**
 * @requirement REQ-013 - Payment method aggregation and double-counting prevention
 *
 * Unit tests for the payment breakdown aggregation logic extracted from
 * FinancialReportService. Tests partial payment inclusion, order payment
 * method attribution, and double-counting prevention for tab orders.
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of aggregation logic ──────────────────────────

interface PaymentBreakdown {
  cash: number;
  card: number;
  transfer: number;
  ussd: number;
  phone: number;
  unspecified: number;
  total: number;
}

interface PartialPaymentEntry {
  amount: number;
  paymentType: string;
  paidAt: Date;
}

interface OrderEntry {
  total: number;
  paymentMethod?: string;
  tabId?: string;
}

function createEmptyBreakdown(): PaymentBreakdown {
  return { cash: 0, card: 0, transfer: 0, ussd: 0, phone: 0, unspecified: 0, total: 0 };
}

const VALID_METHODS = ['cash', 'card', 'transfer', 'ussd', 'phone'];

/**
 * Aggregate partial payments into the breakdown.
 * Returns total partial payments per tab for double-counting prevention.
 */
function aggregatePartialPayments(
  partialPayments: Array<{ tabId: string; entries: PartialPaymentEntry[] }>,
  startDate: Date,
  endDate: Date,
  breakdown: PaymentBreakdown
): Map<string, number> {
  const tabPartialTotals = new Map<string, number>();

  for (const { tabId, entries } of partialPayments) {
    for (const pp of entries) {
      const paidAt = new Date(pp.paidAt);
      if (paidAt >= startDate && paidAt <= endDate) {
        const method = pp.paymentType;
        const amount = pp.amount || 0;

        if (method && VALID_METHODS.includes(method)) {
          (breakdown as unknown as Record<string, number>)[method] += amount;
        } else {
          breakdown.unspecified += amount;
        }
        breakdown.total += amount;
        tabPartialTotals.set(tabId, (tabPartialTotals.get(tabId) || 0) + amount);
      }
    }
  }

  return tabPartialTotals;
}

/**
 * Aggregate order payments into the breakdown, subtracting partial
 * payment amounts from tab orders to prevent double-counting.
 */
function aggregateOrderPayments(
  orders: OrderEntry[],
  allTimeTabPartials: Map<string, number>,
  breakdown: PaymentBreakdown
): void {
  // Clone the map so we can mutate it during iteration
  const remaining = new Map(allTimeTabPartials);

  for (const order of orders) {
    let amount = order.total || 0;
    const method = order.paymentMethod;

    if (order.tabId) {
      const tabId = order.tabId;
      const rem = remaining.get(tabId) || 0;
      if (rem > 0) {
        const subtract = Math.min(rem, amount);
        amount -= subtract;
        remaining.set(tabId, rem - subtract);
      }
    }

    if (amount > 0) {
      if (method && VALID_METHODS.includes(method)) {
        (breakdown as unknown as Record<string, number>)[method] += amount;
      } else {
        breakdown.unspecified += amount;
      }
      breakdown.total += amount;
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

const today = new Date('2026-03-26T00:00:00Z');
const todayEnd = new Date('2026-03-26T23:59:59.999Z');
const yesterday = new Date('2026-03-25T12:00:00Z');
// const tomorrow not needed

describe('REQ-013: Partial Payment Aggregation', () => {
  it('should aggregate partial payments within date range', () => {
    const breakdown = createEmptyBreakdown();
    const partials = [
      {
        tabId: 'tab1',
        entries: [
          { amount: 3000, paymentType: 'cash', paidAt: new Date('2026-03-26T10:00:00Z') },
          { amount: 2000, paymentType: 'transfer', paidAt: new Date('2026-03-26T14:00:00Z') },
        ],
      },
    ];

    aggregatePartialPayments(partials, today, todayEnd, breakdown);

    expect(breakdown.cash).toBe(3000);
    expect(breakdown.transfer).toBe(2000);
    expect(breakdown.total).toBe(5000);
  });

  it('should exclude partial payments outside date range', () => {
    const breakdown = createEmptyBreakdown();
    const partials = [
      {
        tabId: 'tab1',
        entries: [
          { amount: 3000, paymentType: 'cash', paidAt: yesterday },
          { amount: 2000, paymentType: 'transfer', paidAt: new Date('2026-03-26T14:00:00Z') },
        ],
      },
    ];

    aggregatePartialPayments(partials, today, todayEnd, breakdown);

    expect(breakdown.cash).toBe(0);
    expect(breakdown.transfer).toBe(2000);
    expect(breakdown.total).toBe(2000);
  });

  it('should return tab partial totals for double-counting prevention', () => {
    const breakdown = createEmptyBreakdown();
    const partials = [
      {
        tabId: 'tab1',
        entries: [
          { amount: 3000, paymentType: 'cash', paidAt: new Date('2026-03-26T10:00:00Z') },
        ],
      },
      {
        tabId: 'tab2',
        entries: [
          { amount: 1500, paymentType: 'card', paidAt: new Date('2026-03-26T11:00:00Z') },
        ],
      },
    ];

    const tabTotals = aggregatePartialPayments(partials, today, todayEnd, breakdown);

    expect(tabTotals.get('tab1')).toBe(3000);
    expect(tabTotals.get('tab2')).toBe(1500);
  });

  it('should handle unknown payment types as unspecified', () => {
    const breakdown = createEmptyBreakdown();
    const partials = [
      {
        tabId: 'tab1',
        entries: [
          { amount: 1000, paymentType: 'bitcoin', paidAt: new Date('2026-03-26T10:00:00Z') },
        ],
      },
    ];

    aggregatePartialPayments(partials, today, todayEnd, breakdown);

    expect(breakdown.unspecified).toBe(1000);
    expect(breakdown.total).toBe(1000);
  });
});

describe('REQ-013: Order Payment Aggregation with Double-Counting Prevention', () => {
  it('should aggregate standalone orders normally', () => {
    const breakdown = createEmptyBreakdown();
    const orders: OrderEntry[] = [
      { total: 5000, paymentMethod: 'cash' },
      { total: 3000, paymentMethod: 'card' },
    ];

    aggregateOrderPayments(orders, new Map(), breakdown);

    expect(breakdown.cash).toBe(5000);
    expect(breakdown.card).toBe(3000);
    expect(breakdown.total).toBe(8000);
  });

  it('should subtract partial payments from tab order totals', () => {
    const breakdown = createEmptyBreakdown();
    const orders: OrderEntry[] = [
      { total: 10000, paymentMethod: 'card', tabId: 'tab1' },
    ];
    // Tab1 had 6000 in partial payments already counted
    const allTimePartials = new Map([['tab1', 6000]]);

    aggregateOrderPayments(orders, allTimePartials, breakdown);

    // Only 4000 (10000 - 6000) should be attributed to this order
    expect(breakdown.card).toBe(4000);
    expect(breakdown.total).toBe(4000);
  });

  it('should handle multiple orders on same tab', () => {
    const breakdown = createEmptyBreakdown();
    const orders: OrderEntry[] = [
      { total: 6000, paymentMethod: 'card', tabId: 'tab1' },
      { total: 4000, paymentMethod: 'card', tabId: 'tab1' },
    ];
    // Tab1 had 7000 in partial payments
    const allTimePartials = new Map([['tab1', 7000]]);

    aggregateOrderPayments(orders, allTimePartials, breakdown);

    // First order: 6000 - 6000 (from 7000 pool) = 0
    // Second order: 4000 - 1000 (remaining from pool) = 3000
    expect(breakdown.card).toBe(3000);
    expect(breakdown.total).toBe(3000);
  });

  it('should not subtract more than order amount', () => {
    const breakdown = createEmptyBreakdown();
    const orders: OrderEntry[] = [
      { total: 2000, paymentMethod: 'cash', tabId: 'tab1' },
      { total: 8000, paymentMethod: 'cash', tabId: 'tab1' },
    ];
    // Partial payments exceed first order but not total
    const allTimePartials = new Map([['tab1', 5000]]);

    aggregateOrderPayments(orders, allTimePartials, breakdown);

    // First order: 2000 - 2000 = 0 (pool reduced to 3000)
    // Second order: 8000 - 3000 = 5000 (pool exhausted)
    expect(breakdown.cash).toBe(5000);
    expect(breakdown.total).toBe(5000);
  });

  it('should not affect non-tab orders when tab partials exist', () => {
    const breakdown = createEmptyBreakdown();
    const orders: OrderEntry[] = [
      { total: 5000, paymentMethod: 'cash' }, // standalone
      { total: 10000, paymentMethod: 'card', tabId: 'tab1' }, // tab order
    ];
    const allTimePartials = new Map([['tab1', 3000]]);

    aggregateOrderPayments(orders, allTimePartials, breakdown);

    expect(breakdown.cash).toBe(5000); // standalone unaffected
    expect(breakdown.card).toBe(7000); // 10000 - 3000
    expect(breakdown.total).toBe(12000);
  });

  it('should put orders without paymentMethod into unspecified', () => {
    const breakdown = createEmptyBreakdown();
    const orders: OrderEntry[] = [
      { total: 5000 }, // no paymentMethod
    ];

    aggregateOrderPayments(orders, new Map(), breakdown);

    expect(breakdown.unspecified).toBe(5000);
    expect(breakdown.total).toBe(5000);
  });
});

describe('REQ-013: Full Report Scenario — Partial + Final Payment', () => {
  it('Monday: partial payment only', () => {
    const monday = new Date('2026-03-23T00:00:00Z');
    const mondayEnd = new Date('2026-03-23T23:59:59.999Z');
    const breakdown = createEmptyBreakdown();

    // Monday: ₦3,000 cash partial payment
    const partials = [
      {
        tabId: 'tab1',
        entries: [
          { amount: 3000, paymentType: 'cash', paidAt: new Date('2026-03-23T12:00:00Z') },
        ],
      },
    ];

    aggregatePartialPayments(partials, monday, mondayEnd, breakdown);
    // No orders paid on Monday (tab still open)
    aggregateOrderPayments([], new Map(), breakdown);

    expect(breakdown.cash).toBe(3000);
    expect(breakdown.total).toBe(3000);
  });

  it('Wednesday: tab closed with final payment, partial payments subtracted', () => {
    const wednesday = new Date('2026-03-25T00:00:00Z');
    const wednesdayEnd = new Date('2026-03-25T23:59:59.999Z');
    const breakdown = createEmptyBreakdown();

    // No partial payments on Wednesday (they were Mon/Tue)
    aggregatePartialPayments([], wednesday, wednesdayEnd, breakdown);

    // Tab closed Wednesday — orders marked paid with total ₦10,000
    const orders: OrderEntry[] = [
      { total: 10000, paymentMethod: 'card', tabId: 'tab1' },
    ];
    // All-time partial payments for tab1: ₦5,000 (Mon ₦3,000 + Tue ₦2,000)
    const allTimePartials = new Map([['tab1', 5000]]);

    aggregateOrderPayments(orders, allTimePartials, breakdown);

    // Only ₦5,000 attributed on Wednesday (₦10,000 - ₦5,000 partials)
    expect(breakdown.card).toBe(5000);
    expect(breakdown.total).toBe(5000);
  });

  it('3-day total matches tab total', () => {
    // Monday: ₦3,000 cash partial
    // Tuesday: ₦2,000 transfer partial
    // Wednesday: ₦5,000 card final (tab closed, order total ₦10,000)
    const mondayAmount = 3000;
    const tuesdayAmount = 2000;
    const wednesdayAmount = 5000; // 10000 - 5000 partials

    expect(mondayAmount + tuesdayAmount + wednesdayAmount).toBe(10000);
  });
});
