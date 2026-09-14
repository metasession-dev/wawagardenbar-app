---
req: REQ-101
generated_by: requirements-aligner
generated_at: 2026-09-14T09:40:00Z
---

# SRS alignment — REQ-101

**Backfilled evidence note:** REQ-101 was implemented and released before the `requirements-aligner` skill's Stage-3 hook was wired into this project's evidence pack. This file is a post-hoc backfill, produced by re-running the skill's Phase 3 (per-REQ ad-hoc audit) logic against the already-approved `compliance/plans/REQ-101/implementation-plan.md` and the current state of `docs/SRS.md` — no SRS prose or plan content was changed to produce it.

## ACs traced

| AC  | SRS item                                    | Action this cycle                                                                                                        |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| AC1 | REQ-REPORT-001 (existing)                   | updated (drift resolved) — per-`portionSize` row-splitting bullet added for the Revenue tab                              |
| AC2 | REQ-REPORT-001 (existing)                   | updated (drift resolved) — same bullet covers the Costs tab's per-`portionSize` split                                    |
| AC3 | REQ-MENUMGT-006 (existing)                  | updated (drift resolved) — equivalent per-`portionSize` row-splitting bullet added for the per-main-category report      |
| AC4 | REQ-REPORT-001 / REQ-MENUMGT-006 (existing) | unchanged — regression pin; REQ-100's existing per-line summation bullets are untouched, this REQ's bullets are additive |

Both SRS items' bullets are canonical prose (not stubs) in the current `docs/SRS.md`:

- REQ-REPORT-001 — the per-portion-size row-splitting bullet is present verbatim, ending "...(REQ-101)."
- REQ-MENUMGT-006 — the equivalent per-portion-size row-splitting bullet is present verbatim, ending "...(REQ-101)."

## Gap status

**CLEAN** — all four ACs trace to existing SRS items, both amended with canonical Given/When/Then prose in the same release cycle. The implementation plan's own AC-to-SRS table (§2, dated 2026-09-04) recorded AC1–AC3 as `@srs-deferred: pending requirements-aligner` at plan-approval time — this backfill confirms that deferral was subsequently resolved: both target SRS items now carry canonical (non-stub) prose, so no unresolved drift remains.

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [x] Each AC has a defensible SRS item.
- [x] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [x] Stale items have been brought current.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
