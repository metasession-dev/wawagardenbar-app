/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * getPrintableMenuDataAction: permission gate (AC10), input validation,
 * availability/kind filter (AC9) and serialization.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

const mockGetIronSession = vi.fn();
vi.mock('iron-session', () => ({
  getIronSession: (...args: unknown[]) => mockGetIronSession(...args),
}));

const mockGetMenuCategories = vi.fn();
const mockGetMainCategories = vi.fn();
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getMenuCategories: (...args: unknown[]) => mockGetMenuCategories(...args),
    getMainCategories: (...args: unknown[]) => mockGetMainCategories(...args),
  },
}));

const mockFind = vi.fn();
const mockSelect = vi.fn();
const mockLean = vi.fn();
vi.mock('@/models/menu-item-model', () => ({
  default: {
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

import { getPrintableMenuDataAction } from '@/app/actions/admin/menu-print-actions';

const USER_ID = '65a1b2c3d4e5f6a7b8c9d000';
const ITEM_ID = '65a1b2c3d4e5f6a7b8c9d100';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetIronSession.mockResolvedValue({
    userId: USER_ID,
    role: 'super-admin',
    email: 'admin@test.local',
  });
  mockFind.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ lean: mockLean });
  mockLean.mockResolvedValue([
    {
      _id: { toString: () => ITEM_ID },
      name: 'Jollof',
      mainCategory: 'food',
      category: 'main-courses',
      price: 3000,
      happyHourPrice: 2500,
    },
  ]);
  mockGetMenuCategories.mockResolvedValue({
    food: [
      {
        value: 'main-courses',
        label: 'Main Courses',
        order: 1,
        isEnabled: false,
      },
    ],
  });
  mockGetMainCategories.mockResolvedValue([
    { slug: 'food', label: 'Food', order: 1, isEnabled: true },
    { slug: 'shisha', label: 'Shisha', order: 3, isEnabled: false },
  ]);
});

describe('getPrintableMenuDataAction', () => {
  it('rejects a request with no session without querying items (AC10)', async () => {
    mockGetIronSession.mockResolvedValue({});
    const result = await getPrintableMenuDataAction(['food']);
    expect(result).toEqual({
      success: false,
      error: 'You do not have permission to print the menu',
    });
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('rejects an admin without menuManagement (AC10)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      permissions: { menuManagement: false },
    });
    const result = await getPrintableMenuDataAction(['food']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('You do not have permission to print the menu');
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('rejects a CSR (AC10)', async () => {
    mockGetIronSession.mockResolvedValue({ userId: USER_ID, role: 'csr' });
    const result = await getPrintableMenuDataAction(['food']);
    expect(result.success).toBe(false);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('allows a super-admin', async () => {
    const result = await getPrintableMenuDataAction(['food']);
    expect(result.success).toBe(true);
  });

  it('allows an admin with menuManagement', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      permissions: { menuManagement: true },
    });
    const result = await getPrintableMenuDataAction(['food']);
    expect(result.success).toBe(true);
  });

  it.each([
    [[]],
    [['Bad Slug']],
    [['food', '$where']],
    [[{ $ne: null }]],
    [Array.from({ length: 51 }, (_, i) => `cat-${i}`)],
  ])('rejects invalid slugs %j without querying', async (slugs) => {
    const result = await getPrintableMenuDataAction(slugs as string[]);
    expect(result).toEqual({
      success: false,
      error: 'Select at least one valid main category',
    });
    expect(mockFind).not.toHaveBeenCalled();
  });

  it('queries only available menu items in the selected main categories (AC9)', async () => {
    await getPrintableMenuDataAction(['food', 'drinks']);
    expect(mockFind).toHaveBeenCalledWith({
      kind: 'menu-item',
      isAvailable: true,
      mainCategory: { $in: ['food', 'drinks'] },
    });
    expect(mockSelect).toHaveBeenCalledWith(
      '_id name mainCategory category price showPrice happyHourPrice'
    );
  });

  it('serializes ids, filters disabled main categories and keeps all sub-categories', async () => {
    const result = await getPrintableMenuDataAction(['food']);
    expect(result.data).toEqual({
      items: [
        {
          id: ITEM_ID,
          name: 'Jollof',
          mainCategory: 'food',
          category: 'main-courses',
          price: 3000,
          happyHourPrice: 2500,
        },
      ],
      mainCategories: [{ slug: 'food', label: 'Food', order: 1 }],
      menuSettings: {
        food: [{ value: 'main-courses', label: 'Main Courses', order: 1 }],
      },
    });
  });

  it('returns a generic error when the query fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockLean.mockRejectedValue(new Error('db down'));
    const result = await getPrintableMenuDataAction(['food']);
    expect(result).toEqual({
      success: false,
      error: 'Failed to load menu items',
    });
    spy.mockRestore();
  });
});
