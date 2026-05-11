/**
 * REQ-034 AC9 — Mass + volume conversion factor table.
 *
 * Refined Resolution #1 from the implementation plan: only mass (kg/g)
 * and volume (litres/ml) have well-defined fungible conversion factors
 * in v1. Categories `count`, `other`, `time` require strict id-equality
 * — `convertToInventoryUnit` throws if the caller asks to convert
 * between two different ids in those categories (e.g. eggs ↔ cartons).
 *
 * The factor maps express each unit as a multiplier into a single
 * canonical base (grams for mass, millilitres for volume); converting
 * between two units in the same dimension is `value * from / to`.
 */
import type {
  UnitOfMeasurement,
  UoMCategory,
} from '@/interfaces/unit-of-measurement.interface';

/** Multipliers into grams. */
export const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
};

/** Multipliers into millilitres. */
export const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  litres: 1000,
};

/**
 * Returns the canonical-base factor for a given unit id (1 for the base
 * unit; e.g. `kg → 1000` because 1 kg = 1000 g). Returns `undefined`
 * when the unit id is not a known mass or volume id; callers fall back
 * to strict-equality handling.
 */
export function getConversionFactor(
  unitId: string,
  category: UoMCategory
): number | undefined {
  if (category === 'mass') return MASS_TO_GRAMS[unitId];
  if (category === 'volume') return VOLUME_TO_ML[unitId];
  return undefined;
}

/**
 * Convert `value` from `fromUnitId` to `toUnitId` using the REQ-033
 * registry to look up dimensions. Throws if:
 *   - either id is missing from the registry
 *   - the two ids belong to different categories
 *   - the category is in {count, other, time} AND ids differ (strict
 *     id-equality required — no fungible conversion in v1)
 *   - the category is mass or volume but the registry id has no factor
 *     in the conversion table (means someone added a new mass unit
 *     without updating MASS_TO_GRAMS — surface so the gap is obvious)
 *
 * When `fromUnitId === toUnitId` returns `value` unchanged (works for
 * every category including count / other / time).
 */
export function convertToInventoryUnit(input: {
  value: number;
  fromUnitId: string;
  toUnitId: string;
  registry: ReadonlyArray<UnitOfMeasurement>;
}): number {
  const { value, fromUnitId, toUnitId, registry } = input;

  if (!Number.isFinite(value)) {
    throw new Error(
      `convertToInventoryUnit: value must be a finite number (got ${value})`
    );
  }

  if (fromUnitId === toUnitId) return value;

  const from = registry.find((u) => u.id === fromUnitId);
  const to = registry.find((u) => u.id === toUnitId);
  if (!from) {
    throw new Error(
      `convertToInventoryUnit: unit '${fromUnitId}' not in the REQ-033 registry`
    );
  }
  if (!to) {
    throw new Error(
      `convertToInventoryUnit: unit '${toUnitId}' not in the REQ-033 registry`
    );
  }
  if (from.category !== to.category) {
    throw new Error(
      `convertToInventoryUnit: cannot convert '${fromUnitId}' ` +
        `(${from.category}) to '${toUnitId}' (${to.category}) — ` +
        `cross-dimension conversion is not supported`
    );
  }

  if (from.category !== 'mass' && from.category !== 'volume') {
    throw new Error(
      `convertToInventoryUnit: ${from.category} units have no fungible ` +
        `conversion — '${fromUnitId}' and '${toUnitId}' must match exactly`
    );
  }

  const fromFactor = getConversionFactor(fromUnitId, from.category);
  const toFactor = getConversionFactor(toUnitId, to.category);
  if (fromFactor === undefined) {
    throw new Error(
      `convertToInventoryUnit: no conversion factor configured for ` +
        `'${fromUnitId}' (${from.category}) — extend MASS_TO_GRAMS / ` +
        `VOLUME_TO_ML in lib/dimension-conversion.ts`
    );
  }
  if (toFactor === undefined) {
    throw new Error(
      `convertToInventoryUnit: no conversion factor configured for ` +
        `'${toUnitId}' (${to.category}) — extend MASS_TO_GRAMS / ` +
        `VOLUME_TO_ML in lib/dimension-conversion.ts`
    );
  }

  return (value * fromFactor) / toFactor;
}
