# REQ-070 — Test scope

## In scope (this PR)

### E2E specs

- `e2e/rewards/order-cancel-reverses-points.spec.ts` — 1 test covering both legs of REQ-048's cancel-reversal contract: points reversal (AC1) + reward restoration (AC2). Mongo seed + service-layer call + Mongo readback against live UAT.

## SRS items covered

| SRS ID                                                                               | Covered by                           | Status                               |
| ------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------ |
| REQ-ORDMGT-005 (Cancel order reverses customer's points + restores redeemed rewards) | order-cancel-reverses-points.spec.ts | **Full** for both legs               |
| REQ-048 backstop pin (RELEASED 2026-05-28, previously zero E2E coverage)             | same spec                            | **Full** for both reversal contracts |

## Out of scope (deferred to follow-up cycles within #293)

| SRS / behavior                                        | Why deferred                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tab-checkout eligibility spec (REQ-CHECKOUT-009)**  | Requires either API auth (orders:write scope key) to hit `prepareTabForCheckout` or UI navigation through the customer tab flow. Customer-side flows currently block on PIN-auth provider mocks (sub-issue #294 V1 didn't address those — those are deferred too). |
| **Tab-close-applies-rewards spec (REQ-ORDER-004)**    | UI-driven E2E with the admin tab-close flow, requires admin tab fixtures + the eligible-rewards picker UI.                                                                                                                                                         |
| **Admin reward-rule CRUD specs (REQ-REWMGT-001-004)** | 3 specs covering rules list/create/edit + issued-rewards list + templates editor. UI-heavy. PR #135 was the original attempt — review for any reusable code before authoring fresh.                                                                                |

These ship in a follow-up REQ within sub-issue #293.

## Out of scope (umbrella tracker — not this sub-issue)

These belong to other sub-issues of [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291):

- Customer-PIN-flow E2E (REQ-AUTHC + REQ-PROFILE) → sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292).
- Payments + webhooks E2E → sub-issue [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (REQ-069 IN PROGRESS via PR #298).
- Socket.IO broadcasts → sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295).
- Admin destructive ops → sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296).
- API contracts + reports + audit → sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297).

## Manual UAT — none required

E2E spec runs end-to-end against live UAT Mongo via the Playwright runner. No human-driven manual validation step needed.
