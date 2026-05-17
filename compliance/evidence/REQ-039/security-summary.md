# Security Summary — REQ-039

**Date:** 2026-05-17
**Risk Level:** MEDIUM

## Authorisation & authentication

- No new routes; no new server actions. Snapshot service entry points are unchanged in their permission model:
  - `submitSnapshot`, `updateSnapshotItems`, `resubmitSnapshot` — staff (csr / admin / super-admin).
  - `approveSnapshot`, `rejectSnapshot` — super-admin only.
- UI surfaces inherit the layout-level gates already in place.
- Cost-per-unit is operator-visible already (in the Inventory dashboard); exposing it on the snapshot does not leak new information.

## Authorisation matrix (post-REQ-039)

| Role / Permission | Submit snapshot (incl. cost stamp) | Edit pending snapshot (incl. re-stamp) | Approve / reject | View detail (incl. missingCost) | View list (incl. missingCost column) |
| ----------------- | ---------------------------------- | -------------------------------------- | ---------------- | ------------------------------- | ------------------------------------ |
| staff (csr)       | ✅ allow                           | ✅ allow                               | ❌ forbidden     | ✅ allow                        | ✅ allow                             |
| admin             | ✅ allow                           | ✅ allow                               | ❌ forbidden     | ✅ allow                        | ✅ allow                             |
| super-admin       | ✅ allow                           | ✅ allow                               | ✅ allow         | ✅ allow                        | ✅ allow                             |

## Data integrity

- **Cost-freeze invariant** is the load-bearing safety check. Mirrors REQ-032's order-time cost-snapshot pattern: the value is captured at the moment the operator commits to the count, and persists through future cost changes. Past snapshots' missing-cost stay numerically stable.
- **Stamp on every entry point.** Four service methods touch snapshot items (`generateSnapshotData`, `submitSnapshot`, `updateSnapshotItems`, `resubmitSnapshot`). Each tested explicitly so a future code path can't accidentally land items without a frozen cost.
- **Re-stamp only on changed items.** Edit flow re-stamps `costPerUnitAtSnapshot` only on items whose `staffAdjustedCount` changed. Untouched items keep their original frozen cost. Prevents silent cost-basis shifts on rows the staff didn't intend to edit.
- **Audit-log preserves the figure.** `inventory.snapshot_submitted` event details include `missingCost`, so reviewers can see the figure in the audit timeline without opening each snapshot.

## Threat model (deltas)

| Threat                                                                                                                   | Mitigation                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff submits with low staffAdjustedCount; later admin bumps cost to inflate the missing-cost retroactively for an audit | Cost-freeze invariant blocks this — the original `costPerUnitAtSnapshot` is immutable for that item; the bump only affects future snapshots |
| Staff edits a row not intending to change cost, but cost is silently re-stamped                                          | Re-stamp only on items where `staffAdjustedCount` actually changed; untouched rows keep their original frozen cost                          |
| Operator confused because UI submit-form total disagrees with service-computed total                                     | Single pure helper `computeMissingCost` used by both UI and service                                                                         |
| Currency injection (£ vs $ vs symbol drift) yields ambiguous display                                                     | Reuse existing currency-format helper (verified at impl time, not hard-coded)                                                               |
| Legacy snapshots show £0 instead of `—` (false-precision rendering)                                                      | UI explicitly renders `—` for any snapshot where ALL items have `costPerUnitAtSnapshot === undefined` (legacy fallback)                     |

## Tests added

- 8 pure-helper tests (`computeMissingCost`).
- 7 service-level tests covering every stamp / re-stamp / summary / invariant / audit assertion above.
- 4–5 E2E walks, each capturing per-assertion screenshots via the new `evidenceShot` helper.
