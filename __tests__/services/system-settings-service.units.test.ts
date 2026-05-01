/**
 * @requirement REQ-033 - App-wide Unit-of-Measurement registry
 *
 * Service-level tests for SystemSettingsService.getUnitsOfMeasurement and
 * updateUnitsOfMeasurement. Mirrors the REQ-028 expense-categories test
 * style: connectDB and the model are mocked, so the tests assert the
 * defaulting / validation behaviour without needing a real Mongo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock('@/models/system-settings-model', () => ({
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

import { SystemSettingsService } from '@/services/system-settings-service';
import type { UnitOfMeasurement } from '@/interfaces/unit-of-measurement.interface';

const ADMIN_OID = '65a1b2c3d4e5f6a7b8c9d0e1';

beforeEach(() => {
  mockFindOne.mockReset();
  mockFindOneAndUpdate.mockReset();
});

// ── getUnitsOfMeasurement ────────────────────────────────────────────────────

describe('REQ-033: getUnitsOfMeasurement', () => {
  it('returns the default seed array when no document exists', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await SystemSettingsService.getUnitsOfMeasurement();
    expect(result.length).toBeGreaterThan(0);
    // Includes the canonical kitchen + sellable defaults
    expect(result.find((u) => u.id === 'kg')).toBeDefined();
    expect(result.find((u) => u.id === 'portions')).toBeDefined();
    expect(result.find((u) => u.id === 'litres')).toBeDefined();
  });

  it('returns the persisted array when a document exists', async () => {
    const persisted: UnitOfMeasurement[] = [
      { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
      {
        id: 'tablespoons',
        label: 'Tablespoons',
        category: 'volume',
        isActive: false,
      },
    ];
    mockFindOne.mockResolvedValue({ value: persisted });
    const result = await SystemSettingsService.getUnitsOfMeasurement();
    expect(result).toEqual(persisted);
  });
});

// ── updateUnitsOfMeasurement ─────────────────────────────────────────────────

const validRegistry: UnitOfMeasurement[] = [
  { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
  { id: 'litres', label: 'Litres (L)', category: 'volume', isActive: true },
];

describe('REQ-033: updateUnitsOfMeasurement', () => {
  it('persists a valid registry and pushes to changeHistory', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ value: validRegistry });

    await SystemSettingsService.updateUnitsOfMeasurement(
      validRegistry,
      ADMIN_OID
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = mockFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ key: 'units-of-measurement' });
    expect(options.upsert).toBe(true);
    expect(update.$set.value).toEqual(validRegistry);
    expect(update.$push.changeHistory.value).toEqual(validRegistry);
    expect(update.$push.changeHistory.reason).toMatch(/units of measurement/i);
  });

  it('rejects an empty registry', async () => {
    await expect(
      SystemSettingsService.updateUnitsOfMeasurement([], ADMIN_OID)
    ).rejects.toThrow(/cannot be empty/i);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects entries with missing or empty id', async () => {
    await expect(
      SystemSettingsService.updateUnitsOfMeasurement(
        [
          {
            id: '',
            label: 'Empty id',
            category: 'mass',
            isActive: true,
          } as UnitOfMeasurement,
        ],
        ADMIN_OID
      )
    ).rejects.toThrow(/non-empty id/i);
  });

  it('rejects entries with missing label', async () => {
    await expect(
      SystemSettingsService.updateUnitsOfMeasurement(
        [
          {
            id: 'kg',
            label: '',
            category: 'mass',
            isActive: true,
          } as UnitOfMeasurement,
        ],
        ADMIN_OID
      )
    ).rejects.toThrow(/non-empty label/i);
  });

  it('rejects unknown category values', async () => {
    await expect(
      SystemSettingsService.updateUnitsOfMeasurement(
        [
          {
            id: 'kg',
            label: 'Kilograms',
            category: 'distance' as unknown as UnitOfMeasurement['category'],
            isActive: true,
          },
        ],
        ADMIN_OID
      )
    ).rejects.toThrow(/invalid category/i);
  });

  it('rejects duplicate ids', async () => {
    await expect(
      SystemSettingsService.updateUnitsOfMeasurement(
        [
          { id: 'kg', label: 'Kilograms', category: 'mass', isActive: true },
          {
            id: 'kg',
            label: 'Kilograms again',
            category: 'mass',
            isActive: true,
          },
        ],
        ADMIN_OID
      )
    ).rejects.toThrow(/duplicate unit id/i);
  });
});
