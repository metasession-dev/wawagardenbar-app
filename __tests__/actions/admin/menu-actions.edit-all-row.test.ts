/**
 * @requirement REQ-102 — AC7/AC8: bulk "Edit All" row save.
 *
 * updateMenuItemRowAction only touches the fields the bulk table exposes
 * (name, main category, category, cost/default/show/happy-hour price) and
 * routes price changes through PriceHistoryService.updatePrice — the same
 * audited snapshot convention as the single-item Price Management form.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockGetIronSession = vi.fn();
vi.mock('iron-session', () => ({
  getIronSession: (...args: unknown[]) => mockGetIronSession(...args),
}));

const mockUpdatePrice = vi.fn();
vi.mock('@/services/price-history-service', () => ({
  PriceHistoryService: {
    updatePrice: (...args: unknown[]) => mockUpdatePrice(...args),
  },
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {},
}));

const MENU_ITEM_ID = '65a1b2c3d4e5f6a7b8c9d100';
const USER_ID = '65a1b2c3d4e5f6a7b8c9d000';

let currentItem: Record<string, unknown>;

const mockFindByIdAndUpdate = vi.fn();

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: vi.fn(async () => currentItem),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

vi.mock('mongoose', async () => {
  const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
  return {
    ...actual,
    Types: {
      ...actual.Types,
      ObjectId: {
        ...actual.Types.ObjectId,
        isValid: (s: string) => /^[0-9a-fA-F]{24}$/.test(s),
      },
    },
  };
});

import { updateMenuItemRowAction } from '@/app/actions/admin/menu-actions';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetIronSession.mockResolvedValue({
    userId: USER_ID,
    role: 'super-admin',
    email: 'admin@test.local',
  });
  currentItem = {
    _id: MENU_ITEM_ID,
    name: 'Beef',
    mainCategory: 'food',
    category: 'main-courses',
    price: 1000,
    showPrice: 1000,
    happyHourPrice: 1000,
    costPerUnit: 400,
  };
});

const baseParams = () => ({
  menuItemId: MENU_ITEM_ID,
  name: 'Beef',
  mainCategory: 'food',
  category: 'main-courses',
  costPerUnit: 400,
  price: 1000,
  showPrice: 1000,
  happyHourPrice: 1000,
});

describe('REQ-102 updateMenuItemRowAction — RBAC', () => {
  it('rejects a non-super-admin session', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      email: 'staff@test.local',
    });
    const result = await updateMenuItemRowAction(baseParams());
    expect(result.success).toBe(false);
    expect(mockUpdatePrice).not.toHaveBeenCalled();
  });
});

describe('REQ-102 updateMenuItemRowAction — field updates', () => {
  it('updates name/mainCategory/category when changed, without touching prices', async () => {
    const result = await updateMenuItemRowAction({
      ...baseParams(),
      name: 'Beef Peppersoup',
    });
    expect(result.success).toBe(true);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(MENU_ITEM_ID, {
      name: 'Beef Peppersoup',
      mainCategory: 'food',
      category: 'main-courses',
    });
    expect(mockUpdatePrice).not.toHaveBeenCalled();
  });

  it('routes price changes through PriceHistoryService.updatePrice (AC8)', async () => {
    const result = await updateMenuItemRowAction({
      ...baseParams(),
      showPrice: 800,
      happyHourPrice: 600,
    });
    expect(result.success).toBe(true);
    expect(mockUpdatePrice).toHaveBeenCalledWith(
      MENU_ITEM_ID,
      1000,
      400,
      'manual_adjustment',
      USER_ID,
      800,
      600
    );
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('does nothing when no field changed', async () => {
    const result = await updateMenuItemRowAction(baseParams());
    expect(result.success).toBe(true);
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockUpdatePrice).not.toHaveBeenCalled();
  });

  it('rejects negative prices', async () => {
    const result = await updateMenuItemRowAction({
      ...baseParams(),
      price: -100,
    });
    expect(result.success).toBe(false);
    expect(mockUpdatePrice).not.toHaveBeenCalled();
  });

  it('rejects an empty name', async () => {
    const result = await updateMenuItemRowAction({
      ...baseParams(),
      name: '  ',
    });
    expect(result.success).toBe(false);
  });
});
