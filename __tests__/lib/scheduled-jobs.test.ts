/**
 * @requirement REQ-048 — Reward-expiry job scheduled in-process (#117 P0 #3)
 * @requirement REQ-058 — Instagram-rewards job scheduled in-process (#117 IG-5)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExpire = vi.fn();
vi.mock('@/services/rewards-service', () => ({
  RewardsService: { expireOldRewards: (...a: unknown[]) => mockExpire(...a) },
}));

const mockProcessIG = vi.fn();
vi.mock('@/services/instagram-service', () => ({
  InstagramService: {
    processInstagramRewards: (...a: unknown[]) => mockProcessIG(...a),
  },
}));

import {
  runRewardExpiryJob,
  runInstagramRewardsJob,
  startScheduledJobs,
} from '@/lib/scheduled-jobs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('REQ-048: runRewardExpiryJob', () => {
  it('calls expireOldRewards and returns the count', async () => {
    mockExpire.mockResolvedValue(3);
    const n = await runRewardExpiryJob();
    expect(mockExpire).toHaveBeenCalledOnce();
    expect(n).toBe(3);
  });

  it('swallows errors and returns 0 (a tick must not crash the server)', async () => {
    mockExpire.mockRejectedValue(new Error('db down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const n = await runRewardExpiryJob();
    expect(n).toBe(0);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('REQ-058: runInstagramRewardsJob', () => {
  it('calls processInstagramRewards', async () => {
    mockProcessIG.mockResolvedValue(undefined);
    await runInstagramRewardsJob();
    expect(mockProcessIG).toHaveBeenCalledOnce();
  });

  it('swallows errors and does not throw (a tick must not crash the server)', async () => {
    mockProcessIG.mockRejectedValue(new Error('graph api down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runInstagramRewardsJob()).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe('REQ-048 + REQ-058: startScheduledJobs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers THREE intervals (reward-expiry + instagram-rewards + inventory-reconcile) and is idempotent', () => {
    vi.useFakeTimers();
    const intervalSpy = vi.spyOn(global, 'setInterval');
    startScheduledJobs();
    startScheduledJobs(); // second call must not stack intervals
    // REQ-048 reward-expiry (hourly) + REQ-058 instagram-rewards (hourly)
    // + REQ-066 inventory-reconcile + stale-paid scan (15-min) = 3 intervals.
    // Idempotency guard prevents stacking on the second call.
    expect(intervalSpy).toHaveBeenCalledTimes(3);
  });
});
