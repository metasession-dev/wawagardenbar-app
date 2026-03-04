export type RateLimitPreset = 'strict' | 'moderate' | 'relaxed';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

const PRESETS: Record<RateLimitPreset, RateLimitConfig> = {
  strict: { maxRequests: 5, windowMs: 60_000 },
  moderate: { maxRequests: 30, windowMs: 60_000 },
  relaxed: { maxRequests: 120, windowMs: 60_000 },
};

const store = new Map<string, RateLimitEntry>();

const MAX_STORE_SIZE = 10_000;

function pruneExpiredEntries(windowMs: number): void {
  if (store.size < MAX_STORE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart >= windowMs) {
      store.delete(key);
    }
  }
}

/**
 * Check and record a rate limit hit for the given identifier.
 * @param identifier - Unique key, typically `${ip}:${routeGroup}`
 * @param preset - Limit preset to apply
 */
export function checkRateLimit(
  identifier: string,
  preset: RateLimitPreset = 'relaxed'
): RateLimitResult {
  const config = PRESETS[preset];
  const now = Date.now();

  pruneExpiredEntries(config.windowMs);

  const entry = store.get(identifier);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      retryAfter: 0,
    };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil(
      (config.windowMs - (now - entry.windowStart)) / 1000
    );
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    retryAfter: 0,
  };
}

/**
 * Resolve the rate limit preset for a given pathname.
 */
export function resolvePreset(pathname: string): RateLimitPreset {
  if (pathname.startsWith('/api/auth/')) return 'strict';
  if (pathname.startsWith('/api/payment/')) return 'moderate';
  if (pathname.startsWith('/api/admin/')) return 'moderate';
  if (pathname.startsWith('/api/public/')) return 'moderate';
  if (pathname.startsWith('/api/rewards/')) return 'moderate';
  return 'relaxed';
}
