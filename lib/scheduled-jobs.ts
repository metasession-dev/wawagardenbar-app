/**
 * In-process scheduled jobs for the persistent Railway server (REQ-048 / #117 P0 #3).
 *
 * The app runs as a long-lived custom Node server (`server.ts`), not serverless,
 * so a simple in-process scheduler is the lightest mechanism — no external cron
 * service, no new dependency. This module is the registry future scheduled jobs
 * hook into (e.g. the Instagram campaign poller, #117 IG-5).
 *
 * Single-instance assumption: if multiple Railway replicas run, each runs these
 * jobs — so every job here MUST be idempotent and duplicate runs harmless.
 */
import { RewardsService } from '@/services/rewards-service';

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

  console.warn('[scheduled-jobs] started (reward-expiry: hourly)');
}
