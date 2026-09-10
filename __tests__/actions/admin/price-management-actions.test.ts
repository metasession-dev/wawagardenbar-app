/**
 * @requirement REQ-103 — AC4/AC5: single-item Price Management save.
 *
 * `updateMenuItemPriceAction` previously hard-coded `role !== 'super-admin'`,
 * the same stale gate as the bulk "Edit All" row save. It now checks the
 * `menuManagement` permission via `hasSessionPermission`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { updateMenuItemPriceAction } from '@/app/actions/admin/price-management-actions';

const MENU_ITEM_ID = '65a1b2c3d4e5f6a7b8c9d100';
const USER_ID = '65a1b2c3d4e5f6a7b8c9d000';

const baseParams = () => ({
  menuItemId: MENU_ITEM_ID,
  price: 1000,
  costPerUnit: 400,
  showPrice: 1000,
  happyHourPrice: 1000,
  reason: 'manual_adjustment' as const,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdatePrice.mockResolvedValue(undefined);
});

describe('updateMenuItemPriceAction — RBAC (REQ-103)', () => {
  it('rejects an unauthenticated session', async () => {
    mockGetIronSession.mockResolvedValue({});
    const result = await updateMenuItemPriceAction(baseParams());
    expect(result.success).toBe(false);
    expect(mockUpdatePrice).not.toHaveBeenCalled();
  });

  it('rejects an admin session with no menuManagement permission (AC5)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      permissions: { menuManagement: false },
    });
    const result = await updateMenuItemPriceAction(baseParams());
    expect(result.success).toBe(false);
    expect(mockUpdatePrice).not.toHaveBeenCalled();
  });

  it('allows a menuManagement-permitted admin to save a price change (AC4)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      permissions: { menuManagement: true },
    });
    const result = await updateMenuItemPriceAction(baseParams());
    expect(result.success).toBe(true);
    expect(mockUpdatePrice).toHaveBeenCalledWith(
      MENU_ITEM_ID,
      1000,
      400,
      'manual_adjustment',
      USER_ID,
      1000,
      1000
    );
  });

  it('still allows super-admin (regression)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'super-admin',
    });
    const result = await updateMenuItemPriceAction(baseParams());
    expect(result.success).toBe(true);
  });
});
