/**
 * @requirement REQ-048 — Reward-expiry job scheduled in-process (#117 P0 #3)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockExpire = vi.fn();
vi.mock('@/services/rewards-service', () => ({
  RewardsService: { expireOldRewards: (...a: unknown[]) => mockExpire(...a) },
}));

import { runRewardExpiryJob, startScheduledJobs } from '@/lib/scheduled-jobs';

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

describe('REQ-048: startScheduledJobs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers the hourly interval once and is idempotent', () => {
    vi.useFakeTimers();
    const intervalSpy = vi.spyOn(global, 'setInterval');
    startScheduledJobs();
    startScheduledJobs(); // second call must not stack another interval
    expect(intervalSpy).toHaveBeenCalledTimes(1);
  });
});
