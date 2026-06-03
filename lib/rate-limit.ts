/**
 * @requirement REQ-065 — Self-service data export rate limit
 *
 * In-memory per-key rate limit: at most one allowed event per key per
 * window. Forward-compatible — a future REQ can swap the Map backing
 * store for Redis without changing the call signature.
 *
 * Not multi-process safe (each Next.js server instance has its own Map);
 * that's fine for v1 because the threat model is "stop a casual loop",
 * not "thwart a distributed attacker". A Redis-backed v2 fixes that day.
 */
const lastEventAt = new Map<string, number>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const last = lastEventAt.get(key);
  if (last && now - last < windowMs) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((windowMs - (now - last)) / 1000),
    };
  }
  lastEventAt.set(key, now);
  return { allowed: true, retryAfterSec: 0 };
}

/** Test-only — clear the in-memory state between cases. */
export function __resetRateLimitForTests(): void {
  lastEventAt.clear();
}
