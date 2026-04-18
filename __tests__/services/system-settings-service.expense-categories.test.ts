/**
 * @requirement REQ-028 - Group expense categories within each type
 *
 * Unit tests for SystemSettingsService.getExpenseCategories and
 * updateExpenseCategories covering the extended shape with groups
 * (directCostGroups, operatingExpenseGroups) and backward compatibility
 * with documents written before this feature.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

const ADMIN_OID = '65a1b2c3d4e5f6a7b8c9d0e1';

beforeEach(() => {
  mockFindOne.mockReset();
  mockFindOneAndUpdate.mockReset();
});

// ── getExpenseCategories ──────────────────────────────────────────────────────

describe('REQ-028: getExpenseCategories', () => {
  it('defaults missing group arrays to empty', async () => {
    mockFindOne.mockResolvedValue({
      value: {
        directCostCategories: ['Beef', 'Catfish'],
        operatingExpenseCategories: ['Rent', 'Salaries'],
        // no directCostGroups / operatingExpenseGroups
      },
    });

    const result = await SystemSettingsService.getExpenseCategories();

    expect(result.directCostGroups).toEqual([]);
    expect(result.operatingExpenseGroups).toEqual([]);
    expect(result.directCostCategories).toEqual(['Beef', 'Catfish']);
  });

  it('returns persisted groups when present', async () => {
    const persistedGroups = [
      { name: 'Proteins', categoryNames: ['Beef', 'Catfish'] },
    ];
    mockFindOne.mockResolvedValue({
      value: {
        directCostCategories: ['Beef', 'Catfish', 'Palm Oil'],
        operatingExpenseCategories: ['Rent'],
        directCostGroups: persistedGroups,
        operatingExpenseGroups: [],
      },
    });

    const result = await SystemSettingsService.getExpenseCategories();

    expect(result.directCostGroups).toEqual(persistedGroups);
    expect(result.operatingExpenseGroups).toEqual([]);
  });

  it('returns defaults with empty groups when no document exists', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await SystemSettingsService.getExpenseCategories();

    expect(result.directCostGroups).toEqual([]);
    expect(result.operatingExpenseGroups).toEqual([]);
    expect(Array.isArray(result.directCostCategories)).toBe(true);
    expect(result.directCostCategories.length).toBeGreaterThan(0);
  });
});

// ── updateExpenseCategories ───────────────────────────────────────────────────

describe('REQ-028: updateExpenseCategories', () => {
  it('throws when groups fail validation (duplicate category membership)', async () => {
    await expect(
      SystemSettingsService.updateExpenseCategories(
        {
          directCostCategories: ['Beef', 'Catfish'],
          operatingExpenseCategories: ['Rent'],
          directCostGroups: [
            { name: 'G1', categoryNames: ['Beef'] },
            { name: 'G2', categoryNames: ['Beef'] },
          ],
          operatingExpenseGroups: [],
        },
        ADMIN_OID
      )
    ).rejects.toThrow();

    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('throws when a group references a category not in the flat list', async () => {
    await expect(
      SystemSettingsService.updateExpenseCategories(
        {
          directCostCategories: ['Beef', 'Catfish'],
          operatingExpenseCategories: ['Rent'],
          directCostGroups: [{ name: 'G1', categoryNames: ['Beef', 'Goat'] }],
          operatingExpenseGroups: [],
        },
        ADMIN_OID
      )
    ).rejects.toThrow();

    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('persists groups and appends change history on valid input', async () => {
    mockFindOneAndUpdate.mockResolvedValue({});

    const payload = {
      directCostCategories: ['Beef', 'Catfish', 'Palm Oil'],
      operatingExpenseCategories: ['Rent', 'Salaries'],
      directCostGroups: [
        { name: 'Proteins', categoryNames: ['Beef', 'Catfish'] },
      ],
      operatingExpenseGroups: [],
    };

    const result = await SystemSettingsService.updateExpenseCategories(
      payload,
      ADMIN_OID
    );

    expect(result).toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);

    const [filter, update] = mockFindOneAndUpdate.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, any>,
    ];
    expect(filter).toEqual({ key: 'expense-categories' });
    expect(update.$set.value).toEqual(payload);
    expect(update.$push.changeHistory).toBeDefined();
    expect(update.$push.changeHistory.value).toEqual(payload);
  });

  it('still rejects empty category arrays (existing invariant)', async () => {
    await expect(
      SystemSettingsService.updateExpenseCategories(
        {
          directCostCategories: [],
          operatingExpenseCategories: ['Rent'],
          directCostGroups: [],
          operatingExpenseGroups: [],
        },
        ADMIN_OID
      )
    ).rejects.toThrow();
  });
});
