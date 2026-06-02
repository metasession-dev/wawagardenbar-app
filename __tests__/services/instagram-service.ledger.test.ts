/**
 * @requirement REQ-059 — InstagramPostCredit sliding-window ledger
 *
 * Service-level coverage of the new `processQualifyingPost` method
 * extracted from `processRule`. Drives the per-post ledger decisions:
 * dedup (ledger + legacy fallback), pending credit insert, sliding-window
 * threshold count, award + flip.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const mockCreditExists = vi.fn();
const mockCreditCreate = vi.fn();
const mockCreditCountDocuments = vi.fn();
const mockCreditUpdateMany = vi.fn();

vi.mock('@/models/instagram-post-credit-model', () => ({
  default: {
    exists: (...a: unknown[]) => mockCreditExists(...a),
    create: (...a: unknown[]) => mockCreditCreate(...a),
    countDocuments: (...a: unknown[]) => mockCreditCountDocuments(...a),
    updateMany: (...a: unknown[]) => mockCreditUpdateMany(...a),
  },
}));

const mockHasProcessedPost = vi.fn();
const mockAwardSocialPoints = vi.fn();

vi.mock('@/services/rewards-service', () => ({
  RewardsService: {
    awardSocialPoints: (...a: unknown[]) => mockAwardSocialPoints(...a),
  },
}));

// Force the InstagramService's internal `hasProcessedPost` legacy fallback
// to use our mock. The service imports it as a static class member, but
// for the test we can replace it via the static class reference at runtime.
import { InstagramService } from '@/services/instagram-service';
(InstagramService as unknown as Record<string, unknown>).hasProcessedPost = (
  ...a: unknown[]
) => mockHasProcessedPost(...a);

const USER = { _id: new Types.ObjectId() };
const RULE = {
  _id: new Types.ObjectId(),
  socialConfig: {
    hashtag: 'wawagardenbar',
    postsRequired: 3,
    windowDays: 7,
    pointsAwarded: 100,
  },
};
const POST_AT = new Date('2026-06-02T10:00:00Z');

function makePost(id: string) {
  return { id, timestamp: POST_AT.toISOString() };
}

beforeEach(() => {
  mockCreditExists.mockReset();
  mockCreditCreate.mockReset();
  mockCreditCountDocuments.mockReset();
  mockCreditUpdateMany.mockReset();
  mockHasProcessedPost.mockReset();
  mockAwardSocialPoints.mockReset();

  // Defaults: nothing seen yet, no legacy match, create succeeds, count below threshold.
  mockCreditExists.mockResolvedValue(null);
  mockCreditCreate.mockResolvedValue({ _id: new Types.ObjectId() });
  mockCreditCountDocuments.mockResolvedValue(0);
  mockCreditUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mockHasProcessedPost.mockResolvedValue(false);
  mockAwardSocialPoints.mockResolvedValue({ success: true });
});

describe('REQ-059 InstagramService.processQualifyingPost', () => {
  it('AC2 — new post with no ledger row and no legacy match inserts pending credit', async () => {
    mockCreditCountDocuments.mockResolvedValue(1); // 1 pending < 3 required
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m1'),
    });
    expect(mockCreditCreate).toHaveBeenCalledTimes(1);
    expect(mockCreditCreate.mock.calls[0][0]).toMatchObject({
      userId: USER._id,
      ruleId: RULE._id,
      postId: 'm1',
      status: 'pending',
    });
    expect(mockAwardSocialPoints).not.toHaveBeenCalled();
    expect(result.action).toBe('inserted_pending');
  });

  it('AC2 — existing ledger row for postId skips entirely', async () => {
    mockCreditExists.mockResolvedValue({ _id: new Types.ObjectId() });
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m2'),
    });
    expect(mockCreditCreate).not.toHaveBeenCalled();
    expect(mockHasProcessedPost).not.toHaveBeenCalled();
    expect(mockAwardSocialPoints).not.toHaveBeenCalled();
    expect(result.action).toBe('skipped_already_seen');
  });

  it('AC3 — no ledger row but legacy fallback fires inserts awarded credit, no re-award', async () => {
    mockHasProcessedPost.mockResolvedValue(true);
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m3'),
    });
    expect(mockCreditCreate).toHaveBeenCalledTimes(1);
    expect(mockCreditCreate.mock.calls[0][0]).toMatchObject({
      postId: 'm3',
      status: 'awarded',
    });
    expect(mockCreditCreate.mock.calls[0][0].awardedAt).toBeInstanceOf(Date);
    expect(mockAwardSocialPoints).not.toHaveBeenCalled();
    expect(result.action).toBe('inserted_legacy_fallback');
  });

  it('AC4 — pendingCount < postsRequired returns inserted_pending without awarding', async () => {
    mockCreditCountDocuments.mockResolvedValue(2); // below threshold of 3
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m4'),
    });
    expect(mockAwardSocialPoints).not.toHaveBeenCalled();
    expect(result.action).toBe('inserted_pending');
  });

  it('AC4 + AC5 — pendingCount >= postsRequired fires award + flip', async () => {
    mockCreditCountDocuments.mockResolvedValue(3); // threshold met
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m5'),
    });
    expect(mockAwardSocialPoints).toHaveBeenCalledTimes(1);
    expect(mockAwardSocialPoints).toHaveBeenCalledWith(
      USER._id.toString(),
      100,
      expect.stringContaining('cadence'),
      'm5'
    );
    expect(mockCreditUpdateMany).toHaveBeenCalledTimes(1);
    const updateArg = mockCreditUpdateMany.mock.calls[0][1] as {
      $set: Record<string, unknown>;
    };
    expect(updateArg.$set.status).toBe('awarded');
    expect(updateArg.$set.awardedAt).toBeInstanceOf(Date);
    expect(result.action).toBe('awarded');
  });

  it('AC5 — awardSocialPoints throwing does NOT call updateMany; credit stays pending', async () => {
    mockCreditCountDocuments.mockResolvedValue(3);
    mockAwardSocialPoints.mockRejectedValue(new Error('rewards down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m6'),
    });
    expect(mockCreditUpdateMany).not.toHaveBeenCalled();
    expect(result.action).toBe('award_failed');
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('AC6 — concurrent insert E11000 caught as skipped_already_seen, no award', async () => {
    const dupKeyErr = Object.assign(new Error('E11000 duplicate'), {
      code: 11000,
    });
    mockCreditCreate.mockRejectedValue(dupKeyErr);
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m7'),
    });
    expect(mockAwardSocialPoints).not.toHaveBeenCalled();
    expect(result.action).toBe('skipped_already_seen');
  });

  it('AC4 — uses rule defaults (3 / 7) when socialConfig fields absent', async () => {
    const RULE_NO_CADENCE = {
      _id: new Types.ObjectId(),
      socialConfig: { hashtag: 'wawagardenbar', pointsAwarded: 50 },
    };
    mockCreditCountDocuments.mockResolvedValue(3); // meets default postsRequired
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE_NO_CADENCE as unknown as typeof RULE,
      post: makePost('m8'),
    });
    expect(mockAwardSocialPoints).toHaveBeenCalledWith(
      USER._id.toString(),
      50,
      expect.any(String),
      'm8'
    );
    expect(result.action).toBe('awarded');
  });

  it('AC7 — hourly re-tick: same post, ledger already has it → skipped_already_seen', async () => {
    mockCreditExists.mockResolvedValue({ _id: new Types.ObjectId() });
    const result = await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m9'),
    });
    expect(mockCreditCreate).not.toHaveBeenCalled();
    expect(result.action).toBe('skipped_already_seen');
  });

  it('AC4 — count query filters on userId + ruleId + status:pending + postedAt window', async () => {
    mockCreditCountDocuments.mockResolvedValue(1);
    await InstagramService.processQualifyingPost({
      user: USER,
      rule: RULE,
      post: makePost('m10'),
    });
    expect(mockCreditCountDocuments).toHaveBeenCalledTimes(1);
    const filter = mockCreditCountDocuments.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(filter.userId).toBe(USER._id);
    expect(filter.ruleId).toBe(RULE._id);
    expect(filter.status).toBe('pending');
    expect(filter.postedAt).toBeDefined();
    expect((filter.postedAt as { $gte: Date }).$gte).toBeInstanceOf(Date);
  });
});
