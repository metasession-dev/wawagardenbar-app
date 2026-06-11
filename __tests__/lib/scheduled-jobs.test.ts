/**
 * @requirement REQ-048 — Reward-expiry job scheduled in-process (#117 P0 #3)
 * @requirement REQ-058 — Instagram-rewards job scheduled in-process (#117 IG-5)
 * @requirement REQ-078 — Env-var kill-switch for the inventory reconciliation job
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

// Inventory + order services are also imported by scheduled-jobs (REQ-066).
// Mock them out so REQ-078 startup tests can register the job without
// touching the real services or the DB.
vi.mock('@/services/inventory-service', () => ({
  default: {
    reconcileMissedDeductions: vi
      .fn()
      .mockResolvedValue({ attempted: 0, succeeded: 0, failed: 0 }),
  },
}));
vi.mock('@/services/order-service', () => ({
  OrderService: {
    scanStalePaidOrders: vi
      .fn()
      .mockResolvedValue({ scanned: 0, flagged: 0, skippedAsDup: 0 }),
  },
}));

import {
  runRewardExpiryJob,
  runInstagramRewardsJob,
} from '@/lib/scheduled-jobs';

const ENV_KEY = 'DISABLE_INVENTORY_RECONCILIATION_JOB';

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env[ENV_KEY];
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

describe('REQ-048 + REQ-058 + REQ-078: startScheduledJobs', () => {
  beforeEach(() => {
    vi.resetModules(); // fresh module per case so the `started` flag resets
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function loadFreshModule() {
    return await import('@/lib/scheduled-jobs');
  }

  it('registers THREE intervals by default (env var unset) and is idempotent', async () => {
    vi.useFakeTimers();
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    startScheduledJobs(); // second call must not stack intervals
    // REQ-048 reward-expiry (hourly) + REQ-058 instagram-rewards (hourly)
    // + REQ-066 inventory-reconcile + stale-paid scan (15-min) = 3 intervals.
    // Idempotency guard prevents stacking on the second call.
    expect(intervalSpy).toHaveBeenCalledTimes(3);
  });

  it('REQ-078 AC1 — DISABLE_INVENTORY_RECONCILIATION_JOB=true skips the inventory-reconcile registration', async () => {
    vi.useFakeTimers();
    process.env[ENV_KEY] = 'true';
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    // Two intervals — reward-expiry + instagram-rewards. NOT inventory-reconcile.
    expect(intervalSpy).toHaveBeenCalledTimes(2);
    // Two setTimeout calls (the initial-delay catch-ups for reward + IG only).
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('REQ-078 AC2 — env var unset behaves as today (inventory-reconcile registered)', async () => {
    vi.useFakeTimers();
    // ENV_KEY not set — beforeEach deleted it.
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    expect(intervalSpy).toHaveBeenCalledTimes(3);
  });

  it('REQ-078 AC2 — env=false does NOT disable (only literal "true" matches)', async () => {
    vi.useFakeTimers();
    process.env[ENV_KEY] = 'false';
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    expect(intervalSpy).toHaveBeenCalledTimes(3);
  });

  it('REQ-078 AC2 — arbitrary non-"true" string does NOT disable', async () => {
    vi.useFakeTimers();
    process.env[ENV_KEY] = '1';
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    expect(intervalSpy).toHaveBeenCalledTimes(3);
  });

  it('REQ-078 AC3 — startup log reflects the gate decision', async () => {
    vi.useFakeTimers();
    process.env[ENV_KEY] = 'true';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    // The bottom log line includes either `inventory-reconcile: 15min`
    // (active) or `inventory-reconcile: DISABLED` (gated).
    const lines = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(lines).toContain('inventory-reconcile: DISABLED');
    warnSpy.mockRestore();
  });

  it('REQ-078 AC4 — gate only affects inventory-reconcile; reward-expiry + instagram-rewards still register', async () => {
    vi.useFakeTimers();
    process.env[ENV_KEY] = 'true';
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const { startScheduledJobs } = await loadFreshModule();
    startScheduledJobs();
    // Two intervals registered (reward + IG). HOUR_MS = 3600000 used for both.
    const intervalDelays = intervalSpy.mock.calls.map((c) => c[1]);
    expect(intervalDelays).toEqual([3600000, 3600000]);
    // 15-minute interval (900000) should NOT appear.
    expect(intervalDelays).not.toContain(900000);
  });
});
