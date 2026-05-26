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
});
