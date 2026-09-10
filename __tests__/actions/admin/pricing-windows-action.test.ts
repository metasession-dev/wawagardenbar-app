/**
 * @requirement REQ-103 — AC3/AC5/AC6: dedicated `updatePricingWindowsAction`
 * replacing the Pricing Window form's prior dependency on the generic
 * super-admin-only `PUT /api/settings`. Gated by `menuManagement`; the
 * action's typed parameters mean it can only ever write `showPriceWindow` /
 * `happyHourWindow` (AC6) — no other `Settings` field is reachable through
 * this path.
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

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {},
}));

vi.mock('@/services/price-history-service', () => ({
  PriceHistoryService: { updatePrice: vi.fn() },
}));

const mockUpdateSettings = vi.fn();
vi.mock('@/services/settings-service', () => ({
  SettingsService: {
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  },
}));

import { updatePricingWindowsAction } from '@/app/actions/admin/menu-actions';

const USER_ID = '65a1b2c3d4e5f6a7b8c9d000';

const windows = () => ({
  showPriceWindow: { enabled: true, start: '10:00', end: '12:00' },
  happyHourWindow: { enabled: true, start: '17:00', end: '19:00' },
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSettings.mockResolvedValue({});
});

describe('updatePricingWindowsAction — RBAC (REQ-103)', () => {
  it('rejects an unauthenticated session', async () => {
    mockGetIronSession.mockResolvedValue({});
    const result = await updatePricingWindowsAction(windows());
    expect(result.success).toBe(false);
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it('rejects an admin session with no menuManagement permission (AC5)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      permissions: { menuManagement: false },
    });
    const result = await updatePricingWindowsAction(windows());
    expect(result.success).toBe(false);
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it('allows a menuManagement-permitted admin to save (AC3)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'admin',
      email: 'staff@test.local',
      permissions: { menuManagement: true },
    });
    const result = await updatePricingWindowsAction(windows());
    expect(result.success).toBe(true);
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      {
        showPriceWindow: windows().showPriceWindow,
        happyHourWindow: windows().happyHourWindow,
      },
      USER_ID,
      'staff@test.local'
    );
  });

  it('still allows super-admin (regression)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'super-admin',
    });
    const result = await updatePricingWindowsAction(windows());
    expect(result.success).toBe(true);
  });

  it('never passes any field beyond showPriceWindow/happyHourWindow (AC6)', async () => {
    mockGetIronSession.mockResolvedValue({
      userId: USER_ID,
      role: 'super-admin',
    });
    await updatePricingWindowsAction(windows());
    const [passedUpdates] = mockUpdateSettings.mock.calls[0];
    expect(Object.keys(passedUpdates).sort()).toEqual(
      ['happyHourWindow', 'showPriceWindow'].sort()
    );
  });
});
