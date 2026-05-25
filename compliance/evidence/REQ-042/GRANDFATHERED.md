# REQ-042 — GRANDFATHERED (pre-onboarding baseline)

**Status:** PRE-ONBOARDING BASELINE — see `compliance/RTM.md` row REQ-042 and `compliance/risk-register.md` R-001.

**Source PR:** [#113 — `feat(tabs): super-admin can delete tabs with optional inventory revert`](https://github.com/metasession-dev/wawagardenbar-app/pull/113)
**Implementation commit:** `18e6326`
**Release PR (develop→main):** [#116](https://github.com/metasession-dev/wawagardenbar-app/pull/116) — merge commit `bba04c8`, merged 2026-05-23
**Risk:** MEDIUM (financial — bypasses inventory + access-control safety guards)

## Why this directory contains no test scope / test plan / implementation plan / security summary

This requirement was authored, implemented, merged, and deployed to production **before** the DevAudit SDLC framework was re-onboarded to the project (re-onboarding occurred 2026-05-24; this REQ shipped to main 2026-05-23). At authoring time the assistant had a stale memory entry stating the SDLC had been retired permanently, so no compliance scaffolding was produced.

The full change rationale, scope, security analysis, test plan, and UAT walk-through are preserved on the GitHub PR description (#113). Vitest coverage shipped in the same PR (`__tests__/services/tab-service.delete-super-admin.test.ts`, 6 cases). The implementation reuses an existing, already-tested primitive (`InventoryService.restoreStockForOrder`) — the new logic is the role-gated bypass + audit-log enrichment, both covered by the new vitest cases.

## What was shipped

- `services/tab-service.ts:deleteTab(tabId, deletedBy, opts?)` — new opts param `{ superAdminOverride?: boolean; revertItems?: boolean }`. When `superAdminOverride === true`: bypasses the closed+paid and non-cancelled-orders guards. When also `revertItems === true`: per non-cancelled linked order, calls `InventoryService.restoreStockForOrder()` (idempotent on `order.inventoryDeducted`), force-cancels the order (bypassing the normal `cancelOrder` status guard), and writes a per-order `order.cancel` audit log.
- `app/actions/tabs/tab-actions.ts:deleteTabAction(tabId, opts?)` — role gate: if `opts.superAdminOverride` is requested, requires `session.role === 'super-admin'`.
- `components/features/admin/tabs/delete-tab-dialog.tsx` — super-admin sees an enabled Delete button in all states + a radio for Revert items / Leave as-is.
- `app/dashboard/orders/tabs/[tabId]/page.tsx` — threads `isSuperAdmin` to the dialog.
- Audit log per cancelled order (`order.cancel`, `viaTabDelete: true`) plus enriched `tab.delete` log with `{ superAdminOverride, revertItems, ordersAffected, inventoryRestored }`.

## Tests at time of release

- 6 new vitest cases on the new branches (revert path, keep path, closed+paid override, default-path regression, `inventoryDeducted=false` no-op).
- Full suite at merge: 802 pass / 4 skipped. `tsc --noEmit` clean.

## Compensating control going forward

REQ-046 onward will go through the full DevAudit gated flow. No further work ships on this baseline.
