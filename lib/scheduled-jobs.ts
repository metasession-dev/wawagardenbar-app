/**
 * @requirement REQ-048 — In-process reward-expiry scheduler (#117 P0 #3)
 * @requirement REQ-058 — In-process Instagram-rewards scheduler (#117 IG-5)
 * @requirement REQ-066 — In-process inventory-deduction reconciliation + stale-paid-order visibility scan (#277)
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
import InventoryService from '@/services/inventory-service';
import { OrderService } from '@/services/order-service';

/**
 * REQ-066 — Hours a paid order may sit outside completed/cancelled before
 * the visibility scan flags it as a stale-paid-order IncidentEvent. Hard-
 * coded for v1 — a future REQ can promote this to a SystemSettings field
 * if operations needs to tune it without a redeploy.
 */
const STALE_PAID_ORDER_THRESHOLD_HOURS = 2;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const FIFTEEN_MIN_MS = 15 * MINUTE_MS;
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
 * REQ-066 — Reconciliation + stale-paid-order visibility scan.
 *
 * Two passes per tick, BOTH read-only with respect to Order.status (the
 * operator's rule: only kitchen-display staff may complete an order).
 *
 *   1. `reconcileMissedDeductions` — retry deduction for orders the
 *      kitchen-completion chokepoint marked completed but for which the
 *      deduction threw. Writes IncidentEvent on persistent failure.
 *   2. `scanStalePaidOrders` — find paid orders sitting outside
 *      completed/cancelled longer than the configured threshold; log
 *      `stale_paid_order` IncidentEvents (deduped per 24h window).
 */
export async function runInventoryReconciliationJob(): Promise<void> {
  try {
    const recon = await InventoryService.reconcileMissedDeductions();
    if (recon.attempted > 0) {
      console.warn(
        `[scheduled-jobs] inventory-reconcile: attempted=${recon.attempted} succeeded=${recon.succeeded} failed=${recon.failed}`
      );
    }
  } catch (error) {
    console.error('[scheduled-jobs] inventory-reconcile job failed:', error);
  }

  try {
    const scan = await OrderService.scanStalePaidOrders({
      thresholdHours: STALE_PAID_ORDER_THRESHOLD_HOURS,
    });
    if (scan.flagged > 0) {
      console.warn(
        `[scheduled-jobs] stale-paid-order scan: scanned=${scan.scanned} flagged=${scan.flagged} skippedAsDup=${scan.skippedAsDup} threshold=${STALE_PAID_ORDER_THRESHOLD_HOURS}h`
      );
    }
  } catch (error) {
    console.error('[scheduled-jobs] stale-paid-order scan failed:', error);
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

  // REQ-066 — Inventory reconciliation + stale-paid-order scan, every 15 min.
  setTimeout(() => void runInventoryReconciliationJob(), INITIAL_DELAY_MS);
  setInterval(() => void runInventoryReconciliationJob(), FIFTEEN_MIN_MS);

  console.warn(
    '[scheduled-jobs] started (reward-expiry: hourly, instagram-rewards: hourly, inventory-reconcile: 15min)'
  );
}
