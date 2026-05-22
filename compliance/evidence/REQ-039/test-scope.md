# Test Scope — REQ-039

**Risk Level:** MEDIUM (financial-data surface; multi-UI changes; cost-freeze invariant is load-bearing safety check)
**Requirement:** Missing-inventory cost on snapshot summaries
**GitHub Issue:** [#88](https://github.com/metasession-dev/wawagardenbar-app/issues/88)
**Date:** 2026-05-17

## Test Approach

Additive feature on top of the existing inventory-snapshot workflow (REQ unchanged behaviour for submit / edit / approve / reject — only the data captured grows and the rendered summary gains a cost cell). Pure-helper aggregator feeds both the live UI total and the service-side `calculateSummary`. Cost-freeze invariant mirrors REQ-032's order-time cost-snapshot pattern.

**Universal gates:**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical
- Vitest unit + service tests: baseline + 14 new tests (8 helper + 7 service)
- Playwright E2E: extended `inventory-snapshots.spec.ts` with 4–5 new tests using the new `evidenceShot` helper
- Human review per project policy (one reviewer, MEDIUM risk)

## In Scope

1. **Schema** — `IInventorySnapshotItem.costPerUnitAtSnapshot?: number` (interface + Mongoose schema).
2. **Service** — `services/inventory-snapshot-service.ts`:
   - `generateSnapshotData()` stamps cost per item from live `inventory.costPerUnit`.
   - `submitSnapshot()` re-stamps any item missing the value.
   - `updateSnapshotItems()` + `resubmitSnapshot()` re-stamp only items whose `staffAdjustedCount` changed.
   - `calculateSummary()` extends `IInventorySnapshotSummary` with `missingCost: number`.
3. **Pure helper** — `lib/snapshot-missing-cost.ts` exports `computeMissingCost(items): number`. Reused by both UI live total and service.
4. **Audit log** — `inventory.snapshot_submitted` event details include `missingCost`.
5. **UI surfaces** — three components touched: `inventory-summary-client.tsx` (live total above items table), `snapshot-details-client.tsx` (Summary Statistics card extension), `snapshots-list-client.tsx` (new column after Adjustments).

## Out of Scope

- Aggregating `deductStock` write-offs (waste / damage / theft / other) into the same cost figure. Different surface; would be a separate REQ.
- "Found extra" cost (positive discrepancy). v1 surfaces missing only.
- Cross-snapshot rollup ("total missing cost across last 30 snapshots"). Could live on a future Reports surface.
- Cost computation using `InventoryItemCostHistory` to pick cost effective at `snapshotDate`. The current live `inventory.costPerUnit` is operator-visible and trustable; the more-accurate history lookup is a future hardening.
- Backfilling cost on legacy approved snapshots. Honest "—" is the v1 UX.

## Test Types

- **Unit (Vitest):** pure-helper `computeMissingCost` matrix (8 tests).
- **Service (Vitest with Mongoose mocks):** stamp / re-stamp / summary / invariant / audit (7 tests).
- **E2E (Playwright):** 4–5 walks covering submit-form live total, detail Summary cell, list column, cost-freeze invariant, legacy regression. Each walk uses `evidenceShot(page, 'REQ-039', 'AC<n>-...')` to capture per-assertion PNGs into `compliance/evidence/REQ-039/screenshots/`.
- **Manual UAT:** thin per `[[feedback_check_before_asking]]` — verify cost-freeze invariant + legacy regression on UAT before merge.

## Risks

1. **Stamping forgotten in one of the four entry points** (`generateSnapshotData` / `submitSnapshot` / `updateSnapshotItems` / `resubmitSnapshot`) → items missing cost end up showing £0 instead of £X. Mitigated by explicit service-level test for each entry point.
2. **Edit re-stamps a row the staff didn't touch** → cost basis shifts unexpectedly. Mitigated by AC2 test asserting "re-stamps ONLY changed items."
3. **Live UI total disagrees with service-side aggregate** → operator sees one number on submit, a different one on the detail page. Mitigated by sharing the same `computeMissingCost` pure helper.
4. **Currency formatting drift** — UI hard-codes £ instead of reusing the project's currency helper. Mitigated by impl-time check of the existing format helper path.
5. **Cost-freeze invariant fails** — the test must explicitly bump live cost and assert the snapshot's stamped value is unchanged. Mitigated by AC6 test.
6. **Audit-log schema validation rejects the new `missingCost` field** if the event-details schema validates shape. Mitigated by check at impl time (extend the validator if it exists).
