# REQ-100 — AI use note

**Date:** 2026-08-27
**Tool:** Claude Code (Sonnet 5) via `sdlc-implementer` orchestration.

## What the AI did

- Investigated the root cause during a prior UAT debugging session against live `wawagardenbar_uat` data (not part of this REQ's own scope): found `FinancialReportService.generateMainCategoryReport()` accumulated `quantity` per `menuItemId` but froze `price`/`costPerUnit` at whichever order line was seen first, under/over-counting any item sold at more than one price within a reporting window.
- Ran Phase 0 triage on issue [#676](https://github.com/metasession-dev/wawagardenbar-app/issues/676) (a bug report split from #672), classified it as tracked/fix/MEDIUM per the issue's own declared risk class.
- Authored the implementation plan, then invoked `requirements-aligner` (traced all 3 ACs to an existing SRS item, `REQ-MENUMGT-006` — a "match + drift" case: the item already named this exact function as its source but never documented the multi-price summation semantics, which is why the bug shipped undocumented; added a canonical Given/When/Then line rather than a stub), `adr-author` (no ADR needed — single-file arithmetic fix, no new dependency/db/service/pattern change), and `risk-register-keeper` (opened R-023 — the identical accumulation pattern is unaudited in `generateDailyReport`/`generateReportForDateRange`) as sub-skills — none authored inline.
- MEDIUM risk auto-continued through the Phase 1 plan-approval checkpoint (no HIGH/CRITICAL pause).
- Implemented the fix: the per-`menuItemId` map entry now accumulates `revenue`/`cost` fields per order line (preferring each line's own `subtotal`) instead of a single stored `price`/`costPerUnit` recomputed against total quantity at the end. Output `price`/`costPerUnit` become quantity-weighted averages for display only — `total` is always the authoritative summed figure, matching the existing output type contract exactly (no consumer/UI change needed).
- Added one new unit test to the existing `financial-report-service.main-category.test.ts` file reproducing the exact live-UAT scenario (an item sold as both a half-portion and full-portion line); did not author any browser-driven test — no UI-facing files are touched by this REQ, so the `e2e-test-engineer` sub-skill was not invoked.
- Discovered mid-Phase-2 that the pre-push compliance validator requires the full Stage-3 evidence pack (test-execution-summary.md, release ticket, implementation-plan.md copy) before a feature branch can even push — earlier than the generic skill instructions describe — and produced all three locally before the first successful push, rather than bypassing the hook.

## Honest framing of limitations

**Only `generateMainCategoryReport()` was audited and fixed.** Other per-item aggregation functions in the same file (`generateDailyReport`, `generateReportForDateRange`) were not checked for the identical pattern — this is the explicit, named gap recorded as risk-register entry R-023, not silently left undocumented.

**No production/UAT re-verification was performed as part of this REQ's own automated evidence** — the plan's manual-smoke step (re-check the UAT figures that originally surfaced the bug) is called out as a post-deploy operator action, not something the AI executed here.

## What the operator validated

- Will validate at PR review (#678, merged) and during portal UAT review (#679, pending).

## Reproducibility

```bash
npx vitest run __tests__/services/financial-report-service.main-category.test.ts
```
