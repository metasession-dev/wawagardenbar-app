# Release Ticket: REQ-108 — Tab orders falsely auto-marked "paid as cash" on kitchen completion

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-21
**Requirement ID:** REQ-108
**Risk Level:** HIGH
**Issue:** [#815](https://github.com/metasession-dev/wawagardenbar-app/issues/815)
**Implementation branch:** `feat/req-108-tab-order-payment-guard`

## Summary

`updateOrderStatusAction`'s auto-cash-mark guard excludes tab-linked orders from being marked `paymentStatus: 'paid'` / `paymentMethod: 'cash'` on kitchen completion using `!order.tabId`. Two of the three tab-attach code paths (the public ordering API and the express/POS "add to tab" flow) never actually set `Order.tabId` — only `TabService.addOrderToTab`'s `tab.orders[]` push was reliable. This let the guard fail open: tab orders attached via those paths were falsely marked cash-paid on kitchen completion, corrupting revenue/cash-position reporting for tab-heavy days and potentially double-counting revenue when the tab was later closed and paid for real.

## AI contributors

| Tool        | Version  | Commits                                                                                 | Date       |
| ----------- | -------- | --------------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | single commit on `feat/req-108-tab-order-payment-guard` (plan + implementation + tests) | 2026-09-21 |

## Implementation details

- `services/tab-service.ts` — `TabService.addOrderToTab` (the single chokepoint every attach call site goes through) now sets `Order.tabId` on every attach via `OrderModel.updateOne`, instead of relying on each caller to set it separately.
- `app/actions/admin/order-management-actions.ts` — `updateOrderStatusAction`'s auto-cash-mark guard adds an independent `TabModel.exists({ orders: order._id })` membership check alongside `!order.tabId`, so the exclusion no longer rests on a single field staying in sync across two documents.
- `scripts/backfill-order-tabid.ts` — one-time migration: backfills missing/mismatched `Order.tabId` for existing tab-linked orders; separately reports (and, with `--revert-false-positives`, reverts) orders that show the auto-mark-cash fingerprint while genuinely tab-linked and their tab is still open/unpaid. Not run as part of this REQ — a separate operator action post-merge.
- New SRS item `REQ-ORDMGT-017`. No ADR needed (2-file fix, no new dependency/data tier). Risk register: `R-032` (MITIGATED — the bug itself), `R-033` (ACCEPTED — residual risk in the separately-run backfill script, mitigated by opt-in flag + narrow scoping + mandatory dry-run-first process).
- Tests: 4 new unit tests in `tab-service.add-order-tabid.test.ts`, 5 new unit tests in `order-management-actions.test.ts`; 1 new e2e test via `e2e-test-engineer` against the real express add-to-tab attach flow.

## Verification

- Unit: 1,494 passed, 4 skipped (full suite); 9 new tests total for this REQ.
- E2E: 1/1 passed locally (disposable Mongo container) — reproduces the historical bug against pre-fix code, passes with the fix.
- TypeScript/ESLint: 0 errors (12 pre-existing `no-console` warnings in the new CLI migration script, matching repo convention).
- npm audit: 16 pre-existing vulnerabilities (9 high) in the dependency tree, unrelated to this REQ — `package.json`/`package-lock.json` untouched by this diff.
- Full detail: `compliance/evidence/REQ-108/test-execution-summary.md`.

## Post-merge operator action

The backfill script (`scripts/backfill-order-tabid.ts`) is written but not run as part of this release. Operator should run it with `--dry-run` first against production data, review the false-positive candidate report, then run for real (and separately with `--revert-false-positives` if any eligible candidates are found) — see the script's header comment for full usage.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. HIGH risk plan-approval checkpoint was passed at Phase 1 (see `compliance/plans/REQ-108/implementation-plan.md` § Sign-off, approved 2026-09-21); the operator reviews the PR + performs the portal UAT review before Production approval.
