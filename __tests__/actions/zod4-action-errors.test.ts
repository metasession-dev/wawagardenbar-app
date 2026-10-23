/**
 * @requirement REQ-114 - zod 3 → 4 upgrade (GHSA-mrhx-c7xc-m3w5)
 *
 * Server actions catch `ZodError` and return its first issue's message to the
 * UI (zod 4 renamed `ZodError.errors` → `.issues`). These pin that the
 * message a user sees is unchanged by the upgrade (AC3): zod 3's default
 * wording where the schema has none (via `@/lib/zod`, in the server runtime),
 * and the schema's own message where it has one. Invalid input never reaches
 * the service layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/auth-middleware', () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}));

const mockGetIronSession = vi.fn();
vi.mock('iron-session', () => ({
  getIronSession: (...args: unknown[]) => mockGetIronSession(...args),
}));

const mockAddAddress = vi.fn();
const mockUpdateProfile = vi.fn();
vi.mock('@/services', () => ({
  ProfileService: {
    addAddress: (...args: unknown[]) => mockAddAddress(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  },
  OrderService: {},
  TabService: {},
}));
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: vi.fn() },
}));

const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
vi.mock('@/services/rewards-service', () => ({
  RewardsService: {
    createRewardRule: (...args: unknown[]) => mockCreateRule(...args),
    updateRewardRule: (...args: unknown[]) => mockUpdateRule(...args),
  },
}));

import {
  addAddressAction,
  updateProfileAction,
} from '@/app/actions/profile/profile-actions';
import {
  createRewardRuleAction,
  updateRewardRuleAction,
} from '@/app/actions/admin/reward-rules-actions';

const validAddress = {
  label: 'Home',
  streetAddress: '12 Garden Road',
  city: 'Lagos',
  state: 'Lagos',
  postalCode: '100001',
  country: 'Nigeria',
  isDefault: false,
};

const validRule = {
  name: 'Big spender',
  description: 'Spend more than the threshold to earn a reward',
  isActive: true,
  spendThreshold: 10000,
  rewardType: 'discount-percentage' as const,
  rewardValue: 10,
  probability: 0.5,
  validityDays: 30,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockGetIronSession.mockResolvedValue({
    isLoggedIn: true,
    userId: '65a1b2c3d4e5f6a7b8c9d000',
  });
});

describe('profile actions return the pre-upgrade validation message (AC3)', () => {
  it('addAddressAction: too-short street address → zod 3 default message', async () => {
    const result = await addAddressAction({
      ...validAddress,
      streetAddress: 'abc',
    });
    expect(result).toEqual({
      success: false,
      error: 'String must contain at least 5 character(s)',
    });
    expect(mockAddAddress).not.toHaveBeenCalled();
  });

  it('updateProfileAction: malformed phone → zod 3 default regex message', async () => {
    const result = await updateProfileAction({ phone: 'not-a-phone' });
    expect(result).toEqual({ success: false, error: 'Invalid' });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});

describe('reward-rule actions return the pre-upgrade validation message (AC3)', () => {
  it('createRewardRuleAction: short name → the schema’s own message', async () => {
    const result = await createRewardRuleAction({ ...validRule, name: 'ab' });
    expect(result).toEqual({
      success: false,
      error: 'Name must be at least 3 characters',
    });
    expect(mockCreateRule).not.toHaveBeenCalled();
  });

  it('updateRewardRuleAction: short name → zod 3 default message', async () => {
    const result = await updateRewardRuleAction('65a1b2c3d4e5f6a7b8c9d100', {
      name: 'ab',
    });
    expect(result).toEqual({
      success: false,
      error: 'String must contain at least 3 character(s)',
    });
    expect(mockUpdateRule).not.toHaveBeenCalled();
  });
});
