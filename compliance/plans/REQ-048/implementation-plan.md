# REQ-048 — Rewards-ledger correctness bundle

- **Issue:** #155 (Ref: #117 P0 #2/#3/#4)
- **Risk:** MEDIUM
- **Commit type:** `fix`
- **Stage:** 1 (Plan) — awaiting plan approval before Stage 2

## Context

Three coupled silent gaps in the loyalty ledger, all customer-value-affecting, all small, sharing test infrastructure. Bundled per #117's own recommendation. Same defect class as the `trackByLocation` inventory bug (PR #115) and the cancellation inventory-restore (PR #113).

## Acceptance criteria

**#2 — Order cancellation reverses points + restores redeemed rewards** (`services/order-service.ts:409–450`)

- Cancelling an order where `pointsUsed > 0` **refunds** those points (balance restored, compensating `PointsTransaction` written).
- If the order had **earned** points (a `PointsTransaction{type:'earned', orderId}` exists), cancellation **claws them back** with a compensating transaction.
- Each reward in `appliedRewards` that is `redeemed` for this order reverts to `active`, clearing `redeemedAt` + `redeemedInOrderId`.
- Idempotent: a second cancellation attempt is a no-op (the existing status guard already throws on non-`pending`/`confirmed`); reversal never double-applies.
- A reversal failure is logged loudly and does not silently swallow value loss.

**#3 — Reward-expiry job actually runs** (`services/rewards-service.ts:472`)

- `expireOldRewards()` is invoked on a schedule in the running app; expired `active` rewards become `expired` and stop being redeemable.
- The job logs how many it expired; idempotent (re-running changes nothing once caught up).
- The scheduling mechanism is documented and is the **precedent IG-5 will reuse**.

**#4 — Tab-checkout eligible-rewards list** (`services/tab-service.ts:258`)

- `prepareTabForCheckout` returns the reward rules a customer is eligible for given the tab **subtotal** (wired to `RewardsService.getEligibleRules`), not `[]`.
- Empty when none apply; the returned shape is typed (`IRewardRule[]`, not `any[]`).

## Technical approach

**#2 — `OrderService.cancelOrder()`** — after the existing inventory-restore block, add a points/rewards reversal step that mirrors its resilience (try/catch, doesn't abort the cancel) but logs failures rather than swallowing them silently:

- Add `PointsService.reverseOrderTransactions(userId, orderId)` — finds the order's `earned`/`spent` `PointsTransaction`s and writes compensating `type:'adjusted'` entries (`+pointsUsed` refund for spent, `−earned` claw-back), `$inc`-ing `user.loyaltyPoints` and stamping `balanceAfter`. Reuses the `awardPoints`/`deductPoints` patterns at `services/points-service.ts:17–109`. No-op when no such transactions exist (handles the pending/confirmed-before-earn case).
- For `appliedRewards`: load each `Reward`; if `status==='redeemed' && redeemedInOrderId===orderId`, set `status='active'`, unset `redeemedAt`/`redeemedInOrderId` (`models/reward-model.ts:37–51`).

**#3 — scheduling** — the app runs a persistent custom Node server on Railway (`server.ts` via `tsx`, not serverless; `railway.toml`). Add `lib/scheduled-jobs.ts` exporting `startScheduledJobs()` (idempotent, module-level started-guard) and `runRewardExpiryJob()` (wraps `RewardsService.expireOldRewards()` with logging). Start it from `server.ts` after `server.listen` (next to the Mongo warmup). Default cadence hourly via `setInterval` — **zero new dependencies**. `lib/scheduled-jobs.ts` becomes the registry IG-5 extends with `processInstagramRewards`.

- _Decision (approved 2026-05-27):_ **`setInterval`** (zero-dep). Single-instance assumption noted; the job is idempotent so duplicate runs across instances are harmless.

**#4 — `TabService.prepareTabForCheckout()`** — replace the `eligibleRewards: any[] = []` TODO (`services/tab-service.ts:258`) with `await RewardsService.getEligibleRules(updatedTab.subtotal)` (`services/rewards-service.ts:27–55`); widen the return type to `IRewardRule[]`; import `RewardsService` + `IRewardRule`. (`getEligibleRules` is spend-gated, not user-specific — matches issue scope; per-user redemption-limit filtering is explicitly out of scope.)

## Security considerations

- No new auth/RBAC surface. Reversal is reachable only through existing `cancelOrder` callers; the **idempotency guard is the control** preventing repeated credits (value inflation).
- The expiry job runs **in-process** server-side — no external trigger endpoint, so no unauthenticated-trigger surface.
- Tab eligible-rewards is a read-only listing.

## Dependencies

- Internal: `PointsService`, `RewardsService`, `Reward` + `PointsTransaction` models. No external deps unless `node-cron` is chosen for #3.

## Test scope (MEDIUM → unit + integration; e2e for UI-facing path)

Vitest, fully mocked (`vi.mock`, no mongodb-memory-server) per `__tests__/services/tab-service.tip.test.ts`:

- **cancelOrder**: refunds `pointsUsed`; claws back earned; flips redeemed rewards → active; idempotent/guarded; reversal failure logged-not-fatal.
- **PointsService.reverseOrderTransactions**: compensating-entry correctness + no-op when none.
- **scheduled-jobs**: `runRewardExpiryJob()` calls `expireOldRewards()` and logs the count.
- **prepareTabForCheckout**: returns `getEligibleRules(subtotal)`; empty when none.
- **e2e: not applicable.** None of the three fixes introduces a user-visible surface — cancellation + expiry are server-side; tab `eligibleRewards` is exposed via the public tab API + `prepareTabForCheckoutAction` but **no component renders it yet** (verified by grep over `app/` + `components/`). Coverage stays at unit/integration. When a tab-checkout UI consumes `eligibleRewards`, add e2e via `e2e-test-engineer` then.

## Stage 2 outcome (2026-05-27)

12 new unit/integration tests across 4 files; full suite **846 passed / 0 failed** (4 pre-existing skips); `tsc --noEmit` clean; `eslint` 0 errors. Scheduler implemented as `setInterval` per approved decision.
