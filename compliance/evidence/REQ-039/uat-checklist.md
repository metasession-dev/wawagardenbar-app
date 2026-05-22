# UAT Checklist — REQ-039 (Missing-inventory cost on snapshot summaries)

**Requirement:** Missing-inventory cost on snapshot summaries
**Issue:** [#88](https://github.com/metasession-dev/wawagardenbar-app/issues/88)
**Date:** 2026-05-17
**UAT environment:** `https://wawagardenbar-uat.up.railway.app/`

## What's automated vs manual

REQ-039 follows the REQ-037 D11 pattern: E2E asserts behaviour; manual UAT is thin. E2E coverage spans the four key behaviours (live submit-form total, detail Summary cell, list column, cost-freeze invariant) using the new `evidenceShot` helper to capture per-assertion PNGs at `compliance/evidence/REQ-039/screenshots/`. Manual UAT is the cost-freeze invariant on UAT + legacy snapshot regression.

## Pre-flight

- [ ] No schema migration. `costPerUnitAtSnapshot` is optional; legacy snapshots remain valid and render `—` for the missing-cost cells.

## Manual — cost-freeze invariant (the load-bearing safety check)

- [ ] Submit a new snapshot reporting 3 missing units of a £5 item. Submit form shows live "Missing cost: £15".
- [ ] Submit and open the detail page. Summary panel shows "Missing Cost: £15".
- [ ] In a separate browser tab, open Inventory → edit the same item's `costPerUnit` to £6. Save.
- [ ] Reload the snapshot detail page. Summary still shows "Missing Cost: £15" (frozen at submission). Same on the list page.

## Manual — legacy regression

- [ ] Open the most recent pre-REQ-039 approved snapshot (any snapshot created before this REQ shipped). Summary panel and list row both render `—` for Missing Cost. No errors in the console.

## Manual — audit log

- [ ] Open the audit-log view (or query directly). The most recent `inventory.snapshot_submitted` event's `details` include `missingCost: 15` (or whatever value the snapshot was submitted with).

## Sign-off

- [ ] All E2E tests in `e2e/inventory-snapshots.spec.ts` (extended) green on develop CI
- [ ] Cost-freeze invariant + legacy regression checks above completed
- [ ] DevAudit / META-COMPLY UAT approval recorded
- [ ] PR merged to main

## Appendix — items removed from manual UAT (covered by E2E)

| Former manual step                                          | Now asserted by                                      |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| Submit form shows live missing-cost total updating per item | `inventory-snapshots.spec.ts` AC3                    |
| Detail Summary panel shows the post-submit missing-cost     | `inventory-snapshots.spec.ts` AC4                    |
| List page shows the missing-cost column                     | `inventory-snapshots.spec.ts` AC5                    |
| Legacy snapshot renders `—` not £0                          | `inventory-snapshots.spec.ts` legacy regression test |
