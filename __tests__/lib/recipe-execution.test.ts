/**
 * @requirement REQ-034 — AC9, AC10, AC12, AC13
 *
 * Pure-helper coverage for production execution. The ProductionService
 * composes these around the actual Mongo writes.
 */
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import {
  convertToInventoryUnit,
  MASS_TO_GRAMS,
  VOLUME_TO_ML,
} from '@/lib/dimension-conversion';
import {
  computeIngredientsForBatches,
  validateProductionPreFlight,
  computeYieldVariance,
  elapsedMinutesSince,
  validateVoidReason,
  VOID_WINDOW_MINUTES,
  type InventoryUnitInfo,
} from '@/lib/recipe-execution';
import { DEFAULT_UNITS_OF_MEASUREMENT } from '@/interfaces/unit-of-measurement.interface';

const reg = DEFAULT_UNITS_OF_MEASUREMENT;

describe('REQ-034 AC9 — convertToInventoryUnit', () => {
  it('converts kg → g (1 kg = 1000 g)', () => {
    expect(
      convertToInventoryUnit({
        value: 1,
        fromUnitId: 'kg',
        toUnitId: 'g',
        registry: reg,
      })
    ).toBe(1000);
  });

  it('converts g → kg (500 g = 0.5 kg)', () => {
    expect(
      convertToInventoryUnit({
        value: 500,
        fromUnitId: 'g',
        toUnitId: 'kg',
        registry: reg,
      })
    ).toBe(0.5);
  });

  it('converts litres → ml (1 L = 1000 ml)', () => {
    expect(
      convertToInventoryUnit({
        value: 1,
        fromUnitId: 'litres',
        toUnitId: 'ml',
        registry: reg,
      })
    ).toBe(1000);
  });

  it('converts ml → litres', () => {
    expect(
      convertToInventoryUnit({
        value: 250,
        fromUnitId: 'ml',
        toUnitId: 'litres',
        registry: reg,
      })
    ).toBe(0.25);
  });

  it('rejects cross-dimension (kg → ml)', () => {
    expect(() =>
      convertToInventoryUnit({
        value: 1,
        fromUnitId: 'kg',
        toUnitId: 'ml',
        registry: reg,
      })
    ).toThrow(/cross-dimension/);
  });

  it('rejects cross-dimension (count → mass)', () => {
    expect(() =>
      convertToInventoryUnit({
        value: 1,
        fromUnitId: 'eggs',
        toUnitId: 'g',
        registry: reg,
      })
    ).toThrow(/cross-dimension/);
  });

  it('strict id-match for count: bottles vs crates rejected', () => {
    expect(() =>
      convertToInventoryUnit({
        value: 1,
        fromUnitId: 'bottles',
        toUnitId: 'crates',
        registry: reg,
      })
    ).toThrow(/no fungible conversion/);
  });

  it('strict id-match for count: eggs vs eggs accepted, no conversion', () => {
    expect(
      convertToInventoryUnit({
        value: 6,
        fromUnitId: 'eggs',
        toUnitId: 'eggs',
        registry: reg,
      })
    ).toBe(6);
  });

  it('exposes the canonical-base factor tables for inspection', () => {
    expect(MASS_TO_GRAMS).toEqual({ g: 1, kg: 1000 });
    expect(VOLUME_TO_ML).toEqual({ ml: 1, litres: 1000 });
  });
});

describe('REQ-034 AC9/AC10 — computeIngredientsForBatches', () => {
  function makeMap(rows: InventoryUnitInfo[]): Map<string, InventoryUnitInfo> {
    return new Map(rows.map((r) => [r.inventoryId, r]));
  }

  it('multiplies recipe quantities by batchCount', () => {
    const goatId = new Types.ObjectId();
    const result = computeIngredientsForBatches({
      ingredients: [{ inventoryId: goatId, quantity: 200, unitId: 'g' }],
      batchCount: 3,
      inventoryUnitById: makeMap([
        {
          inventoryId: goatId.toString(),
          unitId: 'g',
          name: 'Goat',
          currentStock: 5000,
        },
      ]),
      registry: reg,
    });
    expect(result).toHaveLength(1);
    expect(result[0].quantityInInventoryUnit).toBe(600);
  });

  it('converts each ingredient to inventory unit before returning', () => {
    const goatId = new Types.ObjectId();
    // recipe in g, inventory in kg
    const result = computeIngredientsForBatches({
      ingredients: [{ inventoryId: goatId, quantity: 200, unitId: 'g' }],
      batchCount: 2,
      inventoryUnitById: makeMap([
        {
          inventoryId: goatId.toString(),
          unitId: 'kg',
          name: 'Goat',
          currentStock: 5,
        },
      ]),
      registry: reg,
    });
    // 200 g × 2 = 400 g = 0.4 kg
    expect(result[0].quantityInInventoryUnit).toBe(0.4);
    expect(result[0].inventoryUnitId).toBe('kg');
  });

  it('throws when batchCount is not positive', () => {
    expect(() =>
      computeIngredientsForBatches({
        ingredients: [],
        batchCount: 0,
        inventoryUnitById: new Map(),
        registry: reg,
      })
    ).toThrow(/batchCount/);
  });
});

