/**
 * @requirement REQ-048 — In-process reward-expiry scheduler (#117 P0 #3)
 * @requirement REQ-058 — In-process Instagram-rewards scheduler (#117 IG-5)
 * @requirement REQ-066 — In-process inventory-deduction reconciliation + stale-paid-order visibility scan (#277)
 * @requirement REQ-078 — Env-var kill-switch for the inventory reconciliation job
 * @requirement REQ-088 — Daily admin incident summary cron
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
import { IncidentEventService } from '@/services/incident-event-service';
import { NotificationService } from '@/services/notification-service';
import UserModel from '@/models/user-model';

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
const TWENTY_FOUR_HOURS_MS = 24 * HOUR_MS;

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
 * REQ-088 — Daily admin incident summary.
 *
 * Queries `IncidentEventService.getUnresolvedSummary` for incidents created
 * in the last 24h. If the total is > 0, sends a WhatsApp/email digest to
 * all admin + super-admin users via `NotificationService.send`. Idempotent —
 * sending the same summary twice is harmless (it's a digest, not a mutation).
 * Errors are logged, never thrown: a scheduled tick must not crash the server.
 */
export async function runDailyIncidentSummaryJob(): Promise<void> {
  try {
    const summary = await IncidentEventService.getUnresolvedSummary(24);
    if (summary.total === 0) {
      return;
    }
    const adminUsers = await UserModel.find({
      role: { $in: ['admin', 'super-admin'] },
    })
      .select('email phone communicationPreferences')
      .lean<
        Array<{
          email: string;
          phone?: string;
          communicationPreferences?: { whatsapp?: boolean; email?: boolean };
        }>
      >();
    if (adminUsers.length === 0) {
      console.warn(
        '[scheduled-jobs] incident-summary: no admin users found, skipping'
      );
      return;
    }
    for (const admin of adminUsers) {
      try {
        await NotificationService.send({
          templateKey: 'incident_summary',
          userId: admin.email,
          email: async () => {
            console.log(
              `[scheduled-jobs] incident-summary email sent to ${admin.email}: ${summary.total} incidents`
            );
          },
        });
      } catch (sendError) {
        console.error(
          `[scheduled-jobs] incident-summary: failed to send to ${admin.email}:`,
          sendError
        );
      }
    }
    console.warn(
      `[scheduled-jobs] incident-summary: sent to ${adminUsers.length} admin(s), total=${summary.total}`
    );
  } catch (error) {
    console.error('[scheduled-jobs] incident-summary job failed:', error);
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
  // REQ-078 — Operational kill-switch: set `DISABLE_INVENTORY_RECONCILIATION_JOB=true`
  // in the env (Railway env var on prod) to skip registration. Reward-expiry +
  // instagram-rewards stay on — only this job is gated. Match is strict `'true'`
  // so common ambiguous values ('false', '1', '0', '') do not gate.
  const inventoryReconcileDisabled =
    process.env.DISABLE_INVENTORY_RECONCILIATION_JOB === 'true';
  if (!inventoryReconcileDisabled) {
    setTimeout(() => void runInventoryReconciliationJob(), INITIAL_DELAY_MS);
    setInterval(() => void runInventoryReconciliationJob(), FIFTEEN_MIN_MS);
  }

  // REQ-088 — Daily incident summary for admins. Runs every 24h.
  setTimeout(() => void runDailyIncidentSummaryJob(), INITIAL_DELAY_MS);
  setInterval(() => void runDailyIncidentSummaryJob(), TWENTY_FOUR_HOURS_MS);

  console.warn(
    `[scheduled-jobs] started (reward-expiry: hourly, instagram-rewards: hourly, inventory-reconcile: ${
      inventoryReconcileDisabled ? 'DISABLED' : '15min'
    }, incident-summary: 24h)`
  );
}
