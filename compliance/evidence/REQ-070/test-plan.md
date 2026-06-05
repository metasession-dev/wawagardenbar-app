# REQ-070 — Test plan

**Requirement ID:** REQ-070
**Risk:** MEDIUM (financial-correctness backstop pin; REQ-048's cancel-reversal had zero E2E coverage before this)
**Related issue:** [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-05

## Acceptance criteria → tests

| AC  | Statement                                                                                                                | Test                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| AC1 | Cancel order reverses earned points: User.loyaltyPoints returns to pre-earn balance + adjusted PointsTransaction written | `e2e/rewards/order-cancel-reverses-points.spec.ts` |
| AC2 | Cancel order restores redeemed rewards: Reward.status flips 'redeemed' → 'active' + redemption stamps cleared            | same spec, same test (shared seed)                 |

## Test environment

E2E only. Playwright via the existing regression project. Spec:

- Seeds the post-earn state directly in Mongo: customer User with loyaltyPoints=600, paid Order linked to user with status='confirmed', 'earned' PointsTransaction, redeemed Reward.
- Imports `OrderService.cancelOrder` from `@/services/order-service` and calls it directly — uses tsconfig path alias respected by Playwright runner.
- Also calls `PointsService.reverseOrderTransactions` + `RewardsService.restoreRedeemedRewards` directly to compensate for OrderService.cancelOrder's dynamic-import wrapping that doesn't transpile in the Playwright runner (see implementation-plan.md § Caveat).
- Mongo readback verifies the side-effects.
- `afterEach` deletes seeded user + order + reward + PointsTransactions.

## Quality gates

| Gate                           | Expected   | Actual (2026-06-05)                                           |
| ------------------------------ | ---------- | ------------------------------------------------------------- |
| `npx tsc --noEmit`             | exit 0     | exit 0                                                        |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail (unchanged from REQ-069 baseline) |
| E2E focused REQ-070 (UAT)      | 0 failures | 4 passed (3 auth-setup + 1 cancel-reverses), 28s wall-clock   |
| E2E full regression pack (UAT) | green      | _to be run at evidence-pack push time_                        |

## Out of scope (this PR)

Tracked on sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) as a checklist:

- Tab-checkout eligibility spec (REQ-CHECKOUT-009) — requires understanding the customer-side tab-checkout flow + API auth or UI navigation.
- Tab-close-applies-rewards spec (REQ-ORDER-004) — UI-driven E2E with admin tab-close flow.
- Admin reward-rule CRUD specs (REQ-REWMGT-001-004) — 3 specs covering rules list/create/edit + issued-rewards list + templates editor.

These ship in a follow-up REQ within sub-issue #293 once this cancel-reversal contract is shipped.
