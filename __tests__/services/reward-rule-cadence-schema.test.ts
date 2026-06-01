/**
 * Schema-level coverage for the IG cadence fields added to
 * `RewardRule.socialConfig` per issue #117 (IG-1):
 *   - postsRequired (Number, min 1)
 *   - windowDays (Number, min 1)
 *   - requireMention (Boolean, default true)
 *
 * No DB is touched — we introspect the Mongoose schema to confirm the
 * fields are registered with the expected types and validators. This
 * guards against accidental removal during future refactors.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

import RewardRuleModel from '@/models/reward-rule-model';

describe('RewardRule.socialConfig cadence fields', () => {
  it('has postsRequired registered as Number with min=1', () => {
    const path = RewardRuleModel.schema.path('socialConfig.postsRequired');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Number');
    expect((path as unknown as { options: { min?: number } }).options.min).toBe(
      1
    );
  });

  it('has windowDays registered as Number with min=1', () => {
    const path = RewardRuleModel.schema.path('socialConfig.windowDays');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Number');
    expect((path as unknown as { options: { min?: number } }).options.min).toBe(
      1
    );
  });

  it('has requireMention registered as Boolean defaulting to true', () => {
    const path = RewardRuleModel.schema.path('socialConfig.requireMention');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Boolean');
    expect(
      (path as unknown as { options: { default?: boolean } }).options.default
    ).toBe(true);
  });

  it('still has the legacy socialConfig fields intact (regression)', () => {
    expect(RewardRuleModel.schema.path('socialConfig.hashtag')).toBeDefined();
    expect(RewardRuleModel.schema.path('socialConfig.minViews')).toBeDefined();
    expect(
      RewardRuleModel.schema.path('socialConfig.maxPostsPerPeriod')
    ).toBeDefined();
    expect(
      RewardRuleModel.schema.path('socialConfig.periodType')
    ).toBeDefined();
    expect(
      RewardRuleModel.schema.path('socialConfig.pointsAwarded')
    ).toBeDefined();
  });

  // REQ-057 — IG-1 schema defaults + paired-validity hook
  describe('REQ-057 IG-1 defaults', () => {
    it('AC1 — postsRequired defaults to 3', () => {
      const path = RewardRuleModel.schema.path('socialConfig.postsRequired');
      expect(
        (path as unknown as { options: { default?: number } }).options.default
      ).toBe(3);
    });

    it('AC1 — windowDays defaults to 7', () => {
      const path = RewardRuleModel.schema.path('socialConfig.windowDays');
      expect(
        (path as unknown as { options: { default?: number } }).options.default
      ).toBe(7);
    });

    it('AC1 — explicit cadence values override the defaults', () => {
      const doc = new RewardRuleModel({
        name: 'IG Campaign',
        description: 'tag the bar',
        isActive: true,
        spendThreshold: 0,
        triggerType: 'social_instagram',
        socialConfig: {
          platform: 'instagram',
          postsRequired: 5,
          windowDays: 14,
          pointsAwarded: 200,
        },
        rewardType: 'loyalty-points',
        rewardValue: 200,
        probability: 1,
        validityDays: 30,
      });
      expect(doc.socialConfig?.postsRequired).toBe(5);
      expect(doc.socialConfig?.windowDays).toBe(14);
    });
  });

  describe('REQ-057 IG-1 paired-validity hook', () => {
    // Mongoose `validateSync()` skips `pre('validate')` middleware,
    // so these cases use async `.validate()` which DOES run hooks.

    it('AC2 — half-set (postsRequired only) fails validation', async () => {
      const doc = new RewardRuleModel({
        name: 'half',
        description: 'half-set',
        isActive: true,
        spendThreshold: 0,
        triggerType: 'social_instagram',
        socialConfig: {
          platform: 'instagram',
          postsRequired: 3,
          windowDays: null, // explicit null defeats the default
          pointsAwarded: 100,
        },
        rewardType: 'loyalty-points',
        rewardValue: 100,
        probability: 1,
        validityDays: 30,
      });
      await expect(doc.validate()).rejects.toMatchObject({
        errors: {
          socialConfig: expect.objectContaining({
            message: expect.stringContaining(
              'postsRequired and windowDays must be set together'
            ),
          }),
        },
      });
    });

    it('AC2 — half-set (windowDays only) fails validation', async () => {
      const doc = new RewardRuleModel({
        name: 'half2',
        description: 'half-set 2',
        isActive: true,
        spendThreshold: 0,
        triggerType: 'social_instagram',
        socialConfig: {
          platform: 'instagram',
          postsRequired: null,
          windowDays: 7,
          pointsAwarded: 100,
        },
        rewardType: 'loyalty-points',
        rewardValue: 100,
        probability: 1,
        validityDays: 30,
      });
      await expect(doc.validate()).rejects.toMatchObject({
        errors: { socialConfig: expect.anything() },
      });
    });

    it('AC2 — both-set cadence passes validation', async () => {
      const doc = new RewardRuleModel({
        name: 'both',
        description: 'both set',
        isActive: true,
        spendThreshold: 0,
        triggerType: 'social_instagram',
        socialConfig: {
          platform: 'instagram',
          postsRequired: 3,
          windowDays: 7,
          pointsAwarded: 100,
        },
        rewardType: 'loyalty-points',
        rewardValue: 100,
        probability: 1,
        validityDays: 30,
      });
      await expect(doc.validate()).resolves.toBeUndefined();
    });

    it('AC2 — neither-set (explicit null both) passes (legacy mode)', async () => {
      const doc = new RewardRuleModel({
        name: 'legacy',
        description: 'legacy capped',
        isActive: true,
        spendThreshold: 0,
        triggerType: 'social_instagram',
        socialConfig: {
          platform: 'instagram',
          postsRequired: null,
          windowDays: null,
          maxPostsPerPeriod: 1,
          periodType: 'weekly',
          pointsAwarded: 100,
        },
        rewardType: 'loyalty-points',
        rewardValue: 100,
        probability: 1,
        validityDays: 30,
      });
      await expect(doc.validate()).resolves.toBeUndefined();
    });
  });
});
