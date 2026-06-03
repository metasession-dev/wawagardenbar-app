/**
 * @requirement REQ-065 — Rate-limit utility for data export
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, __resetRateLimitForTests } from '@/lib/rate-limit';

beforeEach(() => __resetRateLimitForTests());

describe('REQ-065 checkRateLimit', () => {
  it('AC2 — first call for a key is allowed', () => {
    const r = checkRateLimit('user-1', 60_000, 1_000);
    expect(r.allowed).toBe(true);
    expect(r.retryAfterSec).toBe(0);
  });

  it('AC2 — second call within window is blocked with retryAfter', () => {
    checkRateLimit('user-1', 60_000, 1_000);
    const r = checkRateLimit('user-1', 60_000, 10_000);
    expect(r.allowed).toBe(false);
    // 60s window, 9s elapsed → 51s remaining.
    expect(r.retryAfterSec).toBe(51);
  });

  it('AC2 — call after window elapsed is allowed again', () => {
    checkRateLimit('user-1', 60_000, 1_000);
    const r = checkRateLimit('user-1', 60_000, 62_000);
    expect(r.allowed).toBe(true);
  });

  it('AC2 — different keys are independent', () => {
    checkRateLimit('user-1', 60_000, 1_000);
    const r = checkRateLimit('user-2', 60_000, 1_000);
    expect(r.allowed).toBe(true);
  });
});
