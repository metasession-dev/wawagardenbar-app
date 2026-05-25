/**
 * Client-side form-schema coverage for the IG cadence fields (REQ-046).
 *
 * REQ-046 D3: a blank cadence `<input>` submits "" which `z.coerce.number()`
 * turns into 0, so the original `.min(1).optional()` rejected a *blank* field
 * even though the UI invites operators to leave it blank ("Leave blank for the
 * legacy one-award-per-post behaviour"). These tests lock in that blank cadence
 * parses cleanly while genuinely invalid values are still rejected, and that
 * the validation toast can name the nested sub-field.
 *
 * REQ-046 D4: the Period Type select shows "weekly" as a display fallback but
 * never wrote it to form state, so an untouched select submitted
 * periodType:undefined and the required enum blocked the same blank-cadence
 * save. The schema now defaults periodType to 'weekly'; these tests lock in
 * that an untouched select parses to 'weekly' while explicit/invalid values
 * behave correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  formSchema,
  firstErrorPath,
} from '@/components/features/admin/rewards/reward-rule-form';

const baseSocialRule = {
  name: 'IG engagement',
  description: 'Earn points for Instagram posts',
  isActive: true,
  spendThreshold: 0,
  triggerType: 'social_instagram' as const,
  rewardType: 'loyalty-points' as const,
  rewardValue: 100,
  probability: 100,
  validityDays: 30,
  socialConfig: {
    platform: 'instagram' as const,
    hashtag: '#wawa',
    minViews: 0,
    maxPostsPerPeriod: 5,
    periodType: 'weekly' as const,
    pointsAwarded: 100,
  },
};

describe('reward-rule-form formSchema — cadence fields (REQ-046 D3)', () => {
  it('accepts a social rule with cadence fields left blank ("")', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: {
        ...baseSocialRule.socialConfig,
        postsRequired: '',
        windowDays: '',
        requireMention: true,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // blank → omitted (undefined), not 0
      expect(result.data.socialConfig?.postsRequired).toBeUndefined();
      expect(result.data.socialConfig?.windowDays).toBeUndefined();
    }
  });

  it('accepts a valid "3 posts in 7 days" cadence and coerces to numbers', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: {
        ...baseSocialRule.socialConfig,
        postsRequired: '3',
        windowDays: '7',
        requireMention: false,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.socialConfig?.postsRequired).toBe(3);
      expect(result.data.socialConfig?.windowDays).toBe(7);
    }
  });

  it('still rejects a cadence value below 1', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: {
        ...baseSocialRule.socialConfig,
        postsRequired: '0',
      },
    });
    expect(result.success).toBe(false);
  });

  it('still rejects a non-integer cadence value', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: {
        ...baseSocialRule.socialConfig,
        windowDays: '2.5',
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('reward-rule-form formSchema — periodType default (REQ-046 D4)', () => {
  it('defaults periodType to "weekly" when the select is untouched (undefined)', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: {
        platform: 'instagram' as const,
        hashtag: '#wawa',
        minViews: 0,
        maxPostsPerPeriod: 5,
        pointsAwarded: 100,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.socialConfig?.periodType).toBe('weekly');
  });

  it('preserves an explicitly chosen periodType (does not clobber on edit)', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: { ...baseSocialRule.socialConfig, periodType: 'monthly' as const },
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.socialConfig?.periodType).toBe('monthly');
  });

  it('still rejects an invalid periodType value', () => {
    const result = formSchema.safeParse({
      ...baseSocialRule,
      socialConfig: { ...baseSocialRule.socialConfig, periodType: 'daily' },
    });
    expect(result.success).toBe(false);
  });
});

describe('firstErrorPath — nested error reporting (REQ-046 D3)', () => {
  it('returns the dotted path of a nested leaf error', () => {
    const errors = {
      socialConfig: {
        postsRequired: { type: 'min', message: 'Number must be >= 1' },
      },
    };
    expect(firstErrorPath(errors)).toBe('socialConfig.postsRequired');
  });

  it('returns a top-level field name when the error is not nested', () => {
    const errors = { name: { type: 'too_small', message: 'too short' } };
    expect(firstErrorPath(errors)).toBe('name');
  });

  it('returns undefined when there are no errors', () => {
    expect(firstErrorPath({})).toBeUndefined();
  });
});
