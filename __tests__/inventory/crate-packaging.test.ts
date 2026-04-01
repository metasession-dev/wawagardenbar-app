/**
 * @requirement REQ-021 - Crate packaging calculations
 */
import { describe, it, expect } from 'vitest';

// ─── Pure functions extracted from service logic ───

function calculateCratesToOrder(
  suggestedReorderQty: number,
  crateSize: number | null
): number | null {
  if (!crateSize || crateSize <= 0 || suggestedReorderQty <= 0) {
    return null;
  }
  return Math.ceil(suggestedReorderQty / crateSize);
}

function formatCrateBreakdown(
  _suggestedReorderQty: number,
  cratesToOrder: number | null,
  crateSize: number | null,
  packagingType: string | null
): string | null {
  if (!cratesToOrder || !crateSize) return null;
  const label = packagingType || 'crate';
  const plural = cratesToOrder !== 1 ? `${label}s` : label;
  const totalUnits = cratesToOrder * crateSize;
  return `${cratesToOrder} ${plural} (${totalUnits})`;
}

// ─── Tests ───

describe('REQ-021: Crate Calculation', () => {
  it('rounds up to nearest whole crate', () => {
    expect(calculateCratesToOrder(58, 24)).toBe(3); // 58/24 = 2.42 → 3
  });

  it('returns exact crate count when evenly divisible', () => {
    expect(calculateCratesToOrder(48, 24)).toBe(2); // 48/24 = 2
  });

  it('returns 1 crate for small quantities', () => {
    expect(calculateCratesToOrder(1, 24)).toBe(1);
  });

  it('returns null when crateSize is null', () => {
    expect(calculateCratesToOrder(58, null)).toBeNull();
  });

  it('returns null when crateSize is 0', () => {
    expect(calculateCratesToOrder(58, 0)).toBeNull();
  });

  it('returns null when suggestedReorderQty is 0', () => {
    expect(calculateCratesToOrder(0, 24)).toBeNull();
  });

  it('handles large quantities', () => {
    expect(calculateCratesToOrder(500, 24)).toBe(21); // 500/24 = 20.83 → 21
  });

  it('handles crate size of 1 (individual items)', () => {
    expect(calculateCratesToOrder(10, 1)).toBe(10);
  });

  it('handles various crate sizes', () => {
    expect(calculateCratesToOrder(30, 12)).toBe(3); // 30/12 = 2.5 → 3
    expect(calculateCratesToOrder(30, 6)).toBe(5); // exact
    expect(calculateCratesToOrder(7, 10)).toBe(1); // 7/10 = 0.7 → 1
  });
});

describe('REQ-021: Crate Breakdown Formatting', () => {
  it('formats crate breakdown correctly', () => {
    expect(formatCrateBreakdown(58, 3, 24, null)).toBe('3 crates (72)');
  });

  it('uses singular when 1 crate', () => {
    expect(formatCrateBreakdown(10, 1, 24, null)).toBe('1 crate (24)');
  });

  it('uses custom packaging type', () => {
    expect(formatCrateBreakdown(30, 3, 12, 'case')).toBe('3 cases (36)');
  });

  it('uses custom packaging type singular', () => {
    expect(formatCrateBreakdown(5, 1, 6, 'pack')).toBe('1 pack (6)');
  });

  it('returns null when no crate info', () => {
    expect(formatCrateBreakdown(58, null, null, null)).toBeNull();
  });

  it('returns null when cratesToOrder is null', () => {
    expect(formatCrateBreakdown(58, null, 24, null)).toBeNull();
  });
});

describe('REQ-021: Inventory Serialization — crate fields', () => {
  // Regression: edit page must include crateSize and packagingType when
  // serializing inventory data, otherwise the form loads empty values
  // and overwrites the saved data on next save.

  interface SerializedInventory {
    currentStock: number;
    minimumStock: number;
    maximumStock: number;
    unit: string;
    supplier: string;
    preventOrdersWhenOutOfStock: boolean;
    trackByLocation: boolean;
    crateSize?: number;
    packagingType?: string;
  }

  function serializeInventory(
    raw: Record<string, unknown>
  ): SerializedInventory {
    return {
      currentStock: (raw.currentStock as number) ?? 0,
      minimumStock: (raw.minimumStock as number) ?? 0,
      maximumStock: (raw.maximumStock as number) ?? 0,
      unit: (raw.unit as string) ?? 'units',
      supplier: (raw.supplier as string) ?? '',
      preventOrdersWhenOutOfStock:
        (raw.preventOrdersWhenOutOfStock as boolean) ?? false,
      trackByLocation: (raw.trackByLocation as boolean) ?? false,
      crateSize: (raw.crateSize as number) || undefined,
      packagingType: (raw.packagingType as string) || '',
    };
  }

  it('preserves crateSize when present in raw data', () => {
    const raw = {
      currentStock: 30,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'bottles',
      crateSize: 24,
      packagingType: 'crate',
    };
    const serialized = serializeInventory(raw);
    expect(serialized.crateSize).toBe(24);
    expect(serialized.packagingType).toBe('crate');
  });

  it('handles missing crateSize gracefully', () => {
    const raw = {
      currentStock: 30,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'bottles',
    };
    const serialized = serializeInventory(raw);
    expect(serialized.crateSize).toBeUndefined();
    expect(serialized.packagingType).toBe('');
  });

  it('handles zero crateSize as undefined', () => {
    const raw = {
      currentStock: 30,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'bottles',
      crateSize: 0,
    };
    const serialized = serializeInventory(raw);
    expect(serialized.crateSize).toBeUndefined();
  });
});
