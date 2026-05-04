/**
 * @requirement REQ-033 — App-wide Unit-of-Measurement registry
 *
 * Pure-helper tests. The registry shape and aliases live in
 * `interfaces/unit-of-measurement.interface.ts`; the helpers under test
 * here perform lookups, filtering, validation, and the legacy-string
 * normalisation used by both runtime forms and the backfill script.
 */
import { describe, it, expect } from 'vitest';
import {
  getActiveUnits,
  findUnitById,
  validateUnit,
  formatUnit,
  normaliseLegacyUnit,
} from '@/lib/units';
import type { UnitOfMeasurement } from '@/interfaces/unit-of-measurement.interface';

const fixture: UnitOfMeasurement[] = [
  { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
  { id: 'g', label: 'Grams (g)', category: 'mass', isActive: true },
  { id: 'litres', label: 'Litres (L)', category: 'volume', isActive: true },
  {
    id: 'tablespoons',
    label: 'Tablespoons',
    category: 'volume',
    isActive: false,
  },
  { id: 'portions', label: 'Portions', category: 'count', isActive: true },
];

describe('REQ-033: getActiveUnits', () => {
  it('returns only active units by default', () => {
    const result = getActiveUnits(fixture);
    expect(result).toHaveLength(4);
    expect(result.find((u) => u.id === 'tablespoons')).toBeUndefined();
  });

  it('filters by category when supplied', () => {
    const massOnly = getActiveUnits(fixture, 'mass');
    expect(massOnly.map((u) => u.id).sort()).toEqual(['g', 'kg']);
  });

  it('returns an empty array when no units in the requested category are active', () => {
    const noTime = getActiveUnits(fixture, 'time');
    expect(noTime).toEqual([]);
  });
});

describe('REQ-033: findUnitById', () => {
  it('returns the unit when present (active or not)', () => {
    expect(findUnitById(fixture, 'kg')?.label).toBe('Kilograms (kg)');
    expect(findUnitById(fixture, 'tablespoons')?.label).toBe('Tablespoons');
  });

  it('returns undefined for an unknown id', () => {
    expect(findUnitById(fixture, 'fortnights')).toBeUndefined();
  });
});

describe('REQ-033: validateUnit', () => {
  it('accepts an active unit id', () => {
    expect(validateUnit(fixture, 'kg').valid).toBe(true);
  });

  it('rejects an unknown id with a clear error', () => {
    const result = validateUnit(fixture, 'fortnights');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/unknown|not found|invalid/i);
    }
  });

  it('rejects a soft-deleted unit when used for a new record', () => {
    const result = validateUnit(fixture, 'tablespoons');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toMatch(/inactive|deactivated|disabled/i);
    }
  });
});

describe('REQ-033: formatUnit', () => {
  it('returns the registry label for a known id', () => {
    expect(formatUnit(fixture, 'kg')).toBe('Kilograms (kg)');
  });

  it('falls back to the raw id for an unknown unit (graceful soft-failure)', () => {
    expect(formatUnit(fixture, 'rod')).toBe('rod');
  });

  it('returns the label even for a soft-deleted unit so legacy records keep displaying', () => {
    expect(formatUnit(fixture, 'tablespoons')).toBe('Tablespoons');
  });
});

describe('REQ-033: normaliseLegacyUnit', () => {
  it('returns the canonical id when already canonical', () => {
    expect(normaliseLegacyUnit('kg')).toBe('kg');
  });

  it('maps known case variants', () => {
    expect(normaliseLegacyUnit('Kg')).toBe('kg');
    expect(normaliseLegacyUnit('KG')).toBe('kg');
  });

  it('maps known spelling variants (liters → litres)', () => {
    expect(normaliseLegacyUnit('liters')).toBe('litres');
    expect(normaliseLegacyUnit('Liters')).toBe('litres');
  });

  it('returns null for unrecognised free-text — caller reports for manual review', () => {
    expect(normaliseLegacyUnit('handfuls')).toBe(null);
    expect(normaliseLegacyUnit('')).toBe(null);
  });

  it('handles whitespace by trimming before lookup', () => {
    expect(normaliseLegacyUnit('  kg  ')).toBe('kg');
  });
});
