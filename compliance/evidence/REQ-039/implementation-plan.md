# Implementation Plan — REQ-039

**Risk Level:** MEDIUM
**Issue:** [#88](https://github.com/metasession-dev/wawagardenbar-app/issues/88)
**Date:** 2026-05-17

## Codebase reconnaissance findings (2026-05-17)

1. **Existing snapshot data shape.** `interfaces/inventory-snapshot.interface.ts` exposes `IInventorySnapshotItem` (per-item with `staffAdjustedCount`, `systemInventoryCount`, `discrepancy`, `requiresAdjustment`) and `IInventorySnapshot` (envelope: date, mainCategory, status, items[]). No cost fields today. Schema in `models/inventory-snapshot-model.ts`. Both extend cleanly with one optional field.
2. **Snapshot service entry points.** `services/inventory-snapshot-service.ts` has FOUR methods that touch items: `generateSnapshotData()`, `submitSnapshot()`, `updateSnapshotItems()`, `resubmitSnapshot()`. Each needs a stamp/re-stamp pass.
3. **Existing summary helper.** `calculateSummary()` is a pure function (~line 390 per Explore report) that aggregates counts. Extending its return shape with `missingCost: number` is the cleanest place to compute the total once.
4. **Live `inventory.costPerUnit`** is the source for stamping. Already populated on the Inventory model from prior REQs (REQ-034 weighted-average path). No backfill needed for new snapshots.
5. **Three UI surfaces** were enumerated in the Explore report: `inventory-summary-client.tsx` (submit form), `snapshot-details-client.tsx` (detail Summary panel), `snapshots-list-client.tsx` (list page). The submit-form live total is the only UI that needs the helper called client-side.
6. **REQ-032 precedent** for cost-freeze: order-time cost-snapshot pattern, verified by `__tests__/reports/report-cost-snapshot.test.ts`. Same shape applies here.

## Single-PR plan

Ships in the bundled PR with REQ-038 + REQ-040.

## Order of work

Tests-first per `[[feedback_tests_before_push]]`:

1. **Schema + interface** — add `costPerUnitAtSnapshot?: number` on item.
2. **Pure helper** — `lib/snapshot-missing-cost.ts` + unit tests (8 tests). All initially fail until helper exists.
3. **Service: extend `calculateSummary`** to return `missingCost`. Vitest test.
4. **Service: stamp at `generateSnapshotData`** — look up `inventory.costPerUnit` for each item's paired MenuItem; stamp on the row. Vitest test.
5. **Service: stamp/fallback at `submitSnapshot`** — if caller dropped the value, re-resolve and stamp. Vitest test.
6. **Service: re-stamp only changed items at `updateSnapshotItems` + `resubmitSnapshot`** — guard so untouched rows keep their original frozen cost. Vitest test.
7. **Service: extend `inventory.snapshot_submitted` audit-log details** with `missingCost`. Vitest test.
8. **UI: submit form** — render live "Missing cost: £X" total above items table using `computeMissingCost` against current `inventory.costPerUnit` values. Optional per-row inline annotation.
9. **UI: detail page** — extend Summary Statistics card with "Missing Cost" cell. Legacy `—` fallback.
10. **UI: list page** — add "Missing Cost" column after "Adjustments". Legacy `—` fallback.
11. **E2E** — extend `e2e/inventory-snapshots.spec.ts` with 4–5 new tests using `evidenceShot(page, 'REQ-039', 'AC<n>-...')` to write per-assertion PNGs.
12. **UAT-checklist** — thin (cost-freeze invariant + legacy regression are the residual manual checks).

## Files (create)

- `lib/snapshot-missing-cost.ts` (~30 lines)
- `__tests__/lib/snapshot-missing-cost.test.ts` (~80 lines, 8 tests)

## Files (modify)

- `interfaces/inventory-snapshot.interface.ts` (+ `costPerUnitAtSnapshot?: number`; + `missingCost: number` on `IInventorySnapshotSummary`)
- `models/inventory-snapshot-model.ts` (mirror)
- `services/inventory-snapshot-service.ts` (+ stamp / re-stamp / summary / audit-log)
- `models/audit-log-model.ts` (extend `inventory.snapshot_submitted` event-detail shape if validated)
- `components/features/inventory/inventory-summary-client.tsx` (+ live total)
- `components/features/inventory/snapshot-details-client.tsx` (+ Summary cell)
- `components/features/inventory/snapshots-list-client.tsx` (+ list column)
- `__tests__/services/inventory-snapshot-service.test.ts` (+ stamp + summary + invariant + audit tests, ~7 tests)
- `e2e/inventory-snapshots.spec.ts` (+ 4–5 tests with `evidenceShot` calls)
- `compliance/RTM.md` (REQ-039 row → DRAFT → TESTED → RELEASED through lifecycle)

## AC coverage

All 9 ACs (AC1–AC9) ship in this REQ's commits.

## Risk register

| Risk                                                                         | Mitigation                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Stamp forgotten in one of the four entry points → £0 instead of correct cost | Explicit service-level test per entry point (AC2)                           |
| Re-stamp clobbers untouched rows → cost-basis shift                          | AC2 "re-stamps ONLY changed items" test                                     |
| UI submit-form total disagrees with detail-page total                        | Single shared `computeMissingCost` helper used by both                      |
| Currency hard-coded vs. system locale                                        | Reuse existing format helper (check path at impl time)                      |
| Legacy snapshot renders £0 (false precision) instead of `—`                  | UI explicitly renders `—` when all items lack `costPerUnitAtSnapshot`       |
| Cost-freeze invariant broken by a future code path                           | AC6 invariant test asserts changing live cost does NOT change stamped value |
| Audit-log validator rejects new field                                        | Check at impl time; extend validator if it exists                           |

## Backout

Single-commit revert. Schema additions are optional fields — reverting code leaves them on documents but harmless (no query filters on them). UI changes disappear; old surfaces continue to render their pre-REQ shapes. Audit-log new field is ignored by older readers.

## AI involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all helpers, service edits, UI changes, tests, scaffold artefacts.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-039/ai-prompts.md`
