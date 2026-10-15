# Release Ticket: REQ-109 — Remove Quick Actions from staff dashboard; give csr Admin Order Management parity

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-30
**Requirement ID:** REQ-109
**Risk Level:** HIGH
**Issue:** [#902](https://github.com/metasession-dev/wawagardenbar-app/issues/902)
**Implementation branch:** `feat/REQ-109-remove-quick-actions-csr-parity`

## Summary

`/dashboard/orders` rendered two sections — "Admin Order Management" and "Quick Actions" — visible to every staff role (`csr`, `admin`, `super-admin`), but almost every server action and several page-level route gates behind both sections were hard-restricted to `admin`/`super-admin` only. A `csr` user could see every button but every action rejected with "Unauthorized" or silently redirected them away.

This REQ removes "Quick Actions" entirely (it is not a staff concern; customers already order via `/menu` → `/checkout` with no tab-management UI, and tabs remain staff-managed) and widens `csr`'s access to match `admin`/`super-admin` everywhere "Admin Order Management" actually needs it — server actions, and the page-level route gates discovered during E2E verification. The `super-admin`-only override paths (`deleteTabAction`, `deleteOrderAction`) are explicitly untouched.

## AI contributors

| Tool        | Version  | Commits                                                                                         | Date       |
| ----------- | -------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | single commit on `feat/REQ-109-remove-quick-actions-csr-parity` (plan + implementation + tests) | 2026-09-30 |

## Implementation details

- `app/dashboard/orders/page.tsx` — "Quick Actions" section and its now-unused imports deleted.
- `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts` (10 functions), `app/actions/admin/order-management-actions.ts` (8 functions) — allowed-roles widened to include `csr`; `superAdminOverride` checks in `tab-actions.ts`/`order-management-actions.ts` left untouched.
- `app/dashboard/orders/tabs/[tabId]/page.tsx`, `.../checkout/page.tsx`, `app/dashboard/orders/inventory-summary/page.tsx`, `app/dashboard/orders/inventory-updates/page.tsx` — page-level role redirects widened to include `csr` (discovered via E2E failure, not the original plan — see implementation plan's Plan deviation section).
- `app/actions/inventory/snapshot-actions.ts` — 5 general-tier functions used by the Inventory Summary flow widened to `csr`; the separate `super-admin`-only approval-tier functions are untouched.
- `components/features/admin/tabs/create-tab-dialog.tsx` — deleted (fully orphaned once its only caller, Quick Actions, was removed).
- New SRS items `REQ-ORDMGT-018`, `REQ-TABMGT-010`; updated `REQ-ORDMGT-010`, `REQ-TABMGT-007` (drift correction). No ADR needed (role-guard edits only, no new pattern/dependency/service). Risk register: `R-034` (ACCEPTED — intentional `csr` privilege widening, compensating control is existing audit-log attribution), `R-035` (MITIGATED — override isolation + AC7 regression test).
- Tests: unit updates in `tab-actions.write-off.test.ts` and `order-management-actions.test.ts`; new e2e spec `e2e/critical/csr-order-tab-parity-req109.spec.ts`; `e2e/authenticated.spec.ts` updated; `e2e/critical/daily-report-payments.spec.ts` fixed (unrelated UI-dependency on the deleted Quick Actions dialog).

## Verification

- Unit: 1498 passed, 4 skipped (full suite).
- E2E: REQ-109-targeted specs 9/9 passed locally (disposable Mongo container). Full `--project=critical` run: 286 passed, 3 pre-existing unrelated flakes (confirmed via isolated reruns — see `test-execution-summary.md`).
- TypeScript/ESLint: 0 errors.
- npm audit: no new dependencies.
- Full detail: `compliance/evidence/REQ-109/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. HIGH-risk plan-approval checkpoint was passed at Phase 1 (see `compliance/plans/REQ-109/implementation-plan.md` § Sign-off); the operator reviews the PR + performs the portal UAT review before Production approval.
