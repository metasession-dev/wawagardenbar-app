# Test Plan — REQ-039 (Missing-inventory cost on snapshot summaries)

**Status:** DRAFT
**Date:** 2026-05-17
**Issue:** [#88](https://github.com/metasession-dev/wawagardenbar-app/issues/88)
**Risk Level:** MEDIUM (financial-data surface; multi-UI changes; cost-freeze invariant is load-bearing)

## Scope

When an inventory snapshot is submitted reporting `staffAdjustedCount < systemInventoryCount`, surface the total financial value of the missing inventory. Three surfaces: the submit form (live total), the post-submit detail Summary panel, and the snapshot list column. Cost-per-unit is frozen on each item at submission time (mirrors REQ-032 order-time cost-snapshot pattern); later inventory-cost changes do not retroactively rewrite past snapshots' missing-cost.

## Acceptance criteria

| AC  | Description                                                                                                                                                                                                     | Verification                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| AC1 | Schema: `IInventorySnapshotItem` gains optional `costPerUnitAtSnapshot?: number`. No envelope-level field. No migration                                                                                         | Vitest schema test (set + read; absence on legacy docs is valid)                  |
| AC2 | Service: `generateSnapshotData`, `submitSnapshot`, `updateSnapshotItems`, `resubmitSnapshot` stamp `costPerUnitAtSnapshot` correctly; `calculateSummary` extends `IInventorySnapshotSummary` with `missingCost` | Vitest service-level tests (5+ branches)                                          |
| AC3 | Submit form `inventory-summary-client.tsx` shows a live "Missing cost: £X" total that updates as `staffAdjustedCount` values are entered/edited                                                                 | E2E walk + visual assertion                                                       |
| AC4 | Detail page `snapshot-details-client.tsx` Summary Statistics card includes a "Missing Cost" cell. Legacy snapshots (no frozen costs) render `—`                                                                 | E2E walk + legacy regression test                                                 |
| AC5 | List page `snapshots-list-client.tsx` adds a "Missing Cost" column after "Adjustments". Legacy snapshots render `—`                                                                                             | E2E walk + legacy regression test                                                 |
| AC6 | Cost-freeze invariant: changing `Inventory.costPerUnit` later does NOT change the missing-cost of past snapshots                                                                                                | Vitest invariant test + E2E walk (bump cost → reload snapshot → assert unchanged) |
| AC7 | Audit log `inventory.snapshot_submitted` event details include `missingCost: number`                                                                                                                            | Vitest audit-log-emission test                                                    |
| AC8 | Tests: new `__tests__/lib/snapshot-missing-cost.test.ts` (pure helper) + extended _snapshot-service unit_ + extended E2E `inventory-snapshots.spec.ts` using new `evidenceShot` helper                          | tsc 0; vitest delta ≥ +14; E2E green                                              |
| AC9 | UAT walk covers fresh snapshot with missing items, cost-freeze invariant verification, and legacy snapshot fallback                                                                                             | `compliance/evidence/REQ-039/uat-checklist.md`                                    |

## AC ↔ test mapping

### Vitest

| AC  | Test                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — schema accepts costPerUnitAtSnapshot; legacy items valid                                     |
| AC2 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — `generateSnapshotData` stamps cost per item                                                  |
| AC2 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — `submitSnapshot` re-stamps when caller drops the value                                       |
| AC2 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — `updateSnapshotItems` re-stamps ONLY changed items                                           |
| AC2 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — `calculateSummary` returns correct missingCost                                               |
| AC6 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — invariant: changing live inventory.costPerUnit after stamp does NOT change item-frozen value |
| AC7 | _snapshot-service unit (merged into the suite that ships in `snapshot-missing-cost` + `report-cost-snapshot` files)_ — `inventory.snapshot_submitted` audit log includes missingCost                                |
| AC8 | `__tests__/lib/snapshot-missing-cost.test.ts` — empty array → 0                                                                                                                                                     |
| AC8 | `__tests__/lib/snapshot-missing-cost.test.ts` — single negative discrepancy → abs × cost                                                                                                                            |
| AC8 | `__tests__/lib/snapshot-missing-cost.test.ts` — multi-row mixed positive+negative → sum of negatives only                                                                                                           |
| AC8 | `__tests__/lib/snapshot-missing-cost.test.ts` — ignores positive discrepancies                                                                                                                                      |
| AC8 | `__tests__/lib/snapshot-missing-cost.test.ts` — ignores items with no costPerUnitAtSnapshot                                                                                                                         |
| AC8 | `__tests__/lib/snapshot-missing-cost.test.ts` — ignores items with no staffAdjustedCount (no decision = no missing)                                                                                                 |

### Playwright E2E (`e2e/inventory-snapshots.spec.ts` — extend)

| AC      | Test                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| AC3     | Submit form shows live missing-cost total updating as staffAdjustedCount values change (use `evidenceShot` at the assertion moment) |
| AC4     | Detail Summary panel shows missing-cost equal to the submit-time total                                                              |
| AC5     | List row shows missing-cost                                                                                                         |
| AC6     | Bump `inventory.costPerUnit` after submission; reload snapshot → detail + list still show original missing-cost                     |
| AC4+AC5 | Legacy snapshot (created before this REQ) renders `—` on detail + list, no errors                                                   |

## Gates

- TypeScript: `tsc --noEmit` 0 errors
- Vitest: baseline + 14 new tests all pass
- Playwright: extended `inventory-snapshots.spec.ts` green; `evidenceShot` writes per-AC PNGs to `compliance/evidence/REQ-039/screenshots/`
- Build: `npm run build` green
- Semgrep: 0 findings on changed paths
- Dependency audit: 0 unaccepted high/critical

## Regression

- REQ-032 order-time cost-snapshot pattern unchanged (this REQ mirrors it, doesn't modify it)
- REQ-034 `InventoryItemCostHistory` model unchanged (only the live `inventory.costPerUnit` is read at stamp time)
- Existing snapshot workflow (submit / edit / approve / reject) unchanged in behaviour; only the data captured grows
- Existing summary statistics (totalItems, confirmedItems, adjustmentItems, totalDiscrepancy) unchanged; missingCost is additive
