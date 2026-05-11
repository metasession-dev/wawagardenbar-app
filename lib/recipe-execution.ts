/**
 * REQ-034 AC9/AC10/AC12 — Pure helpers for production execution.
 *
 * The ProductionService composes these around the actual Mongo writes:
 *   - `computeIngredientsForBatches` expands a recipe's per-batch
 *     deductions to the total required for N batches, converting each
 *     ingredient's quantity into the linked inventory's unit.
 *   - `validateProductionPreFlight` returns the per-ingredient shortage
 *     list AC10 surfaces to the user when stock isn't there to start.
 *   - `computeYieldVariance` is the AC12 actual-vs-expected calc.
 */
import { convertToInventoryUnit } from '@/lib/dimension-conversion';
import type { UnitOfMeasurement } from '@/interfaces/unit-of-measurement.interface';
import type { IRecipeIngredient } from '@/interfaces/recipe.interface';

export interface InventoryUnitInfo {
  inventoryId: string;
  unitId: string;
  name?: string;
  currentStock: number;
}

export interface BatchIngredientDeduction {
  inventoryId: string;
  /** Quantity expressed in the inventory's unit (post-conversion). */
  quantityInInventoryUnit: number;
  inventoryUnitId: string;
  name?: string;
}

/**
 * Expand a recipe's per-batch deductions to the totals required for
 * `batchCount` batches and convert each into the linked inventory's
 * unit. Throws on unit conversion failures (cross-dimension etc.) —
 * callers should have run the recipe-save validation first, but a
 * second check at execution time guards against drift if the registry
 * changes between save and execute.
 */
export function computeIngredientsForBatches(input: {
  ingredients: ReadonlyArray<IRecipeIngredient>;
  batchCount: number;
  inventoryUnitById: ReadonlyMap<string, InventoryUnitInfo>;
  registry: ReadonlyArray<UnitOfMeasurement>;
}): BatchIngredientDeduction[] {
  const { ingredients, batchCount, inventoryUnitById, registry } = input;
  if (!Number.isFinite(batchCount) || batchCount <= 0) {
    throw new Error(
      `computeIngredientsForBatches: batchCount must be > 0 (got ${batchCount})`
    );
  }

  return ingredients.map((ing) => {
    const inventoryKey = String(ing.inventoryId);
    const inv = inventoryUnitById.get(inventoryKey);
    if (!inv) {
      throw new Error(
        `computeIngredientsForBatches: inventory ${inventoryKey} not in lookup`
      );
    }
    const totalInRecipeUnit = ing.quantity * batchCount;
    const totalInInventoryUnit = convertToInventoryUnit({
      value: totalInRecipeUnit,
      fromUnitId: ing.unitId,
      toUnitId: inv.unitId,
      registry,
    });
    return {
      inventoryId: inventoryKey,
      quantityInInventoryUnit: totalInInventoryUnit,
      inventoryUnitId: inv.unitId,
      name: inv.name,
    };
  });
}

export interface PreFlightShortage {
  inventoryId: string;
  name?: string;
  required: number;
  available: number;
  inventoryUnitId: string;
}

export interface PreFlightResult {
  ok: boolean;
  shortages: PreFlightShortage[];
}

/**
 * AC10 — given the batch deductions (already in inventory units) and the
 * current inventory snapshot, return the list of ingredients whose
 * required > available. `ok === shortages.length === 0`.
 */
export function validateProductionPreFlight(input: {
  deductions: ReadonlyArray<BatchIngredientDeduction>;
  inventoryUnitById: ReadonlyMap<string, InventoryUnitInfo>;
}): PreFlightResult {
  const shortages: PreFlightShortage[] = [];
  for (const d of input.deductions) {
    const inv = input.inventoryUnitById.get(d.inventoryId);
    const available = inv?.currentStock ?? 0;
    if (available < d.quantityInInventoryUnit) {
      shortages.push({
        inventoryId: d.inventoryId,
        name: d.name ?? inv?.name,
        required: d.quantityInInventoryUnit,
        available,
        inventoryUnitId: d.inventoryUnitId,
      });
    }
  }
  return { ok: shortages.length === 0, shortages };
}

/**
 * AC12 — actual minus expected yield. Negative = waste, positive =
 * over-yield. The caller decides what to do with the variance
 * (display-only in v1 — no automatic adjustment).
 */
export function computeYieldVariance(input: {
  actual: number;
  expected: number;
}): number {
  if (!Number.isFinite(input.actual) || !Number.isFinite(input.expected)) {
    throw new Error('computeYieldVariance: actual and expected must be finite');
  }
  return input.actual - input.expected;
}

/**
 * Helper used by void flow: returns the elapsed minutes since
 * `producedAt` against `now`. Lifted into the pure layer so the 24h
 * void window can be tested without mocking `Date.now()`.
 */
export function elapsedMinutesSince(producedAt: Date, now: Date): number {
  const diffMs = now.getTime() - producedAt.getTime();
  return diffMs / 60000;
}

export const VOID_WINDOW_MINUTES = 24 * 60;

/**
 * AC13 — within the 24h void window the reasonNote is optional;
 * past it, the caller must provide a non-empty reasonNote (after
 * trimming). Returns the canonical reason string (trimmed) on success,
 * or throws with a descriptive message naming the gap.
 */
export function validateVoidReason(input: {
  producedAt: Date;
  now: Date;
  reasonNote?: string;
}): string | undefined {
  const trimmed = input.reasonNote?.trim();
  const minutesElapsed = elapsedMinutesSince(input.producedAt, input.now);
  if (minutesElapsed > VOID_WINDOW_MINUTES) {
    if (!trimmed) {
      throw new Error(
        `Production was completed ${Math.round(minutesElapsed / 60)} hours ago — ` +
          `voids past the 24-hour window require a reasonNote`
      );
    }
    return trimmed;
  }
  return trimmed; // may be undefined within the window
}
