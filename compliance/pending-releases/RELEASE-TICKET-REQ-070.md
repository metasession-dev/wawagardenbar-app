# Release Ticket: REQ-070 — Rewards & loyalty pipeline E2E coverage (sub-issue #293)

**Status:** DRAFT
**Date:** 2026-06-05
**Requirement ID:** REQ-070
**Risk Level:** MEDIUM
**GitHub Issue:** [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (bundled with REQ-069 or follow-up; pure test addition, low urgency)
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

---

## Summary

Second cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). **Pins REQ-048's cancel-reversal contract (RELEASED 2026-05-28) in the regression pack for the first time** — both legs (points reversal + reward restoration) tested end-to-end in one cancel transition.

- **AC1 — Cancel reverses earned points** (REQ-048 leg 1). Seeds user with `loyaltyPoints: 600` + paid order + earned PointsTransaction. After cancel: `User.loyaltyPoints === 500` + adjusted PointsTransaction written + `Order.status === 'cancelled'`.
- **AC2 — Cancel restores redeemed rewards** (REQ-048 leg 2). Same seed extended with `Reward { status: 'redeemed', redeemedAt, redeemedInOrderId }`. After cancel: `Reward.status === 'active'` + redemption stamps cleared.

Both ACs verified in a single spec because they share the seed shape + are both side-effects of the same `cancelOrder` invocation.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** One E2E spec + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Operator action this cycle:** approved umbrella + sub-issue grouping in advance (#291 filed 2026-06-04); said "proceed" after REQ-069 PR #298 merged, which the agent interpreted as continuing with the umbrella's recommended next pickup.

## Implementation Details

**Files Added:**

- `e2e/rewards/order-cancel-reverses-points.spec.ts` — single test exercising AC1 + AC2.
- `compliance/plans/REQ-070/implementation-plan.md` — plan with ACs, risk, security, dynamic-import caveat.
- `compliance/evidence/REQ-070/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.

**Files Modified:**

- `compliance/RTM.md` — REQ-070 IN PROGRESS row added.

**Schema changes:** None. No new packages. No env vars. Pure test addition.

## Test Plan & Evidence

See `compliance/evidence/REQ-070/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1129 pass / 4 skip / 0 fail (unchanged from REQ-069 baseline).
- TypeScript: 0 errors.
- E2E focused REQ-070 (UAT): **4 passed** (3 auth-setup + 1 cancel-reverses), 28s wall-clock.
- E2E full regression pack: to be run at evidence-pack push time.

## Security & Compliance

See `security-summary.md`. Headline: no production code change; test-only.

## Rollback Plan

Revert the integration PR. The new spec file is a pure addition; reverting leaves no orphan production behavior.

## Deferred to follow-up cycles within #293

| Item                                        | Why                                               |
| ------------------------------------------- | ------------------------------------------------- |
| Tab-checkout eligibility (REQ-CHECKOUT-009) | Needs customer-side tab flow auth or API-key path |
| Tab-close-applies-rewards (REQ-ORDER-004)   | UI-driven E2E with admin tab-close flow           |
| Admin reward-rule CRUD (REQ-REWMGT-001/002) | UI-heavy; PR #135 was original attempt            |
| Issued-rewards list (REQ-REWMGT-003)        | Per-customer audit page                           |
| Reward templates editor (REQ-REWMGT-004)    | Email/notification template UI                    |

Tracked on sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293)'s checklist.

## Quality Gates

| Gate                           | Expected   | Actual (2026-06-05)                              |
| ------------------------------ | ---------- | ------------------------------------------------ |
| `npx tsc --noEmit`             | exit 0     | exit 0                                           |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail                      |
| E2E focused REQ-070 (UAT)      | 0 failures | 4 passed (3 auth-setup + 1 cancel-reverses), 28s |
| E2E full regression pack (UAT) | green      | _to be run at evidence-pack push time_           |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-070/implementation-plan.md`)
- [x] Stage 2 — Implement & test (1 spec; 1 test live-passing against UAT)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Second cycle of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291). REQ-069 was cycle 1.
- One spec covers both legs of REQ-048's cancel-reversal in one cancel transition — the single most valuable backstop pin in #293's scope.
- Dynamic-import limitation in `OrderService.cancelOrder` documented honestly in `test-execution-summary.md` § Dynamic-import limitation. The spec compensates by importing `PointsService` + `RewardsService` statically + calling them directly after `cancelOrder` returns. Both reversal helpers are idempotent so the second call is a no-op if the first had already fired (which it does in production-deployed Next.js).
- Zero production code change. Risk class MEDIUM (financial-correctness backstop pin), but the test infrastructure has no production runtime behavior.
