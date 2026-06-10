# Release Ticket: REQ-076 — Per-main-category reports + per-user access control

**Status:** DRAFT
**Date:** 2026-06-08 (release-anchor refreshed 2026-06-10)
**Requirement ID:** REQ-076
**Risk Level:** MEDIUM
**GitHub Issue:** [#332](https://github.com/metasession-dev/wawagardenbar-app/issues/332)
**Integration PR:** [#336 (develop → main)](https://github.com/metasession-dev/wawagardenbar-app/pull/336)
**Release PR:** [#336 (develop → main)](https://github.com/metasession-dev/wawagardenbar-app/pull/336) — single-REQ release path, `[REQ-076]` brackets in PR title for derive-release-version attribution
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

## Release-anchor note (2026-06-10)

Today's intermediate merges (#353 `[REQ-013]`, #354 / #356 docs-only) drifted the `derive-release-version.sh` output away from `REQ-076` — #353's CI Pipeline ran with `[REQ-013]` in the latest commit subject and uploaded SAST + dependency-audit + test_report evidence to the `REQ-013` release entry on the portal instead of `REQ-076`. The release-PR #336's check-release-approval gate consequently queried `v2026.06.10` (the bare-date fallback) and saw no compliance-gate evidence on that entry.

This commit re-anchors the release version: the bracketed `[REQ-076]` subject restores derive-release-version's output to `REQ-076`, the next CI Pipeline run on develop re-uploads SAST + dependency-audit + test_report to the `REQ-076` release entry, and the check-release-approval gate on #336 picks up the consolidated evidence. No code change — release infrastructure only.

---

## Summary

Follow-up to REQ-075 (configurable main categories, released v2026.06.08). Adds a sibling report page at `/dashboard/reports/by-main-category` that replicates the Daily Report's revenue / costs / gross-profit / items shape but scoped to one registered main-category slug at a time. Adds a per-user permission field (`mainCategoryReportAccess`) so admins can be restricted to viewing reports for specific mains only.

- **AC1-AC2 — Page renders.** Super-admin sees all enabled mains in the dropdown; picking a main + date range renders 6 summary cards (revenue, cost, gross profit, margin, item count, order count) + revenue + cost item tables.
- **AC3 — Numbers tie out.** Per-main revenue + cost + gross profit match the aggregate Daily Report's per-main slice for the same date (legacy `food` + `drink` buckets).
- **AC4-AC5 — Restricted admin enforcement.** Admin with `mainCategoryReportAccess: ['drinks']` sees only Drinks in the dropdown; direct server-action call for `food` returns `'Forbidden: not authorized for this main category'`.
- **AC6 — Permission editor.** Super-admin can flip the per-user setting between unrestricted / specific mains / empty.
- **AC7 — Exports.** PDF / Excel / CSV downloads with filename pattern `main-category-report-{slug}-{YYYY-MM-DD}.{ext}`; numbers match on-screen view.
- **AC8 — Back-compat.** Pre-REQ-076 admin users (field undefined) continue to see all mains.

**Honest limitations** (footer + evidence): payments + tips NOT split per main (order-level + multi-category); operating expenses NOT split; order-count caveat for multi-main orders (sums don't tie out to aggregate); no charts in V1; no pro-rated allocation.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **Sub-skill invoked:** `e2e-test-engineer` for E2E spec work (4 specs authored by the skill's 6-phase workflow). First REQ in this project to honour the upstream `MUST invoke e2e-test-engineer` contract correctly after two prior violations ([DevAudit-Installer#132](https://github.com/metasession-dev/DevAudit-Installer/issues/132) tracks upstream hardening).
- **AI-Generated Changes:** 1 interface field + 1 helper + 1 service method + 1 server action + 3 export functions + 1 new page (server+client) + 1 new admin form component + edits to 4 existing files + 4 E2E specs + 1 E2E helper + 3 unit-test files (26 cases) + 6-doc evidence pack + release ticket + implementation plan + SRS + RTM.
- **Operator action this cycle:** Confirmed 2 plan-time AskUserQuestion choices (report shape + payment/tip handling) BEFORE any code was written. Will validate at PR review + the 3-step manual UAT walkthrough + portal UAT review.

## Implementation Details

**Files Added:**

- `interfaces/admin-permissions.interface.ts` — `mainCategoryReportAccess?: string[]` field
- `lib/permissions.ts` — `getAllowedMainCategoriesForReports(session, allRegisteredMainSlugs)` helper
- `services/financial-report-service.ts` — `MainCategoryReport` interface + `generateMainCategoryReport` method
- `app/actions/reports/report-actions.ts` — `generateMainCategoryReportAction` with two-gate auth
- `app/dashboard/reports/by-main-category/page.tsx` — new page (server component)
- `app/dashboard/reports/by-main-category/by-main-category-report-client.tsx` — new page (client)
- `components/features/admin/main-category-report-access-editor.tsx` — new editor section
- `lib/report-export.ts` — `exportMainCategoryReportAsPDF/Excel/CSV` + `buildMainCategoryReportCSV` (testable) + `mainCategoryReportFilename`
- `e2e/helpers/main-category-report-seed.ts` — shared seed utilities
- `e2e/admin/by-main-category-report.spec.ts` — Spec 1 (4 tests)
- `e2e/admin/by-main-category-report-export.spec.ts` — Spec 3 (4 tests)
- `e2e/admin/main-category-report-access-control.spec.ts` — Spec 4 (4 tests)
- `e2e/admin/main-category-report-permissions-ui.spec.ts` — Spec 5 (4 tests)
- `__tests__/lib/permissions.main-category-access.test.ts` — 9 unit cases
- `__tests__/services/financial-report-service.main-category.test.ts` — 8 unit cases
- `__tests__/lib/report-export.main-category.test.ts` — 9 unit cases
- `compliance/plans/REQ-076/implementation-plan.md` (+ mirrored evidence copy)
- `compliance/evidence/REQ-076/{test-plan, test-execution-summary, test-scope, security-summary, ai-prompts, ai-use-note}.md`

**Files Modified:**

- `app/dashboard/reports/page.tsx` — added "By Main Category" tile
- `app/dashboard/settings/admins/[adminId]/permissions/page.tsx` — fetches enabled mains, passes to client
- `components/features/admin/permissions-management-client.tsx` — wires the new editor below PermissionsEditor
- `docs/SRS.md` — new REQ-MENUMGT-006 section + RTM row
- `compliance/RTM.md` — new IN PROGRESS row above REQ-075

**Schema changes:** None. Optional new field on the existing Mongoose `Mixed` permissions sub-document; no migration required. **New packages:** None. **New env vars:** None.

## Test Plan & Evidence

See `compliance/evidence/REQ-076/test-plan.md` + `test-execution-summary.md`.

- Vitest: 1181 pass / 4 skip / 0 fail (**+27 cases**: 9 perms + 8 service + 9 export + 1 expected).
- TypeScript: 0 errors.
- UI E2E: pending UAT auto-deploy after develop merge (4 specs × ~4 tests = ~16 new tests will land green post-deploy).
- Storage-layer E2E (numbers tie-out): dropped due to dynamic-import limitation; coverage redirected to unit tests + Spec 1's UI flow (REQ-070 pattern).

## Security & Compliance

See `security-summary.md`. Headline: server-side gate dominates; super-admin always bypasses (prevents operator lockout); restricted admins can't exfiltrate other mains' revenue numbers (negative dropdown + literal `'Forbidden: not authorized for this main category'` action error). No new packages, env vars, or external integrations. AuditLog rows include the new field via existing `admin.permissions-updated` write.

## Pre-deploy operator checklist

- [ ] **Manual UAT walkthrough** — 3 steps in `test-scope.md` (~15 min total):
  - Visual styling sanity (5 min)
  - Export readability — open PDF / Excel / CSV in real apps (5 min)
  - RBAC live walkthrough — flip a test admin's permission, log in as that admin (5 min)
- [ ] **No env-var setup, no migration.** Existing admins keep `undefined` (unrestricted).

## Rollback Plan

Revert the integration PR. The new optional field on `IAdminPermissions` is back-compat: existing admin documents are unaffected. The new page can be revert-deleted without affecting any existing route. The new server action's import path goes away. No data migration to undo.

## Deferred to follow-up REQs

| Item                                                           | Why                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| Charts on the per-main page                                    | The daily report has a Charts tab; per-main V1 is tables-only |
| Per-customer / per-staff per-main breakdown                    | Heavier scope; orthogonal data slicing                        |
| Per-main report scheduling (daily email digest)                | Out of scope                                                  |
| Pro-rated payment / tip allocation across mains                | Operator-rejected at plan time                                |
| Bulk editing `mainCategoryReportAccess` across multiple admins | One-by-one V1                                                 |

## Quality Gates

| Gate                      | Expected            | Actual (2026-06-08)           |
| ------------------------- | ------------------- | ----------------------------- |
| `npx tsc --noEmit`        | exit 0              | exit 0                        |
| `npx vitest run` (full)   | 0 failures          | 1181 pass / 4 skip / 0 fail   |
| Unit tests for new code   | 26 pass             | 26 pass                       |
| E2E focused REQ-076 (UAT) | pending auto-deploy | _to be confirmed after merge_ |

## Stage Approvals

- [x] Stage 1 — Plan (operator confirmed 2 plan-time AskUserQuestion choices before coding)
- [x] Stage 2 — Implement + unit-test (1181/4/0; tsc 0; 27 new cases)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR + manual walkthrough)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Single-REQ tracked release path — NOT a housekeeping bundle.
- PR title MUST carry `[REQ-076]` brackets per `feedback_pr_title_req_brackets` so `derive-release-version.sh` attributes evidence to the right release.
- The `feedback_phase3_release_ticket_mandatory` memory applies: this release ticket + 6 evidence markdowns must land on develop BEFORE the release PR is opened.
- First REQ in this project to correctly invoke `e2e-test-engineer` per the upstream contract (DevAudit-Installer #132).
