/**
 * @requirement REQ-034 — AC9, AC12
 * Pure helpers in lib/recipe-execution.ts:
 *   - computeIngredientsForBatches(recipe, batchCount): ingredient[] in inventory unit
 *   - validateProductionPreFlight(ingredients, inventoryMap): { ok, shortages[] }
 *   - computeYieldVariance(actual, expected): number
 *   - convertToInventoryUnit(value, fromUnitId, toUnitId, registry): number | error
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 — recipe-execution helpers', () => {
  describe('AC9 — convertToInventoryUnit (same-dimension)', () => {
    it('converts kg → g (1 kg = 1000 g)', () => {});
    it('converts g → kg (500 g = 0.5 kg)', () => {});
    it('converts litres → ml (1 L = 1000 ml)', () => {});
    it('converts ml → litres', () => {});
    it('rejects cross-dimension (kg → ml)', () => {});
    it('rejects cross-dimension (count → mass)', () => {});
    it('strict id-match for count: bottles vs crates rejected', () => {});
    it('strict id-match for count: eggs vs eggs accepted, no conversion', () => {});
  });

  describe('computeIngredientsForBatches', () => {
    it('multiplies recipe quantities by batchCount', () => {});
    it('converts each ingredient to inventory unit before returning', () => {});
  });

  describe('validateProductionPreFlight', () => {
    it('passes when every ingredient has currentStock ≥ required', () => {});
    it('fails with shortages list when any ingredient short', () => {});
  });

  describe('AC12 — computeYieldVariance', () => {
    it('returns actual - expected', () => {});
    it('positive when actual > expected (over-yield)', () => {});
    it('negative when actual < expected (waste)', () => {});
    it('zero when actual == expected', () => {});
  });
});