describe('REQ-034 AC10 — validateProductionPreFlight', () => {
  function makeMap(rows: InventoryUnitInfo[]): Map<string, InventoryUnitInfo> {
    return new Map(rows.map((r) => [r.inventoryId, r]));
  }

  it('passes when every ingredient has currentStock ≥ required', () => {
    const goatId = new Types.ObjectId().toString();
    const result = validateProductionPreFlight({
      deductions: [
        {
          inventoryId: goatId,
          quantityInInventoryUnit: 400,
          inventoryUnitId: 'g',
          name: 'Goat',
        },
      ],
      inventoryUnitById: makeMap([
        { inventoryId: goatId, unitId: 'g', name: 'Goat', currentStock: 1000 },
      ]),
    });
    expect(result.ok).toBe(true);
    expect(result.shortages).toEqual([]);
  });

  it('fails with shortages list when any ingredient short', () => {
    const goatId = new Types.ObjectId().toString();
    const oilId = new Types.ObjectId().toString();
    const result = validateProductionPreFlight({
      deductions: [
        {
          inventoryId: goatId,
          quantityInInventoryUnit: 400,
          inventoryUnitId: 'g',
          name: 'Goat',
        },
        {
          inventoryId: oilId,
          quantityInInventoryUnit: 200,
          inventoryUnitId: 'ml',
          name: 'Palm Oil',
        },
      ],
      inventoryUnitById: makeMap([
        { inventoryId: goatId, unitId: 'g', name: 'Goat', currentStock: 1000 },
        {
          inventoryId: oilId,
          unitId: 'ml',
          name: 'Palm Oil',
          currentStock: 50,
        },
      ]),
    });
    expect(result.ok).toBe(false);
    expect(result.shortages).toHaveLength(1);
    expect(result.shortages[0]).toMatchObject({
      inventoryId: oilId,
      name: 'Palm Oil',
      required: 200,
      available: 50,
    });
  });

  it('treats missing inventory as available=0 (deleted mid-flight)', () => {
    const ghost = new Types.ObjectId().toString();
    const result = validateProductionPreFlight({
      deductions: [
        {
          inventoryId: ghost,
          quantityInInventoryUnit: 1,
          inventoryUnitId: 'g',
          name: 'Ghost',
        },
      ],
      inventoryUnitById: new Map(),
    });
    expect(result.ok).toBe(false);
    expect(result.shortages[0].available).toBe(0);
  });
});

describe('REQ-034 AC12 — computeYieldVariance', () => {
  it('returns actual - expected', () => {
    expect(computeYieldVariance({ actual: 8, expected: 8 })).toBe(0);
  });

  it('positive when actual > expected (over-yield)', () => {
    expect(computeYieldVariance({ actual: 9, expected: 8 })).toBe(1);
  });

  it('negative when actual < expected (waste)', () => {
    expect(computeYieldVariance({ actual: 7, expected: 8 })).toBe(-1);
  });

  it('zero when actual == expected', () => {
    expect(computeYieldVariance({ actual: 8, expected: 8 })).toBe(0);
  });

  it('throws on non-finite values', () => {
    expect(() =>
      computeYieldVariance({ actual: Number.NaN, expected: 8 })
    ).toThrow(/finite/);
  });
});

describe('REQ-034 AC13 — void-window helpers', () => {
  it('elapsedMinutesSince returns the diff in minutes', () => {
    const start = new Date('2026-05-11T10:00:00Z');
    const later = new Date('2026-05-11T10:30:00Z');
    expect(elapsedMinutesSince(start, later)).toBe(30);
  });

  it('VOID_WINDOW_MINUTES is 24h', () => {
    expect(VOID_WINDOW_MINUTES).toBe(24 * 60);
  });

  it('validateVoidReason: within 24h, reasonNote is optional (undefined OK)', () => {
    const producedAt = new Date('2026-05-11T10:00:00Z');
    const now = new Date('2026-05-11T20:00:00Z'); // 10h later
    expect(
      validateVoidReason({ producedAt, now, reasonNote: undefined })
    ).toBeUndefined();
  });

  it('validateVoidReason: past 24h, reasonNote required', () => {
    const producedAt = new Date('2026-05-10T10:00:00Z');
    const now = new Date('2026-05-11T11:00:00Z'); // 25h later
    expect(() =>
      validateVoidReason({ producedAt, now, reasonNote: '' })
    ).toThrow(/reasonNote/);
    expect(() =>
      validateVoidReason({ producedAt, now, reasonNote: undefined })
    ).toThrow(/reasonNote/);
  });

  it('validateVoidReason: past 24h with reason returns the trimmed reason', () => {
    const producedAt = new Date('2026-05-10T10:00:00Z');
    const now = new Date('2026-05-11T11:00:00Z');
    expect(
      validateVoidReason({
        producedAt,
        now,
        reasonNote: '  spoilt batch  ',
      })
    ).toBe('spoilt batch');
  });
});
