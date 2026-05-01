/**
 * @requirement REQ-033 — App-wide Unit-of-Measurement registry
 *
 * Replaces the free-text `unit` strings on Expense, Inventory, and the
 * hardcoded SelectItem list on MenuItem forms. Stored in
 * SystemSettingsModel under the key `'units-of-measurement'`.
 *
 * No conversion factors in v1 — strict-match-only when REQ-034 lands
 * (recipe ingredient unit MUST equal inventory unit by `id`).
 */

export const UOM_CATEGORIES = [
  'mass',
  'volume',
  'count',
  'time',
  'other',
] as const;

export type UoMCategory = (typeof UOM_CATEGORIES)[number];

export interface UnitOfMeasurement {
  /**
   * Stable slug used as the persisted value on Expense.unit, Inventory.unit,
   * Recipe ingredient unitId, etc. Lowercase, no spaces.
   * Example: 'kg', 'litres', 'portions'
   */
  id: string;

  /**
   * Human-readable label shown in dropdowns and lists.
   * Example: 'Kilograms (kg)'
   */
  label: string;

  /**
   * Loose dimensional grouping. Drives dropdown grouping in the UI; not
   * used for conversion in v1 (strict-match-only).
   */
  category: UoMCategory;

  /**
   * Soft-delete flag. Deactivated units stay resolvable (legacy records
   * still display) but cannot be selected for new records.
   */
  isActive: boolean;
}

/**
 * Default seed data — installed on first read of the registry. Mirrors
 * the 6 hardcoded SelectItem values previously in
 * `components/features/admin/menu-item-form.tsx` plus 3 kitchen-relevant
 * additions (g, ml, each). Renames `liters` → `litres` for spelling
 * consistency.
 */
export const DEFAULT_UNITS_OF_MEASUREMENT: UnitOfMeasurement[] = [
  { id: 'portions', label: 'Portions', category: 'count', isActive: true },
  { id: 'pieces', label: 'Pieces', category: 'count', isActive: true },
  { id: 'each', label: 'Each', category: 'count', isActive: true },
  { id: 'units', label: 'Units', category: 'count', isActive: true },
  { id: 'bottles', label: 'Bottles', category: 'count', isActive: true },
  { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
  { id: 'g', label: 'Grams (g)', category: 'mass', isActive: true },
  { id: 'litres', label: 'Litres (L)', category: 'volume', isActive: true },
  { id: 'ml', label: 'Millilitres (ml)', category: 'volume', isActive: true },
];

/**
 * Common free-text variants seen in legacy data, mapped to canonical
 * registry IDs. Used by `scripts/backfill-unit-values.ts` to normalise
 * existing rows. Anything not in this map is reported to stdout for
 * manual review rather than auto-mapped.
 */
export const LEGACY_UNIT_ALIASES: Record<string, string> = {
  // Case variants
  Kg: 'kg',
  KG: 'kg',
  G: 'g',
  // Spelling variants
  liters: 'litres',
  Liters: 'litres',
  Liter: 'litres',
  liter: 'litres',
  L: 'litres',
  ML: 'ml',
  // Plural / abbrev variants
  pcs: 'pieces',
  pc: 'pieces',
  Portions: 'portions',
  Portion: 'portions',
  portion: 'portions',
  Bottles: 'bottles',
  Bottle: 'bottles',
  bottle: 'bottles',
  Pieces: 'pieces',
  Piece: 'pieces',
  piece: 'pieces',
  Units: 'units',
  Unit: 'units',
  unit: 'units',
  Each: 'each',
  EACH: 'each',
};
