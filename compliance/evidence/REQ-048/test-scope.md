# Test Scope — REQ-048

**Requirement:** REQ-048 — Rewards-ledger correctness bundle (#117 P0 #2/#3/#4)
**Risk Level:** MEDIUM
**GitHub Issue:** [#155](https://github.com/metasession-dev/wawagardenbar-app/issues/155)
**Date:** 2026-05-28

## What changed

Three coupled silent gaps in the loyalty ledger (same defect class as the `trackByLocation` inventory bug PR #115 and the cancellation inventory restore PR #113):

1. **Order cancellation reverses points + restores redeemed rewards** — `OrderService.cancelOrder` (`services/order-service.ts`) now invokes the new `PointsService.reverseOrderTransactions` (a single compensating `adjusted` `PointsTransaction` linked to the cancelled order, idempotent on the order's existing reversal) and `RewardsService.restoreRedeemedRewards` (flips `redeemed→active` for any reward `redeemedInOrderId === cancelled order`).
2. **Reward-expiry job runs on a schedule** — `RewardsService.expireOldRewards()` had no caller. New `lib/scheduled-jobs.ts` (`setInterval`, hourly + boot catch-up) started from `server.ts` after `listen`. Zero new dependencies; the app is a persistent custom-Node server on Railway, not serverless. This is the in-process scheduler precedent #117 IG-5 will reuse.
3. **Tab-checkout eligible-rewards list** — `TabService.prepareTabForCheckout` returned `eligibleRewards: []` (TODO). Now `await RewardsService.getEligibleRules(updatedTab.subtotal)`, typed `IRewardRule[]`.

## In scope (regression / new coverage)

- **`PointsService.reverseOrderTransactions`** — compensating-entry correctness (refund spent + claw back earned in a single adjusted txn); idempotency (no-op when a prior reversal exists); no-op when order has no points movements.
- **`OrderService.cancelOrder`** — invokes the reversal and reward-restore on cancel; idempotent (status guard already throws on non-pending/confirmed); reversal failure logged-not-fatal (cancel still completes, value-loss is noisy); guest orders (no `userId`) skip points reversal but still restore rewards.
- **`lib/scheduled-jobs.ts`** — `runRewardExpiryJob` calls `expireOldRewards` and returns the count; errors swallowed-with-log (a tick must not crash the server); `startScheduledJobs` registers the interval exactly once (idempotent across repeated calls / dev hot-reloads).
- **`TabService.prepareTabForCheckout`** — returns the rules from `getEligibleRules(subtotal)`; empty list when nothing applies; arg is `tab.subtotal` (not `total` — pre-tip).

## Out of scope

- **E2E coverage** — none of the three fixes introduces a user-visible surface. Cancellation + expiry are server-side; the tab `eligibleRewards` field flows through the public tab API (`app/api/public/tabs/[tabId]/route.ts`) and `prepareTabForCheckoutAction` but **no component currently renders it** (grep over `app/` + `components/`). Coverage stays at unit/integration per MEDIUM risk class. When a tab-checkout UI consumes `eligibleRewards`, e2e coverage is added then.
- **Per-user redemption-limit filtering** in tab eligibility — `getEligibleRules` is spend-gated by design; user-specific filtering happens downstream in `calculateReward()`. Out of REQ-048 scope.
- **WhatsApp `reward_expiring_soon` notifications** — paired with WA-1 in #117, not REQ-048.
- **Webhook idempotency** (P0 #1) and **comms-prefs enforcement** (P0 #5) — separate items.
