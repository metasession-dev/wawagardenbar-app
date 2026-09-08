# Release Ticket: REQ-103 — Menu Management permission holders can save Edit All / Pricing Window

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-08
**Requirement ID:** REQ-103
**Risk Level:** HIGH
**Issue:** [#715](https://github.com/metasession-dev/wawagardenbar-app/issues/715)
**Implementation branch:** `feat/REQ-103-menu-permission-gate`

## Summary

Three save actions — "Edit All" bulk row save, the Pricing Window save, and the single-item Price Management save — hard-coded a stale `role !== 'super-admin'` check instead of the `menuManagement` permission the feature's own UI description already promises ("Manage menu items, categories, and pricing"). Admins granted `menuManagement` could open both pages (the page-level `requirePermission('menuManagement')` gate was already correct) but every save silently failed. Fixed via a single shared `hasSessionPermission()` helper reused across all three call sites, plus a new narrowly-scoped `updatePricingWindowsAction` that replaces the Pricing Window form's dependency on the generic super-admin-only `PUT /api/settings`.

Classified HIGH risk — authorization/RBAC gate change touching pricing (revenue-adjacent). The fix widens access correctly to permission-holders; the risk is implementing the widening incorrectly (over- or under-widening), directly guarded by explicit positive (AC1–AC4) and negative (AC5) test coverage.

## AI contributors

| Tool        | Version  | Commits                                                                                          | Date       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------ | ---------- |
| Claude Code | Sonnet 5 | 2 commits on `feat/REQ-103-menu-permission-gate` (plan/SRS/risk-register + implementation/tests) | 2026-09-08 |

## Implementation details

- `lib/auth-middleware.ts` — new non-redirecting `hasSessionPermission(session, permission)` helper for use inside server actions.
- `app/actions/admin/menu-actions.ts` — `updateMenuItemRowAction` gate replaced; new `updatePricingWindowsAction` added.
- `app/actions/admin/price-management-actions.ts` — `updateMenuItemPriceAction` gate replaced (same stale pattern, folded in per the issue's own "related tech debt" callout).
- `components/features/admin/pricing-windows-form.tsx` — calls `updatePricingWindowsAction` instead of `fetch('/api/settings', { method: 'PUT' })`.
- `app/api/settings/route.ts` PUT — deliberately left untouched (still `super-admin`-only; guards unrelated settings).
- `docs/SRS.md` — `REQ-MENUMGT-008`/`REQ-MENUMGT-009`/`REQ-MENUMGT-010` amended (drift correction — these items previously documented the bug as intended behaviour).
- No ADR — scoped parity fix reusing the existing permission model, no new pattern/dependency/service.
- `compliance/risk-register.md` — `R-028` (new, OPEN); `R-026` updated (actor pool widened, residual raised low → low-medium).
- Tests: `__tests__/lib/auth-middleware.has-session-permission.test.ts` (new), `__tests__/actions/admin/menu-actions.edit-all-row.test.ts` (extended), `__tests__/actions/admin/price-management-actions.test.ts` (new), `__tests__/actions/admin/pricing-windows-action.test.ts` (new) — 24 tests total. `e2e/admin/menu-edit-all.spec.ts` and `e2e/admin/pricing-windows.spec.ts` extended via the `e2e-test-engineer` skill (5 new tests).
- Also disables commitlint's `body-max-line-length`/`footer-max-line-length` rules (devaudit#775) — the mandatory `Sdlc-Implementer-Sentinel` commit trailer is a single-line JSON array that exceeds the 100-char limit and can't be wrapped.

## Verification

- Unit: 1436 passed, 4 skipped (full suite) — 24 new/changed tests for this REQ.
- E2E: 15/15 focused (both modified spec files, `--workers=1`); 91/91 scoped adjacent-regression (every area sharing code with this REQ's diff, plus RBAC smoke). Full 300+ spec local regression pack interrupted by an OOM kill from a concurrent, unrelated session on the shared dev machine (not attributable to this REQ — same pattern previously documented in REQ-102's nil incident report); CI's Quality Gates on a dedicated self-hosted runner is the authoritative full-regression gate.
- TypeScript/ESLint: 0 errors. SAST (Semgrep): not run locally (not installed in this dev environment; CI-provisioned) — relies on CI. No new dependencies; 13 pre-existing dependency-audit findings unrelated to this REQ.
- Full detail: `compliance/evidence/REQ-103/test-execution-summary.md`.

## Operator action required before/at deploy

None. No migration, no new environment variables, no new secrets.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. HIGH risk triggered the Phase 1 plan-approval checkpoint; the operator reviewed and approved the plan (issue #715 comment thread) before Phase 2 implementation began. The operator will review the PR + perform the portal UAT review before Production approval.
