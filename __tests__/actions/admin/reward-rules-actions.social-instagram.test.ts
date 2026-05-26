/**
 * REQ-046 D2 regression — server-side rewardRuleSchema must accept
 * `triggerType` and `socialConfig` (with the new cadence fields), and
 * the action must pass them through to `RewardsService.createRewardRule`
 * (and `updateRewardRule`). Before the fix, Zod's default-strip dropped
 * them silently, so social_instagram rules created from the admin form
 * were persisted as `triggerType: 'transaction'` with no socialConfig.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth-middleware', () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}));

const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/services/rewards-service', () => ({
  RewardsService: {
    createRewardRule: (...args: unknown[]) => mockCreate(...args),
    updateRewardRule: (...args: unknown[]) => mockUpdate(...args),
  },
}));

const baseInput = {
  name: 'Tag us 3x weekly',
  description: 'Earn points by tagging the bar on Instagram',
  isActive: true,
  spendThreshold: 0,
  triggerType: 'social_instagram' as const,
  socialConfig: {
    platform: 'instagram' as const,
    hashtag: '#WawaGardenBar',
    minViews: 0,
    maxPostsPerPeriod: 10,
    periodType: 'weekly' as const,
    pointsAwarded: 100,
    postsRequired: 3,
    windowDays: 7,
    requireMention: true,
  },
  rewardType: 'loyalty-points' as const,
  rewardValue: 100,
  probability: 1,
  validityDays: 30,
};

import {
  createRewardRuleAction,
  updateRewardRuleAction,
} from '@/app/actions/admin/reward-rules-actions';

beforeEach(() => {
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockCreate.mockResolvedValue({
    _id: new Types.ObjectId(),
    ...baseInput,
    socialConfig: { ...baseInput.socialConfig },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockUpdate.mockResolvedValue({
    _id: new Types.ObjectId(),
    ...baseInput,
    socialConfig: { ...baseInput.socialConfig },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe('createRewardRuleAction — social_instagram rule with cadence (REQ-046 D2)', () => {
  it('passes triggerType and socialConfig (incl. cadence fields) through to the service', async () => {
    const result = await createRewardRuleAction(baseInput);

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledOnce();
    const ruleData = mockCreate.mock.calls[0][0];

    expect(ruleData.triggerType).toBe('social_instagram');
    expect(ruleData.socialConfig).toBeDefined();
    expect(ruleData.socialConfig.platform).toBe('instagram');
    expect(ruleData.socialConfig.hashtag).toBe('#WawaGardenBar');
    expect(ruleData.socialConfig.postsRequired).toBe(3);
    expect(ruleData.socialConfig.windowDays).toBe(7);
    expect(ruleData.socialConfig.requireMention).toBe(true);
  });

  it('still creates plain transaction rules without socialConfig (regression)', async () => {
    const transactionInput = {
      ...baseInput,
      triggerType: 'transaction' as const,
      socialConfig: undefined,
      rewardType: 'discount-percentage' as const,
    };

    const result = await createRewardRuleAction(transactionInput);

    expect(result.success).toBe(true);
    const ruleData = mockCreate.mock.calls[0][0];
    expect(ruleData.triggerType).toBe('transaction');
    expect(ruleData.socialConfig).toBeUndefined();
  });
});

describe('updateRewardRuleAction — social_instagram update with cadence (REQ-046 D2)', () => {
  it('passes socialConfig cadence updates through to the service', async () => {
    const result = await updateRewardRuleAction('507f1f77bcf86cd799439011', {
      socialConfig: {
        ...baseInput.socialConfig,
        postsRequired: 5,
        windowDays: 14,
      },
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, updates] = mockUpdate.mock.calls[0];
    expect(updates.socialConfig).toBeDefined();
    expect(updates.socialConfig.postsRequired).toBe(5);
    expect(updates.socialConfig.windowDays).toBe(14);
  });
});
