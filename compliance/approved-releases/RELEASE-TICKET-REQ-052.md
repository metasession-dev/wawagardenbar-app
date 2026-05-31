# Release Ticket: REQ-052 — `recordPartialPayment` sets `tab.businessDate` on the first partial payment

**Status:** IN PROGRESS
**Date:** 2026-05-31
**Requirement ID:** REQ-052
**Risk Level:** MEDIUM
**GitHub Issue:** [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202)
**Integration PR:** (opened in this push — link added once gh returns the number)
**Release PR:** (opened after integration merges develop → main)
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-052`)
**Sign-off (dual-actor):** pending — UAT review on the portal, then Production approval, then Marked as Released.

---

## Summary

Closes the **open-tab partial-payment-invisible-to-DFR** bug ([#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202)). Root cause is structural: `TabService.recordPartialPayment` (`services/tab-service.ts:624-720`) pushes a partial-payment subdoc onto `tab.partialPayments` but never sets `tab.businessDate`. Only `closeTab` and `completeTabPaymentManually` set it. The DFR's `aggregatePartialPayments` query (REQ-051 surface) has three `$or` branches that all key on `tab.businessDate` or `tab.paidAt` — open tabs match no branch and don't appear in the report regardless of amount paid.

This is the **sibling fix to REQ-051**: REQ-051 fixed the DFR's calendar-vs-business-day range; REQ-052 makes sure tabs that haven't been closed yet show up at all. Together they close the open-tab attribution defect class.

The fix mirrors the existing pattern at `services/tab-service.ts:880` (`closeTab`): on the FIRST partial payment, lock `tab.businessDate` via `deriveBusinessDate(new Date(), cutoff)`. Subsequent partials don't overwrite — the tab's "business day" is anchored to the first cash event. Imports (`deriveBusinessDate`, `SystemSettingsService`) are already present.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** diagnosis from the #202 spec + DFR query shape, implementation plan with STRIDE + rollback, the 3-LOC `recordPartialPayment` change, 4 new vitest cases, full REQ-052 compliance markdown. See `compliance/evidence/REQ-052/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this turn:** approved the implementation plan at Phase-1 MEDIUM checkpoint; will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop → main.
- **Human Reviewer:** Stage 4 `dual_actor` approver (independent of submitter per the solo-operator interpretation — see DevAudit-Installer#89 gap 10) — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **`services/tab-service.ts:recordPartialPayment`** — 3-LOC insert (+ 4-line comment block) immediately before `tab.partialPayments.push`. Mirrors the closeTab pattern at line 880. `if (!tab.businessDate)` guard ensures write-once semantics.
- **No new imports** — `deriveBusinessDate` (from `@/lib/business-date`) and `SystemSettingsService` (from `./system-settings-service`) are already imported and used by `closeTab` / `completeTabPaymentManually`.
- **Tests** — 4 new vitest cases in `__tests__/services/tab-service.business-date.test.ts`: AC1 (first partial sets businessDate), AC2 (subsequent partial doesn't overwrite), multi-partial (sentinel-mock rules out silent re-derivation), cutoff plumbing (non-default `'06:00'` forwarded).
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, feat branch HEAD) → **893 pass · 0 fail · 4 skip** (up from 889 with REQ-051; +4 new REQ-052 cases).
- `npx eslint <REQ-052 files>` → 0 errors. (2 pre-existing `no-console` warnings at `tab-service.ts:363` and `:849` are unrelated to the REQ-052 insert at line ~670; surface unchanged.)
- `npm audit --audit-level=high` → unchanged (0 high / 0 critical; 7 pre-existing moderates).
- Semgrep (`--config auto services/tab-service.ts`) → 0 findings on the file changed by REQ-052.
- E2E focused regression on `e2e/daily-report-payments.spec.ts` → pending CI run on `develop` after integration PR merge. The single load-bearing E2E gate is the `daily report shows partial payment even though tab is still open` test which #202 specifically tracks.

## Residual Risk

- **Multi-day open tabs** — extremely rare (operators close tabs at end-of-day); when they do happen REQ-052 anchors them to the day of the first cash event, not the menu-add timestamp. This is the intentional choice (per the plan).
- **Race on simultaneous partials** — two concurrent `recordPartialPayment` calls on the same tab could both see `tab.businessDate === undefined`. Both would resolve to the same `deriveBusinessDate(...)` value (deterministic per business day) → last-write-wins on `tab.save()` produces a correct final state. No mitigation needed.
- **No DB migration; no schema change.** Rollback is a single `git revert` on the release-PR merge.
- **Existing tabs that already accumulated partials without `businessDate`** — will get the field set on their NEXT partial. If none arrives, they remain invisible to the DFR — but those are exactly the tabs that closed without ever reaching the DFR query's scope, so this is benign.

## Rollback Plan

`git revert <merge-sha>` on the release-PR merge → restores prior `recordPartialPayment` body. Newly-set `tab.businessDate` values on existing tabs persist (the field stays set; the correct intent of REQ-025 is preserved).

## Cross-Reference

- Sibling fix to **REQ-051** (DFR business-day-range): same surface, same query, different code path.
- Closes the **#117 P0 #6 (rev 2)** thread on open-tab attribution.
- The `tab-service.ts:880` pattern (in `closeTab`) was the direct model for the REQ-052 insert.
