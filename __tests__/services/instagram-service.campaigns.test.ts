/**
 * @requirement REQ-060 — Customer-facing Instagram campaign progress card
 *
 * Coverage of `InstagramService.getActiveCampaignsForUser` — the
 * server-side aggregator that the customer rewards page calls. Returns
 * one entry per currently-active social_instagram rule with the user's
 * `pending` credit count inside the rolling `windowDays` window.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const mockFind = vi.fn();
vi.mock('@/models/reward-rule-model', () => ({
  default: {
    find: (...a: unknown[]) => mockFind(...a),
  },
}));

const mockCountDocuments = vi.fn();
vi.mock('@/models/instagram-post-credit-model', () => ({
  default: {
    countDocuments: (...a: unknown[]) => mockCountDocuments(...a),
    exists: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@/models/user-model', () => ({
  default: { findOne: vi.fn() },
}));

import { InstagramService } from '@/services/instagram-service';

const USER_ID = '65a1b2c3d4e5f6a7b8c9d0aa';

function makeRule(opts: {
  id?: Types.ObjectId;
  name: string;
  hashtag?: string;
  postsRequired?: number;
  windowDays?: number;
  pointsAwarded?: number;
  active?: boolean; // result of isCurrentlyActive
}) {
  return {
    _id: opts.id ?? new Types.ObjectId(),
    name: opts.name,
    socialConfig: {
      platform: 'instagram',
      hashtag: opts.hashtag ?? 'wawagardenbar',
      postsRequired: opts.postsRequired,
      windowDays: opts.windowDays,
      pointsAwarded: opts.pointsAwarded ?? 100,
    },
    isCurrentlyActive: () => opts.active ?? true,
  };
}

function withExec<T>(value: T) {
  return { exec: vi.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  mockFind.mockReset();
  mockCountDocuments.mockReset();
});

describe('REQ-060 InstagramService.getActiveCampaignsForUser', () => {
  it('AC1 — no active rules returns []', async () => {
    mockFind.mockReturnValue(withExec([]));
    const result = await InstagramService.getActiveCampaignsForUser(USER_ID);
    expect(result).toEqual([]);
    expect(mockCountDocuments).not.toHaveBeenCalled();
  });

  it('AC1 — rules exist but none currently-active returns []', async () => {
    mockFind.mockReturnValue(
      withExec([
        makeRule({ name: 'Past Campaign', active: false }),
        makeRule({ name: 'Future Campaign', active: false }),
      ])
    );
    const result = await InstagramService.getActiveCampaignsForUser(USER_ID);
    expect(result).toEqual([]);
    expect(mockCountDocuments).not.toHaveBeenCalled();
  });

  it('AC1 + AC2 — one active rule with 0 pending credits returns progress 0', async () => {
    const rule = makeRule({
      name: 'Summer IG',
      postsRequired: 3,
      windowDays: 7,
      pointsAwarded: 100,
    });
    mockFind.mockReturnValue(withExec([rule]));
    mockCountDocuments.mockResolvedValue(0);

    const result = await InstagramService.getActiveCampaignsForUser(USER_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleName: 'Summer IG',
      hashtag: 'wawagardenbar',
      postsRequired: 3,
      windowDays: 7,
      pointsAwarded: 100,
      currentProgress: 0,
    });
  });

  it('AC2 — pending count of 2 surfaces as currentProgress 2', async () => {
    const rule = makeRule({
      name: 'Tag Three Times',
      postsRequired: 3,
      windowDays: 7,
    });
    mockFind.mockReturnValue(withExec([rule]));
    mockCountDocuments.mockResolvedValue(2);

    const result = await InstagramService.getActiveCampaignsForUser(USER_ID);
    expect(result[0].currentProgress).toBe(2);
  });

  it('AC3 — countDocuments filter uses status:pending + windowDays window', async () => {
    const rule = makeRule({
      name: 'Window Test',
      postsRequired: 3,
      windowDays: 14,
    });
    mockFind.mockReturnValue(withExec([rule]));
    mockCountDocuments.mockResolvedValue(1);

    await InstagramService.getActiveCampaignsForUser(USER_ID);

    expect(mockCountDocuments).toHaveBeenCalledTimes(1);
    const filter = mockCountDocuments.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(filter.userId).toBe(USER_ID);
    expect(filter.ruleId).toBe(rule._id);
    expect(filter.status).toBe('pending');
    expect(filter.postedAt).toBeDefined();
    const gte = (filter.postedAt as { $gte: Date }).$gte;
    expect(gte).toBeInstanceOf(Date);
    // 14-day window means the cutoff is approx 14 days before now
    const ageMs = Date.now() - gte.getTime();
    const expectedMs = 14 * 24 * 60 * 60 * 1000;
    expect(Math.abs(ageMs - expectedMs)).toBeLessThan(60_000); // <1 minute drift
  });

  it('AC1 — multiple active rules returns one entry per rule', async () => {
    const ruleA = makeRule({ name: 'Campaign A' });
    const ruleB = makeRule({ name: 'Campaign B' });
    mockFind.mockReturnValue(withExec([ruleA, ruleB]));
    mockCountDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const result = await InstagramService.getActiveCampaignsForUser(USER_ID);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.ruleName)).toEqual(['Campaign A', 'Campaign B']);
  });

  it('AC6 — DB failure returns [] and logs (does not throw)', async () => {
    mockFind.mockImplementation(() => {
      throw new Error('Mongo down');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await InstagramService.getActiveCampaignsForUser(USER_ID);
    expect(result).toEqual([]);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
