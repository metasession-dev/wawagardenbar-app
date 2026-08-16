# Release Ticket: REQ-099 — Tabs Management list distinguishes written-off tabs from paid ones

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-08-16
**Requirement ID:** REQ-099
**Risk Level:** MEDIUM
**Issue:** [#657](https://github.com/metasession-dev/wawagardenbar-app/issues/657)
**Implementation branch:** `feat/REQ-099-tabs-list-written-off`

## Summary

REQ-098 gave written-off tabs a `paymentStatus: 'written-off'` value and made the daily report and the tab detail page correctly distinguish them from genuinely-paid tabs. The Tabs Management **list view** was missed — a written-off tab rendered the same generic "closed" badge and "Tab Paid" button as a genuinely-paid closed tab, reproducing the exact misleading signal REQ-098 fixed elsewhere. This REQ adds a distinct "Written off" badge (no "Tab Paid" button) to the list, plus a "Written off" filter checkbox independent of the existing status checkboxes so admins can isolate write-offs directly instead of checking "Closed" and eyeballing.

## AI contributors

| Tool        | Version  | Commits                                   | Date       |
| ----------- | -------- | ----------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `9d89632` (plan + implementation + tests) | 2026-08-16 |

## Implementation details

- `services/tab-service.ts` — `TabService.listAllTabsWithFilters` gains a `writtenOffOnly` filter: additive (`$or`) with any selected `status` checkboxes, not exclusive — isolates `paymentStatus: 'written-off'` tabs regardless of which status boxes are checked.
- `app/actions/tabs/tab-actions.ts` — `getDashboardFilteredTabsAction` passes `writtenOffOnly` through.
- `components/features/admin/tabs/dashboard-tabs-filter.tsx` — new "Written off" checkbox, independent of the `TAB_STATUSES` checkbox group; persists to the existing localStorage filter.
- `components/features/admin/tabs/dashboard-tabs-list-client.tsx` — `getTabBadge()` renders a distinct "Written off" badge (destructive variant, `FileX` icon) ahead of the generic status badge; the "Tab Paid" action button is suppressed for `paymentStatus === 'written-off'` tabs.
- `docs/SRS.md` — `REQ-TABMGT-009` (new); `REQ-TABMGT-001` updated (drift resolved — status-checkbox filtering unchanged when the new filter isn't used).
- No ADR needed (additive UI + query change on REQ-098/ADR-003's existing data model).
- No new risk-register entries (`@risk-deferred` — reuses REQ-098's already-mitigated RISK-019 through RISK-022 posture).
- Tests: 3 new unit tests in `__tests__/services/tab-service.pagination.test.ts`; `e2e/orders/tabs-list-written-off-badge-filter.spec.ts` (AC1 + AC2).

## Verification

- Unit: 1,381 passed, 4 skipped (full suite), 3 new for this REQ.
- E2E: 1/1 targeted, run locally against a real dev server + MongoDB, verified 3× (standalone, alongside 2 adjacent tab specs, and under `--workers=1`). A full 89-spec local regression pack hit widespread pre-existing environment instability unrelated to this REQ (same pattern as REQ-098's accepted skip) — see `compliance/evidence/REQ-099/test-execution-summary.md`.
- TypeScript/ESLint: 0 errors.
- npm audit: pre-existing accepted exceptions only, no new findings.
- Full detail: `compliance/evidence/REQ-099/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause); the operator reviews the PR + performs the portal UAT review before Production approval.
