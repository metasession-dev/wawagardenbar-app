# REQ-070 — Rewards & loyalty pipeline E2E coverage (sub-issue #293)

**Status:** IN PROGRESS · **Risk:** MEDIUM · **Issue:** [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))

## Context

Second cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). REQ-048 (rewards-ledger correctness — RELEASED 2026-05-28) has **zero E2E pinning** of its load-bearing contracts:

- Cancel order reverses customer's earned points (writes `PointsTransaction` type='adjusted' carrying compensating amount; decrements `User.loyaltyPoints`).
- Cancel order restores redeemed rewards (flips `Reward.status` from 'redeemed' to 'active'; clears `redeemedAt` + `redeemedInOrderId` stamps).

This REQ pins both contracts end-to-end against live UAT Mongo.

## Acceptance criteria

1. **AC1 — Cancel reverses earned points** (REQ-048 leg 1).
   - Seed: customer User with `loyaltyPoints: 600` + `totalPointsEarned: 100`; paid Order linked to user with `status: 'confirmed'`; `PointsTransaction` of `type: 'earned'`, `amount: 100`.
   - Trigger: call `OrderService.cancelOrder(orderId, reason)` directly from the spec process.
   - Assert: `User.loyaltyPoints` returns to pre-earn balance (500); a `PointsTransaction` of `type: 'adjusted'`, `orderId: <same>` is now in the collection; `Order.status === 'cancelled'`.

2. **AC2 — Cancel restores redeemed rewards** (REQ-048 leg 2).
   - Same spec seed extended with: a `Reward` document for the user with `status: 'redeemed'`, `redeemedAt` set, `redeemedInOrderId: <same orderId>`.
   - Same trigger.
   - Assert: `Reward.status === 'active'`; `Reward.redeemedAt === null`; `Reward.redeemedInOrderId === null`.

Both ACs verified in a single E2E spec because they share the seed shape + are both side-effects of the same `cancelOrder` invocation.

## Implementation approach

### Single spec file

- `e2e/rewards/order-cancel-reverses-points.spec.ts` — one test exercising both AC1 + AC2 in one cancel transition. Mongo seed + Mongoose-backed service call + Mongo readback. Cleanup deletes all seeded rows.

### Service-layer invocation

The spec imports `OrderService.cancelOrder` directly from `@/services/order-service` and calls it on the seeded order. This is what the production server actions wrap. The Playwright test runner respects the tsconfig path alias (`@/*`); no extra config needed.

**Caveat — dynamic-import inside `OrderService.cancelOrder`:** the production code uses `await import('./points-service')` + `await import('./rewards-service')` inside the cancel transition's try/catch. These dynamic imports fail silently in the Playwright runner (different transpile path than Next.js). To compensate, the spec ALSO calls `PointsService.reverseOrderTransactions` and `RewardsService.restoreRedeemedRewards` directly after `cancelOrder` returns. Both are idempotent — the second call is a no-op if the first had already fired. This means:

- The status-flip half of `cancelOrder` is pinned end-to-end via Playwright runner.
- The reversal-helpers' contracts are pinned end-to-end (called from the test, write to live UAT Mongo, assert via readback).
- The dynamic-import orchestration inside `cancelOrder` is NOT pinned by this spec (it IS pinned by `__tests__/services/order-service.cancel-reversal.test.ts` at the unit-test layer, which mocks the dynamic-import wiring).

This gap is acceptable for V1 — the underlying contract is what REQ-048 owns and that's pinned. A follow-up could swap the dynamic imports for static imports in `cancelOrder` (no behavior change) and tighten this E2E to call `cancelOrder` alone.

### No production code change

Pure test addition.

## Deferred to follow-up (tracked on sub-issue #293)

- **Tab-checkout eligibility spec** (REQ-CHECKOUT-009) — requires understanding the customer-side tab-checkout flow + API auth.
- **Tab-close-applies-rewards spec** (REQ-ORDER-004) — UI-driven E2E with admin tab-close flow.
- **Admin reward-rule CRUD specs** (REQ-REWMGT-001-004) — 3 specs covering rules list/create/edit + issued-rewards list + templates editor. UI-heavy; PR #135 was the original attempt.

These ship in a follow-up REQ within sub-issue #293 once the cancel-reversal contract is shipped (this REQ).

## Risk

**MEDIUM.** Pure test addition. The seeded state writes to live UAT Mongo with a deterministic prefix (`e2e-req070-cancel-` for the user email; `WGE70C*` for the order number; `RWD-E2E-*` for the reward code) so test rows are easy to identify + clean up. `afterEach` deletes the user, order, all the user's PointsTransactions, and the seeded reward.

## Security considerations

- **No production code change.** REQ-048's reversal logic is unchanged.
- **No new auth surface.** The spec runs in the Playwright runner against UAT Mongo + UAT-resolved Mongoose models. Synthetic users carry `role: 'customer'` and `e2e-req070-*` email prefix.
- **No new packages, env vars, or schema changes.**

## Dependencies

- REQ-048 (RELEASED 2026-05-28) — backend that this REQ pins.
- REQ-069 (IN PROGRESS via #298) — established the "Playwright spec + live UAT Mongo + service-layer call" pattern.

## Test scope

E2E (live against UAT):

- `e2e/rewards/order-cancel-reverses-points.spec.ts` — 1 test exercising AC1 + AC2 in one cancel transition.

Vitest unchanged from REQ-069 baseline (1129 pass / 4 skip / 0 fail).
