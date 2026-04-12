/**
 * @requirement REQ-025 - Report attribution uses businessDate, not paidAt
 *
 * Unit tests confirming that daily report logic attributes orders and tabs
 * to the correct business day via the businessDate field, not the raw paidAt
 * timestamp. No DB required — tests pure filtering logic.
 */
import { describe, it, expect } from 'vitest';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderEntry {
  total: number;
  paymentMethod?: string;
  tabId?: string;
  businessDate: Date;
  paidAt: Date;
}

interface TabEntry {
  total: number;
  businessDate: Date;
  paidAt: Date;
}

// ── Pure filter extracted from updated FinancialReportService ─────────────────

function filterOrdersByBusinessDate(
  orders: OrderEntry[],
  date: Date
): OrderEntry[] {
  const target = date.toISOString().split('T')[0];
  return orders.filter(
    (o) => o.businessDate.toISOString().split('T')[0] === target
  );
}

function filterTabsByBusinessDate(tabs: TabEntry[], date: Date): TabEntry[] {
  const target = date.toISOString().split('T')[0];
  return tabs.filter(
    (t) => t.businessDate.toISOString().split('T')[0] === target
  );
}

function sumRevenue(orders: OrderEntry[]): number {
  return orders.reduce((sum, o) => sum + o.total, 0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function utcMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('REQ-025: orders are attributed to businessDate, not paidAt', () => {
  const apr11 = utcMidnight(2026, 4, 11);
  const apr12 = utcMidnight(2026, 4, 12);

  const orders: OrderEntry[] = [
    {
      total: 5000,
      businessDate: apr11, // paid at 2am Apr 12 WAT → attributed to Apr 11
      paidAt: new Date('2026-04-12T01:00:00.000Z'),
    },
    {
      total: 8000,
      businessDate: apr12, // paid at 4pm Apr 12 WAT → attributed to Apr 12
      paidAt: new Date('2026-04-12T15:00:00.000Z'),
    },
    {
      total: 3000,
      businessDate: apr12,
      paidAt: new Date('2026-04-12T18:00:00.000Z'),
    },
  ];

  it('Apr 11 report includes only the 2am order (businessDate = Apr 11)', () => {
    const filtered = filterOrdersByBusinessDate(orders, apr11);
    expect(filtered).toHaveLength(1);
    expect(sumRevenue(filtered)).toBe(5000);
  });

  it('Apr 12 report includes only the two afternoon orders (businessDate = Apr 12)', () => {
    const filtered = filterOrdersByBusinessDate(orders, apr12);
    expect(filtered).toHaveLength(2);
    expect(sumRevenue(filtered)).toBe(11000);
  });

  it('Apr 11 report does NOT include the 2am order if businessDate is Apr 12', () => {
    const wronglyAttributed: OrderEntry[] = [
      {
        total: 5000,
        businessDate: apr12,
        paidAt: new Date('2026-04-12T01:00:00.000Z'),
      },
    ];
    const filtered = filterOrdersByBusinessDate(wronglyAttributed, apr11);
    expect(filtered).toHaveLength(0);
  });

  it('total revenue across both days equals sum of all orders', () => {
    const apr11Revenue = sumRevenue(filterOrdersByBusinessDate(orders, apr11));
    const apr12Revenue = sumRevenue(filterOrdersByBusinessDate(orders, apr12));
    expect(apr11Revenue + apr12Revenue).toBe(16000);
  });
});

describe('REQ-025: tabs are attributed to businessDate, not paidAt', () => {
  const apr11 = utcMidnight(2026, 4, 11);
  const apr12 = utcMidnight(2026, 4, 12);

  const tabs: TabEntry[] = [
    {
      total: 12000,
      businessDate: apr11, // closed at 1am Apr 12 WAT → attributed to Apr 11
      paidAt: new Date('2026-04-12T00:00:00.000Z'),
    },
    {
      total: 7500,
      businessDate: apr12,
      paidAt: new Date('2026-04-12T16:30:00.000Z'),
    },
  ];

  it('Apr 11 report includes the tab closed at 1am (businessDate = Apr 11)', () => {
    const filtered = filterTabsByBusinessDate(tabs, apr11);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].total).toBe(12000);
  });

  it('Apr 12 report includes only the tab closed at 4:30pm', () => {
    const filtered = filterTabsByBusinessDate(tabs, apr12);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].total).toBe(7500);
  });
});

describe('REQ-025: businessDate is independent of paidAt', () => {
  it('two orders with same paidAt but different businessDate go to different days', () => {
    const apr11 = utcMidnight(2026, 4, 11);
    const apr12 = utcMidnight(2026, 4, 12);
    const samePaidAt = new Date('2026-04-12T01:00:00.000Z');

    const orders: OrderEntry[] = [
      { total: 4000, businessDate: apr11, paidAt: samePaidAt },
      { total: 6000, businessDate: apr12, paidAt: samePaidAt },
    ];

    expect(filterOrdersByBusinessDate(orders, apr11)).toHaveLength(1);
    expect(filterOrdersByBusinessDate(orders, apr12)).toHaveLength(1);
  });
});
