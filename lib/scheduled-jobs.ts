/**
 * @requirement REQ-048 — In-process reward-expiry scheduler (#117 P0 #3)
 * @requirement REQ-058 — In-process Instagram-rewards scheduler (#117 IG-5)
 *
 * In-process scheduled jobs for the persistent Railway server. The app runs as
 * a long-lived custom Node server (`server.ts`), not serverless, so a simple
 * in-process scheduler is the lightest mechanism — no external cron service,
 * no new dependency. This module is the registry future scheduled jobs hook
 * into.
 *
 * Single-instance assumption: if multiple Railway replicas run, each runs these
 * jobs — so every job here MUST be idempotent and duplicate runs harmless.
 * Today: Railway runs one replica. If we scale to N>1, a future REQ should
 * add leader election (per-instance lock in Mongo, or a dedicated cron service).
 */
import { RewardsService } from '@/services/rewards-service';
import { InstagramService } from '@/services/instagram-service';

const HOUR_MS = 60 * 60 * 1000;
const INITIAL_DELAY_MS = 60 * 1000;

let started = false;

/**
 * Expire rewards whose `expiresAt` has passed. Idempotent — only flips
 * `active` → `expired`, so repeated runs are no-ops once caught up. Errors are
 * logged, never thrown: a scheduled tick must not crash the server.
 */
export async function runRewardExpiryJob(): Promise<number> {
  try {
    const expired = await RewardsService.expireOldRewards();
    if (expired > 0) {
      console.warn(
        `[scheduled-jobs] reward-expiry: expired ${expired} reward(s)`
      );
    }
    return expired;
  } catch (error) {
    console.error('[scheduled-jobs] reward-expiry job failed:', error);
    return 0;
  }
}

/**
 * Process Instagram-campaign post credits and award points to matching
 * customers. Wraps `InstagramService.processInstagramRewards` with the same
 * error-swallowing posture as `runRewardExpiryJob`: a failure must not crash
 * the server tick. Idempotent — `InstagramService.processRule` dedupes posts
 * via `hasProcessedPost(mediaId)` against the `PointsTransaction` description
 * field. IG-4 will replace that naive dedup with a proper `InstagramPostCredit`
 * model. REQ-058 (#117 IG-5).
 */
export async function runInstagramRewardsJob(): Promise<void> {
  try {
    await InstagramService.processInstagramRewards();
  } catch (error) {
    console.error('[scheduled-jobs] instagram-rewards job failed:', error);
  }
}

/**
 * Start all in-process scheduled jobs. Idempotent: guarded so repeated calls
 * (or dev hot-reloads) don't stack intervals.
 */
export function startScheduledJobs(): void {
  if (started) {
    return;
  }
  started = true;

  // Reward expiry — a catch-up run shortly after boot, then hourly. (#117 P0 #3)
  setTimeout(() => void runRewardExpiryJob(), INITIAL_DELAY_MS);
  setInterval(() => void runRewardExpiryJob(), HOUR_MS);

  // Instagram rewards — a catch-up run shortly after boot, then hourly.
  // (#117 IG-5; REQ-058). Hourly cadence is conservative against the
  // ~200 calls/hour Graph API rate limit and well within the 24h `mentioned_media`
  // window.
  setTimeout(() => void runInstagramRewardsJob(), INITIAL_DELAY_MS);
  setInterval(() => void runInstagramRewardsJob(), HOUR_MS);

  console.warn(
    '[scheduled-jobs] started (reward-expiry: hourly, instagram-rewards: hourly)'
  );
}
