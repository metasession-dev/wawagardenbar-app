/**
 * @requirement REQ-032 - Create pending expense group from existing expenses
 *
 * Tests for the pure mapping helpers that convert recorded `Expense` rows
 * into `IExpenseLineItem` shapes for pre-populating the Add Expense dialog.
 */
import { describe, it, expect } from 'vitest';
import {
  mapExpenseToLineItem,
  mapExpensesToLineItems,
} from '@/lib/expense-to-line-item';

const baseExpense = {
  _id: 'expense-1',
  date: new Date('2026-04-15'),
  expenseType: 'direct-cost' as const,
  category: 'Meat/Protein',
  description: 'Goat meat — fresh delivery',
  quantity: 5,
  unit: 'kg',
  amount: 25000,
  createdBy: { firstName: 'Jane', lastName: 'Doe', email: 'jane@x.com' },
};

describe('REQ-032: mapExpenseToLineItem', () => {
  it('copies expenseType, category, and description verbatim', () => {
    const line = mapExpenseToLineItem(baseExpense);
    expect(line.expenseType).toBe('direct-cost');
    expect(line.category).toBe('Meat/Protein');
    expect(line.description).toBe('Goat meat — fresh delivery');
  });

  it('preserves quantity and unit when present', () => {
    const line = mapExpenseToLineItem(baseExpense);
    expect(line.quantity).toBe(5);
    expect(line.unit).toBe('kg');
  });

  it('defaults quantity to 1 when missing', () => {
    const line = mapExpenseToLineItem({
      ...baseExpense,
      quantity: undefined,
    });
    expect(line.quantity).toBe(1);
  });

  it("defaults unit to 'each' when missing", () => {
    const line = mapExpenseToLineItem({
      ...baseExpense,
      unit: undefined,
    });
    expect(line.unit).toBe('each');
  });

  it('totalCost equals source amount exactly (preserves recorded amount)', () => {
    const line = mapExpenseToLineItem({ ...baseExpense, amount: 12345.67 });
    expect(line.totalCost).toBe(12345.67);
  });

  it('unitCost = amount / quantity, rounded to 2 decimal places', () => {
    const line = mapExpenseToLineItem({
      ...baseExpense,
      amount: 1000,
      quantity: 3,
    });
    // 1000 / 3 = 333.333... → rounds to 333.33
    expect(line.unitCost).toBe(333.33);
  });

  it('unitCost = amount / 1 when quantity is missing', () => {
    const line = mapExpenseToLineItem({
      ...baseExpense,
      amount: 50000,
      quantity: undefined,
    });
    expect(line.unitCost).toBe(50000);
  });

  it('returns a shape compatible with IExpenseLineItem (all fields present, no extras)', () => {
    const line = mapExpenseToLineItem(baseExpense);
    expect(Object.keys(line).sort()).toEqual([
      'category',
      'description',
      'expenseType',
      'quantity',
      'totalCost',
      'unit',
      'unitCost',
    ]);
  });
});

describe('REQ-032: mapExpensesToLineItems', () => {
  it('maps multiple expenses to a parallel array of line items, preserving order', () => {
    const items = mapExpensesToLineItems([
      baseExpense,
      {
        ...baseExpense,
        _id: 'expense-2',
        description: 'Cooking gas refill',
        amount: 8000,
      },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].description).toBe('Goat meat — fresh delivery');
    expect(items[1].description).toBe('Cooking gas refill');
    expect(items[1].totalCost).toBe(8000);
  });

  it('returns an empty array when given no expenses', () => {
    expect(mapExpensesToLineItems([])).toEqual([]);
  });
});
