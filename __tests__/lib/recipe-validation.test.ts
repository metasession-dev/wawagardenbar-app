/**
 * @requirement REQ-034 — AC8 / AC9 pure-helper coverage.
 */
import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import {
  STRICT_MATCH_UOM_CATEGORIES,
  validateYieldPortions,
  validateNoDuplicateIngredients,
  validateIngredientQuantities,
  validateIngredientUnitMatchesInventory,
} from '@/lib/recipe-validation';
import { DEFAULT_UNITS_OF_MEASUREMENT } from '@/interfaces/unit-of-measurement.interface';

describe('REQ-034 AC8 — STRICT_MATCH_UOM_CATEGORIES', () => {
  it('locks count / other / time to strict id-equality', () => {
    expect([...STRICT_MATCH_UOM_CATEGORIES].sort()).toEqual([
      'count',
      'other',
      'time',
    ]);
  });
});

describe('REQ-034 AC8 — validateYieldPortions', () => {
  it('accepts a positive yield', () => {
    expect(() => validateYieldPortions(4)).not.toThrow();
  });

  it('rejects 0, negative, or non-finite yield', () => {
    expect(() => validateYieldPortions(0)).toThrow(/positive/);
    expect(() => validateYieldPortions(-2)).toThrow(/positive/);
    expect(() => validateYieldPortions(Number.NaN)).toThrow(/positive/);
    expect(() => validateYieldPortions(Number.POSITIVE_INFINITY)).toThrow(
      /positive/
    );
  });
});

describe('REQ-034 AC8 — validateNoDuplicateIngredients', () => {
  it('accepts distinct inventory ids', () => {
    const a = new Types.ObjectId().toString();
    const b = new Types.ObjectId().toString();
    expect(() =>
      validateNoDuplicateIngredients([
        { inventoryId: a, quantity: 1, unitId: 'g' },
        { inventoryId: b, quantity: 1, unitId: 'g' },
      ])
    ).not.toThrow();
  });

  it('rejects two lines with the same inventory id', () => {
    const a = new Types.ObjectId().toString();
    expect(() =>
      validateNoDuplicateIngredients([
        { inventoryId: a, quantity: 1, unitId: 'g' },
        { inventoryId: a, quantity: 2, unitId: 'g' },
      ])
    ).toThrow(/Duplicate ingredient/);
  });
});

describe('REQ-034 AC8 — validateIngredientQuantities', () => {
  it('accepts positive quantities', () => {
    expect(() =>
      validateIngredientQuantities([
        { inventoryId: 'a', quantity: 100, unitId: 'g' },
      ])
    ).not.toThrow();
  });

  it('rejects zero / negative / non-finite quantities', () => {
    expect(() =>
      validateIngredientQuantities([
        { inventoryId: 'a', quantity: 0, unitId: 'g' },
      ])
    ).toThrow(/positive/);
    expect(() =>
      validateIngredientQuantities([
        { inventoryId: 'a', quantity: -1, unitId: 'g' },
      ])
    ).toThrow(/positive/);
  });
});

describe('REQ-034 AC9 — validateIngredientUnitMatchesInventory', () => {
  const reg = DEFAULT_UNITS_OF_MEASUREMENT;

  it('accepts same-category (mass: kg vs g)', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'kg',
        ingredientUnitId: 'g',
        unitRegistry: reg,
        inventoryDescription: 'goat meat',
      })
    ).not.toThrow();
  });

  it('accepts same-category (volume: litres vs ml)', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'litres',
        ingredientUnitId: 'ml',
        unitRegistry: reg,
        inventoryDescription: 'palm oil',
      })
    ).not.toThrow();
  });

  it('rejects cross-dimension (mass vs volume)', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'ml',
        ingredientUnitId: 'kg',
        unitRegistry: reg,
        inventoryDescription: 'palm oil',
      })
    ).toThrow(/cross-dimension/);
  });

  it('rejects mismatched count unit (eggs vs cartons) under strict-match', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'cartons',
        ingredientUnitId: 'eggs',
        unitRegistry: reg,
        inventoryDescription: 'eggs/cartons',
      })
    ).toThrow(/must match exactly|no fungible conversion/);
  });

  it('accepts strict-match count (eggs vs eggs)', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'eggs',
        ingredientUnitId: 'eggs',
        unitRegistry: reg,
        inventoryDescription: 'eggs',
      })
    ).not.toThrow();
  });

  it('rejects an unknown registry id (recipe side)', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'g',
        ingredientUnitId: 'not-a-real-unit',
        unitRegistry: reg,
        inventoryDescription: 'salt',
      })
    ).toThrow(/not in the REQ-033 registry/);
  });

  it('rejects an unknown registry id (inventory side)', () => {
    expect(() =>
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: 'not-a-real-unit',
        ingredientUnitId: 'g',
        unitRegistry: reg,
        inventoryDescription: 'salt',
      })
    ).toThrow(/not in the REQ-033 registry/);
  });
});
