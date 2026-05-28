# Test Plan — REQ-048

**Requirement:** REQ-048 — Rewards-ledger correctness bundle (#117 P0 #2/#3/#4)
**Risk Level:** MEDIUM → unit + integration (e2e n/a per `test-scope.md` — no UI surface)
**Date:** 2026-05-28

## Approach

Vitest, fully mocked per the existing `__tests__/services/*.test.ts` convention (no `mongodb-memory-server`; `vi.mock()` for models + services). 12 new test cases across 4 files; full suite remains green (846 pass / 0 fail / 4 pre-existing skips).

## Cases

### 1. `PointsService.reverseOrderTransactions` — `__tests__/services/points-service.reverse-order.test.ts`

- **refunds spent + claws back earned** in a single compensating `adjusted` transaction. Mocks an order with `earned +50` + `spent -200`; asserts the user `$inc` is `{ loyaltyPoints: +150, totalPointsEarned: -50, totalPointsSpent: -200 }` and the created txn has `type:'adjusted'`, `amount:150`, `orderId` set.
- **idempotency** — when a prior `adjusted` txn carrying `orderId` exists, returns `null`, makes no balance change, writes no new txn.
- **no-op when order has no points movements** — empty `find` result returns `null`, no balance update.

### 2. `OrderService.cancelOrder` reversal — `__tests__/services/order-service.cancel-reversal.test.ts`

- **happy path** — cancelling a `confirmed` order with `userId` calls `PointsService.reverseOrderTransactions(userId, orderId)` and `RewardsService.restoreRedeemedRewards(orderId)`; order moves to `cancelled`.
- **status guard** — cancelling an order past pending/confirmed (e.g. `completed`) throws `cannot be cancelled`; no reversal invoked.
- **reversal failure logged-not-fatal** — when `PointsService.reverseOrderTransactions` rejects, cancel still resolves (returns the order object), `console.error` is invoked, rewards-restore still runs.
- **guest order** — `userId === undefined` skips points reversal but still invokes rewards-restore.

### 3. `lib/scheduled-jobs.ts` — `__tests__/lib/scheduled-jobs.test.ts`

- **`runRewardExpiryJob`** calls `RewardsService.expireOldRewards()` and returns the count.
- **`runRewardExpiryJob` swallows errors** — when `expireOldRewards` rejects, returns 0, logs via `console.error`; the scheduled tick never throws.
- **`startScheduledJobs` is idempotent** — calling twice registers `setInterval` exactly once (verified via `vi.spyOn(global, 'setInterval')` under fake timers).

### 4. `TabService.prepareTabForCheckout` eligible rewards — `__tests__/services/tab-service.eligible-rewards.test.ts`

- **returns rules for tab subtotal** — primed lean tab with `subtotal: 5000` + a mocked `getEligibleRules` returning one rule; asserts `getEligibleRules` was called with `5000` and the result is returned typed.
- **empty list when no rules apply** — `getEligibleRules` returns `[]`, propagates as `eligibleRewards: []`.

## Gates run

- `npx tsc --noEmit` — must exit 0
- `npx vitest run` — all green, including the 12 new cases above
- `npx eslint <changed-files>` — 0 errors (warnings on pre-existing `console.log` in `server.ts` / `tab-service.ts` are unchanged and accepted)
- `npm audit --audit-level=high` — 0 high/critical
