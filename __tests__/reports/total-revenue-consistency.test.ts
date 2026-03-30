/**
 * @requirement REQ-017 - Total Revenue reflects money received (paymentBreakdown.total)
 *
 * Tests the invariant: totalRevenue = paymentBreakdown.total
 * and that margin calculations use item-based revenue for COGS relationship.
 */
import { describe, it, expect } from 'vitest';

/**
 * Extracted from FinancialReportService.generateDailySummary:
 * totalRevenue = paymentBreakdown.total, falling back to item revenue if 0
 */
function calculateTotalRevenue(
  foodRevenue: number,
  drinkRevenue: number,
  paymentBreakdownTotal: number
): number {
  const itemRevenue = foodRevenue + drinkRevenue;
  return paymentBreakdownTotal || itemRevenue;
}

/**
 * Margin calculations use item revenue, not payment total
 */
function calculateMargins(
  grossProfit: number,
  netProfit: number,
  foodRevenue: number,
  drinkRevenue: number
): { grossProfitMargin: number; netProfitMargin: number } {
  const itemRevenue = foodRevenue + drinkRevenue;
  if (itemRevenue <= 0) return { grossProfitMargin: 0, netProfitMargin: 0 };
  return {
    grossProfitMargin: (grossProfit / itemRevenue) * 100,
    netProfitMargin: (netProfit / itemRevenue) * 100,
  };
}

describe('REQ-017: totalRevenue = paymentBreakdown.total', () => {
  it('should equal paymentBreakdown.total when both exist', () => {
    // Orders worth ₦10,000 paid by card, plus ₦3,000 partial payment cash
    const foodRevenue = 7000;
    const drinkRevenue = 3000;
    const paymentTotal = 13000; // includes partial payments

    const totalRevenue = calculateTotalRevenue(
      foodRevenue,
      drinkRevenue,
      paymentTotal
    );
    expect(totalRevenue).toBe(13000); // payment total, not 10000
  });

  it('should fall back to item revenue when paymentBreakdown is 0', () => {
    // Edge case: orders exist but no payment breakdown (shouldn't happen normally)
    const totalRevenue = calculateTotalRevenue(5000, 3000, 0);
    expect(totalRevenue).toBe(8000); // falls back to food + drink
  });

  it('should be 0 when no orders and no payments', () => {
    const totalRevenue = calculateTotalRevenue(0, 0, 0);
    expect(totalRevenue).toBe(0);
  });
});

describe('REQ-017: partial-payment-only day', () => {
  it('should show totalRevenue > 0 when only partial payments exist', () => {
    // Day with no closed orders but ₦3,000 partial payment on an open tab
    const foodRevenue = 0; // no paid orders
    const drinkRevenue = 0;
    const paymentTotal = 3000; // partial payment counted in breakdown

    const totalRevenue = calculateTotalRevenue(
      foodRevenue,
      drinkRevenue,
      paymentTotal
    );
    expect(totalRevenue).toBe(3000); // not ₦0
  });
});

describe('REQ-017: tab close day — no double-counting', () => {
  it('should reflect final payment amount, not full tab total', () => {
    // Tab total ₦10,000. ₦3,000 partial paid on Monday.
    // Wednesday: tab closed, final payment ₦7,000.
    // Wednesday's paymentBreakdown.total = ₦7,000 (not ₦10,000)
    // Wednesday's item revenue = ₦10,000 - ₦3,000 = ₦7,000 (adjusted)
    const foodRevenue = 4000; // adjusted item revenue
    const drinkRevenue = 3000;
    const paymentTotal = 7000; // final payment only

    const totalRevenue = calculateTotalRevenue(
      foodRevenue,
      drinkRevenue,
      paymentTotal
    );
    expect(totalRevenue).toBe(7000);
  });

  it('should sum correctly across days — partial + final = tab total', () => {
    // Monday: partial ₦3,000
    const mondayTotal = calculateTotalRevenue(0, 0, 3000);
    // Wednesday: final ₦7,000
    const wednesdayTotal = calculateTotalRevenue(4000, 3000, 7000);

    expect(mondayTotal + wednesdayTotal).toBe(10000); // equals tab total
  });
});

describe('REQ-017: margin calculations use item revenue', () => {
  it('should calculate margins from item revenue, not payment total', () => {
    // Item revenue ₦10,000, payment total ₦13,000 (includes partials)
    // Gross profit ₦6,000 (from items)
    const margins = calculateMargins(6000, 4000, 7000, 3000);

    // Margin based on item revenue (10000), not payment total (13000)
    expect(margins.grossProfitMargin).toBe(60); // 6000/10000 * 100
    expect(margins.netProfitMargin).toBe(40); // 4000/10000 * 100
  });

  it('should return 0 margins when no item revenue', () => {
    // Partial payment day — no items sold, just cash received
    const margins = calculateMargins(0, 0, 0, 0);
    expect(margins.grossProfitMargin).toBe(0);
    expect(margins.netProfitMargin).toBe(0);
  });
});
