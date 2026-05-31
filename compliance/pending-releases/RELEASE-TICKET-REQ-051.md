# Release Ticket: REQ-051 — DFR aggregation queries by business-day range, not calendar-day range

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-30
**Requirement ID:** REQ-051
**Risk Level:** HIGH
**GitHub Issue:** [#196](https://github.com/metasession-dev/wawagardenbar-app/issues/196)
**Integration PR:** [#199](https://github.com/metasession-dev/wawagardenbar-app/pull/199) — will be merged to develop once the focused regression is reviewed.
**Release PR:** Will be linked when the develop → main PR is created.
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-051`)

---

## Summary

Closes the **DFR-shows-₦0.00-before-cutoff** bug (#196). Root cause: `FinancialReportService.generateDailySummary(date)` queried by the WAT calendar day containing `date`, but orders' `businessDate` is keyed to the business day containing `date` (REQ-025). With the default 15:00 WAT cutoff, any DFR opened before 15:00 WAT returned ₦0.00 — every CI run hit this deterministically because GitHub Actions runners are UTC and tests land at ~07:00 WAT. The same defect class affects every operator opening the DFR before their first afternoon shift.

The fix introduces a `businessDayRange(date, cutoff)` helper in `lib/business-date.ts` and switches the service to use it. Query shape preserved; same `businessDate` index; no DB migration.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** diagnosis from #196 trace + code walk, implementation plan with STRIDE + rollback, the `businessDayRange` helper, the 3-LOC service change, 14 new vitest cases, `SystemSettingsService` mock added to 3 existing test files, full REQ-051 compliance markdown. See `compliance/evidence/REQ-051/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this turn:** approved the implementation plan at Phase-1 HIGH checkpoint; approved shipping REQ-051 as 4-of-7 partial outcome with follow-ups; will perform Phase 4 portal UAT approval + Phase 5 Production approval.
- **Human Reviewer:** Stage 4 `dual_actor` approver (independent of submitter per the solo-operator interpretation — see DevAudit-Installer#89 gap 10) — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **`lib/business-date.ts`** — new `businessDayRange(date, cutoff): { start, end }` (~10 LOC). Pure function; returns the inclusive range whose `start = deriveBusinessDate(date, cutoff)` and `end = start + 24h − 1ms`.
- **`services/financial-report-service.ts:generateDailySummary`** — `startOfDayWAT(date)`/`endOfDayWAT(date)` replaced with `await SystemSettingsService.getBusinessDayCutoff()` + `businessDayRange(date, cutoff)` (3 LOC). New imports of the helper + the settings service. The private `startOfDayWAT`/`endOfDayWAT` helpers stay in place — still used by the out-of-scope `generateDateRangeReport`.
- **Tests** — 14 new vitest cases (9 unit in `__tests__/lib/business-date.test.ts` + 5 integration in new `__tests__/services/financial-report-service.business-day.test.ts`); 3 existing tests gain a `SystemSettingsService` mock for the new awaited cutoff fetch.
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, feat branch HEAD) → **889 pass · 0 fail · 4 skip**.
- `npx eslint <REQ-051 files>` → 0 errors.
- `npm audit --audit-level=high` → 0 high/critical.
- Semgrep (`--severity ERROR`) → 0 findings on REQ-051 code.
- E2E focused regression on the 7 originally-blocked specs (run [`26678721792`](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26678721792)) → **48 expected, 4 unexpected**. Of the 7:
  - ✅ 4 fixed by REQ-051.
  - ❌ 3 remain on different bugs filed as [#200](https://github.com/metasession-dev/wawagardenbar-app/issues/200) / [#201](https://github.com/metasession-dev/wawagardenbar-app/issues/201); plus 1 previously-skipped surfaces as [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202).
- CI Pipeline will run on develop-push merging the integration PR — `derive-release-version.sh` returns `REQ-051` per the `[REQ-051]` PR-title convention; gate evidence uploads at `environment=uat` under `--release REQ-051`.

## Residual Risk

- **`generateDateRangeReport` is unchanged** — multi-day report range still uses the old calendar-day computation. Separate REQ if/when needed; user-selected ranges have subtler boundary semantics that warrant their own discussion.
- **Tip-side DFR aggregation is unchanged** — REQ-035's `tipsBreakdown` likely uses a different code path that still needs the business-day-range fix. Tracked at [#201](https://github.com/metasession-dev/wawagardenbar-app/issues/201).
- **Tab partial-payment aggregation under serial-mode tests** — previously skipped, now exercised, still needs investigation. Tracked at [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202).
- **No DB migration; no schema change.** Rollback is a single `git revert` on the release-PR merge.
