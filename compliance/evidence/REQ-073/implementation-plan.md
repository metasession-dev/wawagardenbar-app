# REQ-073 — Implementation plan

**Requirement ID:** REQ-073
**Risk:** MEDIUM (inherits from sub-issue #296's cluster classification — each spec is independently LOW; net-new safety-net coverage for destructive admin ops)
**Related issue:** [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-05

## Context

Sub-issue #296 of umbrella tracker #291 (SRS → E2E regression-pack coverage closure). Admin-side destructive operations + permission-gated workflows are mostly COULD-priority but represent **operator-facing risk surfaces** — destructive ops with no E2E pin are where regressions silently destroy or corrupt data.

8 specs were proposed in the sub-issue body; V1 ships the 3 highest-value-lowest-cost ones. The remaining 5 are tracked on #296's checklist for follow-up cycles.

## V1 scope

| #   | SRS ID                      | Spec                                    | Behavior pinned                                                                                                                                                                                                                   |
| --- | --------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | REQ-MENUMGT-004 (delete)    | `e2e/admin/menu-item-delete.spec.ts`    | `MenuItemModel.deleteOne()` removes the active item; `findById` afterward returns null. Existing Order references with `menuItemId` snapshots remain readable (history preserved at the order-item snapshot layer).               |
| 2   | REQ-MENUMGT-004 (duplicate) | `e2e/admin/menu-item-duplicate.spec.ts` | Duplicate creates a new MenuItem with " (Copy)" name suffix + unique slug + `isAvailable: false`; original unchanged.                                                                                                             |
| 3   | REQ-KITCHEN-005             | `e2e/admin/kitchen-void-batch.spec.ts`  | `ProductionService.voidBatch` flips status to 'voided' + restores each `ingredientsDeducted` entry on Inventory + decrements yield from menu-item inventory + writes 2 StockMovement audit rows. Idempotent (re-void is a no-op). |

## Acceptance criteria

- **AC1** (Spec 1) — After `MenuItemModel.deleteOne()` against a seeded item, `MenuItemModel.findById(seededId)` returns null. The Order document seeded with `items: [{ menuItemId: seededId, name, price }]` retains its embedded snapshot intact (history layer not lost).
- **AC2** (Spec 2) — After replicating the duplicate logic from `app/actions/admin/menu-actions.ts:864-909` against a seeded original, the new MenuItem document has: name === `${original.name} (Copy)`; `_id !== original._id`; `slug` ends with `-copy-${ts}` (or is null if original had no slug); `isAvailable === false`. Original MenuItem is unchanged.
- **AC3** (Spec 3) — After `ProductionService.voidBatch({ productionId, voidedBy: superAdminId, voidedByName, voidedByRole: 'super-admin', reasonNote? })` against a seeded production: `production.status === 'voided'`; `production.voidedAt` is set; each `ingredientsDeducted[i]` increment landed on Inventory.currentStock; menu-item Inventory.currentStock decreased by `production.actualYield`; 2 StockMovement rows written (one per ingredient + one for yield reversal).
- **AC4** (Spec 3 idempotency) — Calling `voidBatch` twice in succession on the same productionId leaves DB state unchanged on the second call (no double-reversal).

## Technical approach

Mirror REQ-070's pattern — Playwright runner connects directly to UAT Mongo, seeds + asserts at the storage/service layer.

- Specs use the existing `MONGODB_UAT_EXTERNAL_URI` (already in `.env.local`) — same env var that REQ-070 and REQ-069's existing specs use.
- Each spec seeds + tears down its own state in `beforeAll` / `afterAll` (no cross-test residue on UAT).
- Spec 1 + Spec 2 use `MenuItemModel.create()` directly + the spec asserts post-state.
- Spec 3 uses `ProductionService.voidBatch()` directly (imported statically) + asserts on Inventory + StockMovement collections.
- Synthetic identifiers (e.g. `e2e-req073-{ts}` slugs) to avoid collisions with real menu items.

What this pins:

- ✓ Storage-layer correctness of each destructive op
- ✓ State invariants across collections (Spec 3: Inventory + StockMovement + Production)
- ✓ Idempotency (Spec 3)

What this does NOT pin (deferred):

- ✗ Action-layer auth wrapping (session cookie → `requireRole(['admin','super-admin'])`) — covered by separate action unit tests; out of scope for V1 E2E
- ✗ UI flows (admin menu list → delete button → confirm modal → row removed) — deferred to V2 browser-context specs
- ✗ Audit-log row writes from the action layer — Spec 1/2 don't drive the action so `AuditLog.create` isn't fired; Spec 3 verifies StockMovement rows (the void path's audit trail)

Same honest framing as REQ-070's dynamic-import disclosure.

## Out of scope (deferred to follow-up cycles within #296)

| Item                                                                          | Why deferred                                                                                                               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `tab-delete-reverses-payments.spec.ts` (REQ-TABMGT-004)                       | Multi-collection state changes (payments reversed + customer points restored + tab status flip). Complex seed + assertion. |
| `force-password-change.spec.ts` (REQ-AUTHA-003)                               | UI-driven; needs browser context + admin login flow + session redirect handling.                                           |
| `data-deletion-request-approval.spec.ts` (REQ-SETTINGS-004 + REQ-PRIVACY-002) | Admin workflow UI + cascade verification across multiple collections.                                                      |
| `soft-delete-enforcement.spec.ts` (REQ-PRIVACY-002)                           | UI-driven across multiple admin views (orders list, revenue reports).                                                      |
| `kitchen-ingredient-archive.spec.ts` (REQ-KITCHEN-006)                        | Same pattern as void-batch but lower urgency; ships easily in V2 once the helper pattern is established.                   |

These ship in follow-up REQs within sub-issue #296.

## Security considerations

- All seed + teardown operations use `MONGODB_UAT_EXTERNAL_URI` (UAT only — never production). Honors `feedback_no_prod_db_touches`.
- Synthetic identifiers (`e2e-req073-{ts}` prefixed) — guarantees no collision with real records.
- `afterAll` deletes every seeded document by `_id`. No leftover state on UAT after a clean run.
- No production code changes shipped.

## Dependencies

- `mongodb` driver (already in `package.json`).
- `@playwright/test` (already in regression project).
- `MONGODB_UAT_EXTERNAL_URI` — operator's local env (already there).

## Test scope

See `compliance/evidence/REQ-073/test-scope.md` for the full breakdown.

## Quality gates

| Gate                       | Expected                                       |
| -------------------------- | ---------------------------------------------- |
| `npx tsc --noEmit`         | exit 0                                         |
| `npx vitest run` (full)    | 0 failures (unchanged — zero unit tests added) |
| Focused E2E (UAT)          | 0 failures                                     |
| Full regression pack (UAT) | green                                          |

## Stage plan

- [x] Stage 1 — Plan (this doc, operator-approved 2026-06-05)
- [ ] Stage 2 — Implement 3 specs; live-pass against UAT
- [ ] Stage 3 — Compile evidence (6-doc pack + release ticket)
- [ ] Stage 4 — Submit for UAT review (PR open)
- [ ] Stage 5 — Merge + close-out
