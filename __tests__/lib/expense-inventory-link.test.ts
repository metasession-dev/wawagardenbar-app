/**
 * @requirement REQ-034 — AC5 / AC6 / AC7
 *
 * Pure-helper coverage for the Expense → Inventory link. The actual service
 * wiring is exercised by `__tests__/services/expense-inventory-link.test.ts`
 * (save path) and `__tests__/services/expense-inventory-link.reversal.test.ts`
 * (edit / delete reversal + block-on-negative).
 */
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import {
  DEFAULT_EXPENSE_QUANTITY,
  resolveExpenseQuantity,
  shouldShowAddToInventoryDropdown,
  filterKitchenIngredientInventory,
  buildStockMovementFromExpense,
  buildCostHistoryRowFromExpense,
  computeWeightedAverageCost,
  validateReversalDoesNotNegate,
  convertExpenseQuantityToInventoryUnit,
  validateExpenseUnitAgainstOverride,
} from '@/lib/expense-inventory-link';
import type { InventoryKind } from '@/interfaces/inventory.interface';
import type { UnitOfMeasurement } from '@/interfaces/unit-of-measurement.interface';

const D10_REGISTRY: UnitOfMeasurement[] = [
  { id: 'g', label: 'Grams (g)', category: 'mass', isActive: true },
  { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
  { id: 'ml', label: 'Millilitres (ml)', category: 'volume', isActive: true },
  { id: 'litres', label: 'Litres', category: 'volume', isActive: true },
  { id: 'eggs', label: 'Eggs', category: 'count', isActive: true },
  { id: 'pieces', label: 'Pieces', category: 'count', isActive: true },
];

describe('REQ-034 — resolveExpenseQuantity (REQ-032 default of 1)', () => {
  it('defaults a missing quantity to 1', () => {
    expect(resolveExpenseQuantity(undefined)).toBe(DEFAULT_EXPENSE_QUANTITY);
    expect(resolveExpenseQuantity(null)).toBe(DEFAULT_EXPENSE_QUANTITY);
  });

  it('passes a positive quantity through unchanged', () => {
    expect(resolveExpenseQuantity(2.5)).toBe(2.5);
    expect(resolveExpenseQuantity(100)).toBe(100);
  });

  it('throws on zero, negative, or non-finite quantity', () => {
    expect(() => resolveExpenseQuantity(0)).toThrow(/positive/);
    expect(() => resolveExpenseQuantity(-1)).toThrow(/positive/);
    expect(() => resolveExpenseQuantity(Number.NaN)).toThrow(/positive/);
    expect(() => resolveExpenseQuantity(Number.POSITIVE_INFINITY)).toThrow(
      /positive/
    );
  });
});

describe('REQ-034 AC5 — shouldShowAddToInventoryDropdown', () => {
  it('shows the dropdown only for direct-cost expenses', () => {
    expect(shouldShowAddToInventoryDropdown('direct-cost')).toBe(true);
  });

  it('hides the dropdown for operating-expense lines', () => {
    expect(shouldShowAddToInventoryDropdown('operating-expense')).toBe(false);
  });

  it('hides the dropdown for unknown / unset types (fail-closed)', () => {
    expect(shouldShowAddToInventoryDropdown(undefined)).toBe(false);
    expect(shouldShowAddToInventoryDropdown('')).toBe(false);
    expect(shouldShowAddToInventoryDropdown('something-else')).toBe(false);
  });
});

describe('REQ-034 AC5 — filterKitchenIngredientInventory', () => {
  type Row = { _id: string; kind?: InventoryKind | null };
  const rows: Row[] = [
    { _id: 'a', kind: 'menu-item' },
    { _id: 'b', kind: 'kitchen-ingredient' },
    { _id: 'c', kind: 'kitchen-ingredient' },
    { _id: 'd' },
    { _id: 'e', kind: null },
  ];

  it('returns only kitchen-ingredient rows', () => {
    const out = filterKitchenIngredientInventory(rows);
    expect(out.map((r) => r._id).sort()).toEqual(['b', 'c']);
  });

  it('excludes legacy rows (missing kind defaults to sellable on the dashboard)', () => {
    const legacy: Row[] = [{ _id: 'x' }, { _id: 'y', kind: null }];
    expect(filterKitchenIngredientInventory(legacy)).toEqual([]);
  });
});

describe('REQ-034 AC6 — buildStockMovementFromExpense', () => {
  const inventoryId = new Types.ObjectId();
  const performedBy = new Types.ObjectId();

  it('builds a {category:restock, type:addition} payload', () => {
    const mv = buildStockMovementFromExpense({
      expenseId: 'expense-1',
      linkedInventoryId: inventoryId,
      quantity: 5,
      amount: 1000,
      supplier: 'AcmeFoods',
      date: new Date('2026-05-11T10:00:00Z'),
      performedBy,
      performedByName: 'Adaobi',
    });
    expect(mv.type).toBe('addition');
    expect(mv.category).toBe('restock');
    expect(mv.inventoryId).toEqual(inventoryId);
    expect(mv.quantity).toBe(5);
    expect(mv.costPerUnit).toBe(200);
    expect(mv.totalCost).toBe(1000);
    expect(mv.supplier).toBe('AcmeFoods');
    expect(mv.performedBy).toEqual(performedBy);
    expect(mv.performedByName).toBe('Adaobi');
    expect(mv.reason).toContain('expense-1');
  });

  it('defaults missing quantity to 1 and emits costPerUnit = amount', () => {
    const mv = buildStockMovementFromExpense({
      expenseId: 'expense-2',
      linkedInventoryId: inventoryId,
      quantity: undefined as unknown as number,
      amount: 750,
      date: new Date(),
      performedBy,
    });
    expect(mv.quantity).toBe(1);
    expect(mv.costPerUnit).toBe(750);
    expect(mv.totalCost).toBe(750);
  });

  it('coerces string ids to ObjectId', () => {
    const sid = new Types.ObjectId().toString();
    const uid = new Types.ObjectId().toString();
    const mv = buildStockMovementFromExpense({
      expenseId: 'expense-3',
      linkedInventoryId: sid,
      quantity: 2,
      amount: 100,
      date: new Date(),
      performedBy: uid,
    });
    expect(mv.inventoryId).toBeInstanceOf(Types.ObjectId);
    expect(mv.inventoryId.toString()).toBe(sid);
    expect(mv.performedBy).toBeInstanceOf(Types.ObjectId);
    expect(mv.performedBy.toString()).toBe(uid);
  });
});

describe('REQ-034 AC6 — buildCostHistoryRowFromExpense', () => {
  it('writes costPerUnit = amount / quantity and effectiveFrom = expense date', () => {
    const inv = new Types.ObjectId();
    const changedBy = new Types.ObjectId();
    const date = new Date('2026-05-11T08:00:00Z');
    const row = buildCostHistoryRowFromExpense({
      expenseId: 'expense-1',
      linkedInventoryId: inv,
      quantity: 4,
      amount: 800,
      supplier: 'AcmeFoods',
      date,
      performedBy: changedBy,
    });
    expect(row.inventoryItemId).toEqual(inv);
    expect(row.costPerUnit).toBe(200);
    expect(row.supplier).toBe('AcmeFoods');
    expect(row.purchaseDate).toEqual(date);
    expect(row.effectiveFrom).toEqual(date);
    expect(row.changedBy).toEqual(changedBy);
  });

  it('treats missing quantity as 1 → costPerUnit = amount', () => {
    const row = buildCostHistoryRowFromExpense({
      expenseId: 'expense-2',
      linkedInventoryId: new Types.ObjectId(),
      quantity: undefined as unknown as number,
      amount: 500,
      date: new Date(),
      performedBy: new Types.ObjectId(),
    });
    expect(row.costPerUnit).toBe(500);
  });
});

describe('REQ-034 AC6 — computeWeightedAverageCost', () => {
  it('returns 0 for an empty history', () => {
    expect(computeWeightedAverageCost([])).toBe(0);
  });

  it('first link yields cost = costPerUnit of the single row', () => {
    expect(
      computeWeightedAverageCost([{ costPerUnit: 200, quantity: 5 }])
    ).toBe(200);
  });

  it('weighted-average across rows: (200*5 + 300*5) / (5+5) = 250', () => {
    const avg = computeWeightedAverageCost([
      { costPerUnit: 200, quantity: 5 },
      { costPerUnit: 300, quantity: 5 },
    ]);
    expect(avg).toBe(250);
  });

  it('asymmetric: (100*2 + 500*8) / 10 = 420', () => {
    const avg = computeWeightedAverageCost([
      { costPerUnit: 100, quantity: 2 },
      { costPerUnit: 500, quantity: 8 },
    ]);
    expect(avg).toBe(420);
  });

  it('skips rows with non-positive or non-finite quantities', () => {
    const avg = computeWeightedAverageCost([
      { costPerUnit: 200, quantity: 5 },
      { costPerUnit: 999, quantity: 0 },
      { costPerUnit: 999, quantity: -1 },
      { costPerUnit: 999, quantity: Number.NaN },
    ]);
    expect(avg).toBe(200);
  });
});

describe('REQ-034 D10 — convertExpenseQuantityToInventoryUnit', () => {
  it('returns identity when expense unit is missing (legacy passthrough)', () => {
    const out = convertExpenseQuantityToInventoryUnit({
      expenseQuantity: 5,
      expenseUnit: undefined,
      inventoryUnit: 'g',
      registry: D10_REGISTRY,
    });
    expect(out).toEqual({ quantity: 5, converted: false });
  });

  it('returns identity when expense unit equals inventory unit', () => {
    const out = convertExpenseQuantityToInventoryUnit({
      expenseQuantity: 5,
      expenseUnit: 'kg',
      inventoryUnit: 'kg',
      registry: D10_REGISTRY,
    });
    expect(out).toEqual({ quantity: 5, converted: false });
  });

  it('converts kg → g (the D10 bug path): 5 kg = 5000 g, with audit note', () => {
    const out = convertExpenseQuantityToInventoryUnit({
      expenseQuantity: 5,
      expenseUnit: 'kg',
      inventoryUnit: 'g',
      registry: D10_REGISTRY,
    });
    expect(out.quantity).toBe(5000);
    expect(out.converted).toBe(true);
    expect(out.note).toMatch(/5 kg/);
    expect(out.note).toMatch(/5000 g/);
  });

  it('converts g → kg: 5000 g = 5 kg', () => {
    const out = convertExpenseQuantityToInventoryUnit({
      expenseQuantity: 5000,
      expenseUnit: 'g',
      inventoryUnit: 'kg',
      registry: D10_REGISTRY,
    });
    expect(out.quantity).toBe(5);
    expect(out.converted).toBe(true);
  });

  it('converts litres → ml: 2 litres = 2000 ml', () => {
    const out = convertExpenseQuantityToInventoryUnit({
      expenseQuantity: 2,
      expenseUnit: 'litres',
      inventoryUnit: 'ml',
      registry: D10_REGISTRY,
    });
    expect(out.quantity).toBe(2000);
    expect(out.converted).toBe(true);
  });

  it('converts ml → litres: 750 ml = 0.75 litres', () => {
    const out = convertExpenseQuantityToInventoryUnit({
      expenseQuantity: 750,
      expenseUnit: 'ml',
      inventoryUnit: 'litres',
      registry: D10_REGISTRY,
    });
    expect(out.quantity).toBe(0.75);
    expect(out.converted).toBe(true);
  });

  it('throws on cross-dimension (kg → ml): malformed data, surface not silent', () => {
    expect(() =>
      convertExpenseQuantityToInventoryUnit({
        expenseQuantity: 1,
        expenseUnit: 'kg',
        inventoryUnit: 'ml',
        registry: D10_REGISTRY,
      })
    ).toThrow(/cross-dimension/);
  });

  it('throws on count strict-mismatch (eggs → pieces): no fungible conversion', () => {
    expect(() =>
      convertExpenseQuantityToInventoryUnit({
        expenseQuantity: 12,
        expenseUnit: 'eggs',
        inventoryUnit: 'pieces',
        registry: D10_REGISTRY,
      })
    ).toThrow(/count.*no fungible/);
  });

  it('throws on unknown unit id (operator typo / stale data)', () => {
    expect(() =>
      convertExpenseQuantityToInventoryUnit({
        expenseQuantity: 1,
        expenseUnit: 'bushels',
        inventoryUnit: 'kg',
        registry: D10_REGISTRY,
      })
    ).toThrow(/'bushels' not in/);
  });
});

describe('REQ-034 AC7 — validateReversalDoesNotNegate', () => {
  it('passes when currentStock >= reversalQuantity', () => {
    expect(() =>
      validateReversalDoesNotNegate({
        inventoryName: 'Goat Meat',
        currentStock: 10,
        reversalQuantity: 5,
      })
    ).not.toThrow();
    expect(() =>
      validateReversalDoesNotNegate({
        inventoryName: 'Goat Meat',
        currentStock: 5,
        reversalQuantity: 5,
      })
    ).not.toThrow();
  });

  it('throws naming the inventory + the shortfall when blocked', () => {
    expect(() =>
      validateReversalDoesNotNegate({
        inventoryName: 'Goat Meat',
        currentStock: 3,
        reversalQuantity: 5,
      })
    ).toThrow(/Goat Meat/);
    expect(() =>
      validateReversalDoesNotNegate({
        inventoryName: 'Goat Meat',
        currentStock: 3,
        reversalQuantity: 5,
      })
    ).toThrow(/short by 2/);
  });

  it('rejects non-finite or negative reversal quantities (programmer error)', () => {
    expect(() =>
      validateReversalDoesNotNegate({
        inventoryName: 'x',
        currentStock: 0,
        reversalQuantity: -1,
      })
    ).toThrow(/non-negative/);
    expect(() =>
      validateReversalDoesNotNegate({
        inventoryName: 'x',
        currentStock: Number.NaN,
        reversalQuantity: 0,
      })
    ).toThrow(/finite/);
  });
});

// ─── REQ-038 ─────────────────────────────────────────────────────────
//
// `validateExpenseUnitAgainstOverride` is the load-bearing server-side
// guard that prevents a unit mismatch from silently writing to a
// MenuItem whose Purchase unit is locked. The UI lock is defence in
// depth; this helper is the gate.
describe('validateExpenseUnitAgainstOverride (REQ-038)', () => {
  it('no-ops when override is undefined (legacy "Any")', () => {
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'kg',
        override: undefined,
      })
    ).not.toThrow();
  });

  it('no-ops when override is the explicit "any" sentinel', () => {
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'kg',
        override: 'any',
      })
    ).not.toThrow();
  });

  it('no-ops when expenseUnit is undefined (legacy expense)', () => {
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: undefined,
        override: 'bottles',
      })
    ).not.toThrow();
  });

  it('no-ops when expenseUnit matches override', () => {
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'bottles',
        override: 'bottles',
      })
    ).not.toThrow();
  });

  it('throws on mismatch, naming both units and the override', () => {
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'kg',
        override: 'bottles',
        menuItemName: 'Heineken 330ml',
      })
    ).toThrow(/kg/);
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'kg',
        override: 'bottles',
        menuItemName: 'Heineken 330ml',
      })
    ).toThrow(/bottles/);
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'kg',
        override: 'bottles',
        menuItemName: 'Heineken 330ml',
      })
    ).toThrow(/Heineken 330ml/);
  });

  it('is generic over unit id — works for cans too (not bottles-hardcoded)', () => {
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'bottles',
        override: 'cans',
        menuItemName: 'Energy Drink',
      })
    ).toThrow(/cans/);
    expect(() =>
      validateExpenseUnitAgainstOverride({
        expenseUnit: 'cans',
        override: 'cans',
      })
    ).not.toThrow();
  });
});
