# REQ-044 — GRANDFATHERED (pre-onboarding baseline)

**Status:** PRE-ONBOARDING BASELINE — see `compliance/RTM.md` row REQ-044 and `compliance/risk-register.md` R-001.

**Source PR:** [#115 — `fix(inventory): route deduct/restore via locations[0] for trackByLocation rows`](https://github.com/metasession-dev/wawagardenbar-app/pull/115)
**Implementation commit:** `ef3e140`
**Release PR (develop→main):** [#116](https://github.com/metasession-dev/wawagardenbar-app/pull/116) — merge commit `bba04c8`, merged 2026-05-23
**Risk:** MEDIUM (financial — changes inventory mutation behaviour for every sale of every location-tracked item)

## Why this directory contains no test scope / test plan / implementation plan / security summary

This requirement was authored, implemented, merged, and deployed to production **before** the DevAudit SDLC framework was re-onboarded to the project (re-onboarding 2026-05-24; this REQ shipped to main 2026-05-23). At authoring time the assistant had a stale memory entry stating the SDLC had been retired permanently, so no compliance scaffolding was produced.

The full root-cause analysis, code-trace, behaviour-change warning, and UAT verification are preserved on the GitHub PR description (#115). Vitest coverage shipped in the same PR (`__tests__/services/inventory-service.track-by-location.test.ts`, 7 cases).

## What was shipped

- `services/inventory-service.ts` — new private helper `applyOrderStockDelta(inventory, delta)`. When `inventory.trackByLocation && locations.length > 0`: mutates `locations[0].currentStock` (clamped at zero) so the model's `pre('save')` hook's `currentStock = sum(locations[].currentStock)` recompute reflects the change. Otherwise: mutates `currentStock` directly (existing behaviour). Also stamps `lastUpdated`, `updatedBy` (zero ObjectId), `updatedByName: 'System'` on the location subdoc for audit traceability. Called from four sites: deduct base, deduct linked-customization, restore base, restore linked-customization.

## Bug pre-fix

For any `Inventory` row with `trackByLocation: true`, the model's `pre('save')` hook recomputes `currentStock` from `sum(locations[].currentStock)`. `deductStockForOrder` and `restoreStockForOrder` were assigning directly to `inventory.currentStock`, so the hook silently overwrote those assignments — sales and restocks left location-tracked stock frozen. Operators were maintaining location stock manually, masking the drift.

Symptom that surfaced the bug: UAT super-admin tab delete on REQ-042 with Revert items restored Peppered Beef (`trackByLocation: false`) correctly but left C-Water (`trackByLocation: true`, locations `[store: 96, chiller1: 102]`) unchanged.

## Tests at time of release

- 7 new vitest cases covering deduct/restore × trackByLocation true/false + empty-locations fallback + zero-clamp.
- Full suite at merge: 809 pass / 4 skipped. `tsc --noEmit` clean.

## Behaviour-change note (preserved in PR body)

Sales of `trackByLocation` items now actually move `currentStock` for the first time. Stock that was being manually reconciled may start drifting downward naturally — operators were asked to watch low-stock alerts for the first day post-deploy.

## Compensating control going forward

REQ-046 onward will go through the full DevAudit gated flow.
