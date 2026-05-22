/**
 * Pure-helper coverage for the expense line {qty, unit, total}
 * auto-derivation logic.
 *
 * Ref: #104
 */
import { describe, it, expect } from 'vitest';
import {
  deriveLineField,
  pushEdit,
  roundForField,
  type LineFieldName,
} from '@/lib/expense-line-derivation';

describe('roundForField', () => {
  it('rounds totalCost to 2 decimals (currency)', () => {
    expect(roundForField('totalCost', 54.0)).toBe(54);
    expect(roundForField('totalCost', 54.005)).toBe(54.01);
    expect(roundForField('totalCost', 54.004)).toBe(54);
  });

  it('rounds unitCost to 4 decimals (sub-pound items)', () => {
    expect(roundForField('unitCost', 0.082499)).toBe(0.0825);
    expect(roundForField('unitCost', 4.50001)).toBe(4.5);
  });

  it('rounds quantity to 4 decimals (drift-safe)', () => {
    expect(roundForField('quantity', 11.99999)).toBe(12);
    expect(roundForField('quantity', 0.250001)).toBe(0.25);
  });
});

describe('pushEdit', () => {
  it('moves a field to the front when edited', () => {
    expect(pushEdit(['unitCost', 'quantity'], 'totalCost')).toEqual([
      'totalCost',
      'unitCost',
      'quantity',
    ]);
  });

  it('dedupes when the same field is re-edited', () => {
    expect(pushEdit(['quantity', 'unitCost'], 'quantity')).toEqual([
      'quantity',
      'unitCost',
    ]);
  });

  it('clamps to 3 fields max', () => {
    const four = pushEdit(['unitCost', 'totalCost', 'quantity'], 'unitCost');
    expect(four).toHaveLength(3);
    expect(four[0]).toBe('unitCost');
  });

  it('starts an empty order when nothing was edited yet', () => {
    expect(pushEdit([], 'quantity')).toEqual(['quantity']);
  });
});

describe('deriveLineField — happy paths', () => {
  it('AC1: qty + unitCost edited → totalCost derives to qty × unit', () => {
    const r = deriveLineField({ quantity: 12, unitCost: 4.5, totalCost: 0 }, [
      'unitCost',
      'quantity',
    ]);
    expect(r.field).toBe('totalCost');
    expect(r.value).toBe(54);
  });

  it('AC2: qty + totalCost edited → unitCost derives to total ÷ qty (4dp)', () => {
    const r = deriveLineField({ quantity: 12, unitCost: 0, totalCost: 54 }, [
      'totalCost',
      'quantity',
    ]);
    expect(r.field).toBe('unitCost');
    expect(r.value).toBe(4.5);
  });

  it('AC3: unitCost + totalCost edited → quantity derives to total ÷ unit', () => {
    const r = deriveLineField({ quantity: 0, unitCost: 4.5, totalCost: 54 }, [
      'totalCost',
      'unitCost',
    ]);
    expect(r.field).toBe('quantity');
    expect(r.value).toBe(12);
  });

  it('handles sub-pound unit costs (eg spice mixes at £0.0825/g)', () => {
    const r = deriveLineField(
      { quantity: 0, unitCost: 0.0825, totalCost: 41.25 },
      ['totalCost', 'unitCost']
    );
    expect(r.field).toBe('quantity');
    expect(r.value).toBe(500);
  });
});

describe('deriveLineField — override / ordering rules', () => {
  it('AC4: editing the auto-filled field claims it; next-oldest becomes target', () => {
    // Round 1: user enters qty + unit → total derives.
    let order: LineFieldName[] = pushEdit([], 'quantity');
    order = pushEdit(order, 'unitCost');
    expect(
      deriveLineField({ quantity: 12, unitCost: 4.5, totalCost: 0 }, order)
        .field
    ).toBe('totalCost');

    // Round 2: user manually overrides total → total now claimed; qty is
    // oldest, so it becomes the new derive target.
    order = pushEdit(order, 'totalCost');
    const r = deriveLineField(
      { quantity: 12, unitCost: 4.5, totalCost: 60 },
      order
    );
    expect(r.field).toBe('quantity');
    // 60 / 4.5 = 13.333… rounded to 4dp = 13.3333.
    expect(r.value).toBe(13.3333);
  });

  it('returns no field when only one field has been edited', () => {
    const r = deriveLineField({ quantity: 12, unitCost: 0, totalCost: 0 }, [
      'quantity',
    ]);
    expect(r.field).toBeNull();
    expect(r.value).toBeNull();
  });

  it('returns no field when no fields have been edited (initial blank state)', () => {
    const r = deriveLineField({ quantity: 0, unitCost: 0, totalCost: 0 }, []);
    expect(r.field).toBeNull();
    expect(r.value).toBeNull();
  });

  it('UAT regression: cleared field drops out of order → target stays on the right field', () => {
    // The hook now strips zero-valued fields from editOrder before
    // calling deriveLineField. So a user scenario of: type 2 in qty,
    // touch unitCost and clear it, type 70000 in total → final
    // editOrder is ['totalCost', 'quantity'] (unitCost dropped by the
    // hook's `fieldValue > 0` guard). deriveLineField with these inputs
    // correctly targets unitCost.
    const r = deriveLineField({ quantity: 2, unitCost: 0, totalCost: 70000 }, [
      'totalCost',
      'quantity',
    ]);
    expect(r.field).toBe('unitCost');
    expect(r.value).toBe(35000);
    expect(r.hint).toBeUndefined();
  });
});

describe('deriveLineField — divide-by-zero guards (AC5)', () => {
  it('quantity = 0 with non-zero total → no unitCost derivation, hint shown', () => {
    const r = deriveLineField({ quantity: 0, unitCost: 0, totalCost: 54 }, [
      'totalCost',
      'quantity',
    ]);
    expect(r.field).toBeNull();
    expect(r.value).toBeNull();
    expect(r.hint).toMatch(/quantity above 0/i);
  });

  it('unitCost = 0 with non-zero total → no quantity derivation, hint shown', () => {
    const r = deriveLineField({ quantity: 0, unitCost: 0, totalCost: 54 }, [
      'totalCost',
      'unitCost',
    ]);
    expect(r.field).toBeNull();
    expect(r.value).toBeNull();
    expect(r.hint).toMatch(/unit cost above 0/i);
  });

  it('qty = 0 and unit = 0 deriving total is allowed (total = 0, no divide)', () => {
    const r = deriveLineField({ quantity: 0, unitCost: 0, totalCost: 0 }, [
      'unitCost',
      'quantity',
    ]);
    expect(r.field).toBe('totalCost');
    expect(r.value).toBe(0);
  });
});
