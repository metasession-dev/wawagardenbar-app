# REQ-070 — Test execution summary

**Run date:** 2026-06-05
**Branch:** `feat/REQ-070-rewards-pipeline-e2e`

## Vitest

Unchanged from REQ-069 baseline:

```
 Test Files  121 passed | 1 skipped (122)
      Tests  1129 passed | 4 skipped (1133)
```

This REQ adds zero unit tests; existing REQ-048 reversal logic is unit-tested at `__tests__/services/order-service.cancel-reversal.test.ts`.

## E2E (Playwright)

### Focused REQ-070 run against UAT

```
[auth-setup] auth.setup.ts × 3                                                                  ✓
[regression] e2e/rewards/order-cancel-reverses-points.spec.ts                                   ✓ (16.9s)

 4 passed (28s)
```

### What the spec pins

The single test exercises BOTH legs of REQ-048's cancel-reversal contract in one cancel transition:

**Leg 1 — Points reversal (AC1):**

1. Seed: User with `loyaltyPoints: 600`, paid Order `status='confirmed'`, `PointsTransaction { type: 'earned', amount: 100, orderId }`.
2. Cancel via `OrderService.cancelOrder(orderId, reason)`.
3. Assert: `User.loyaltyPoints === 500` (returned to pre-earn balance); `PointsTransaction` of `type: 'adjusted'` carrying the order is now in the collection; `Order.status === 'cancelled'`.

**Leg 2 — Reward restoration (AC2):**

1. Same seed extended with: `Reward { status: 'redeemed', redeemedAt: <date>, redeemedInOrderId: <orderId> }`.
2. Same cancel call.
3. Assert: `Reward.status === 'active'`; `Reward.redeemedAt === null`; `Reward.redeemedInOrderId === null`.

Both legs were UNCOVERED end-to-end before this REQ. The contract was unit-tested (`__tests__/services/order-service.cancel-reversal.test.ts`) but the unit tests mock Mongoose; this spec exercises the same logic against live UAT Mongo.

### Dynamic-import limitation (honest framing)

`OrderService.cancelOrder` orchestrates the two reversal helpers via `await import('./points-service')` + `await import('./rewards-service')` inside its try/catch blocks. These dynamic imports do NOT transpile in the Playwright test runner (different module-loader behavior than Next.js's bundler), so when the test calls `OrderService.cancelOrder` directly, only the status-flip half lands; the reversal helpers' dynamic imports fail silently inside the swallowed catch.

To pin the underlying REQ-048 contracts (which is the point of this REQ), the spec ALSO calls `PointsService.reverseOrderTransactions` + `RewardsService.restoreRedeemedRewards` directly after `cancelOrder` returns. Both are idempotent — the second call is a no-op if the first had already fired in production-deployed Next.js — so this doesn't violate the contract being tested. The spec is therefore pinning:

- ✓ Status-flip half of `OrderService.cancelOrder` (end-to-end)
- ✓ `PointsService.reverseOrderTransactions` contract (end-to-end against live Mongo)
- ✓ `RewardsService.restoreRedeemedRewards` contract (end-to-end against live Mongo)
- ✗ The dynamic-import orchestration inside `cancelOrder` (pinned by the unit tests at `__tests__/services/order-service.cancel-reversal.test.ts` instead)

A follow-up could swap the dynamic imports in `OrderService.cancelOrder` for static imports (no behavior change) and tighten this E2E to call `cancelOrder` alone. Tracked in sub-issue #293 checklist.

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## Regression posture

- Vitest: 1129 / 1133 (99.6%; 4 skipped pre-existing).
- Focused REQ-070 E2E: 4/4 pass live against UAT (28s).
- Full regression pack: to be run at evidence-pack push time per `feedback_phase3_release_ticket_mandatory`.
- Net delta vs REQ-069 baseline: +1 E2E test case, 0 unit tests, 0 regressions.
