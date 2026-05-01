/**
 * @requirement REQ-033 — App-wide Unit-of-Measurement registry
 *
 * Pure helpers for the UoM registry. No DB access, no I/O. Consumers:
 * - SystemSettingsService.getUnitsOfMeasurement (server)
 * - <UnitsOfMeasurementForm /> (client) — runtime CRUD validation
 * - <ExpenseForm />, <MenuItemForm /> — Select source filtering
 * - scripts/backfill-unit-values.ts — legacy free-text normalisation
 *
 * Kept tiny on purpose: the registry typically has <50 entries; O(N)
 * scans are fine and avoid the indexing/staleness footguns of a Map.
 */
import {
  LEGACY_UNIT_ALIASES,
  type UnitOfMeasurement,
  type UoMCategory,
} from '@/interfaces/unit-of-measurement.interface';

/**
 * Active units only. Optionally narrow to a single category for
 * grouped dropdowns.
 */
export function getActiveUnits(
  registry: UnitOfMeasurement[],
  category?: UoMCategory
): UnitOfMeasurement[] {
  return registry.filter(
    (u) => u.isActive && (category === undefined || u.category === category)
  );
}

/**
 * Lookup by id. Returns deactivated units too (legacy records still
 * resolve to a label).
 */
export function findUnitById(
  registry: UnitOfMeasurement[],
  id: string
): UnitOfMeasurement | undefined {
  return registry.find((u) => u.id === id);
}

/**
 * Validate a unit id for use on a NEW record. Active id → ok.
 * Unknown or inactive id → not ok with a clear error string.
 */
export type UnitValidation = { valid: true } | { valid: false; error: string };

export function validateUnit(
  registry: UnitOfMeasurement[],
  id: string
): UnitValidation {
  const found = findUnitById(registry, id);
  if (!found) {
    return { valid: false, error: `Unknown unit: '${id}'` };
  }
  if (!found.isActive) {
    return {
      valid: false,
      error: `Unit '${id}' is inactive — pick an active unit`,
    };
  }
  return { valid: true };
}

/**
 * Display label for a stored unit id. Falls back to the raw id when
 * the registry doesn't know about it (graceful soft-failure for
 * legacy data that pre-dates the registry).
 */
export function formatUnit(
  registry: UnitOfMeasurement[],
  id: string | undefined | null
): string {
  if (!id) return '';
  const found = findUnitById(registry, id);
  return found ? found.label : id;
}

/**
 * Normalise a legacy free-text value to its canonical registry id.
 * Returns the canonical id when:
 *   - the input already matches a default seed id (case-sensitive)
 *   - the input matches a known LEGACY_UNIT_ALIASES key
 * Returns null for genuinely unknown input — the caller reports it
 * to stdout for manual review rather than auto-mapping ambiguously.
 */
export function normaliseLegacyUnit(input: string): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed === '') return null;

  // Already canonical (case-sensitive exact match against alias values).
  // The alias map's *values* are the canonical ids, so any value that
  // appears as a value is itself canonical.
  const canonicals = new Set(Object.values(LEGACY_UNIT_ALIASES));
  if (canonicals.has(trimmed)) return trimmed;

  // Legacy alias lookup.
  if (Object.prototype.hasOwnProperty.call(LEGACY_UNIT_ALIASES, trimmed)) {
    return LEGACY_UNIT_ALIASES[trimmed];
  }

  return null;
}
