# Release Ticket: REQ-034 — Recipes + Production + Kitchen-Ingredient Inventory + Kitchen role

**Status:** DRAFT (BLOCKED on REQ-033)
**Date:** 2026-05-01
**Requirement ID:** REQ-034
**Risk Level:** HIGH (financial data, multi-collection writes, new transaction type, customer-menu query change, new role)
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**PR:** TBD
**Prereq:** [REQ-033 (#73)](https://github.com/metasession-dev/wawagardenbar-app/issues/73) — UoM registry must ship and soak ≥1 week before this REQ starts

---

## Summary

Kitchen staff can author **recipes** linking a target menu item (e.g. Pepper Soup) to ingredient inventory records (goat meat, palm oil, salt, …) with quantities and units, plus a yield-per-batch. **Production events** ("made N batches today") deduct ingredient stock and add finished portions to the menu-item inventory in a single atomic transaction.

Inventory gains a `kind` discriminator (`menu-item` | `kitchen-ingredient`) — single collection, single audit log, customer order screens never see kitchen ingredients. New `kitchen` role authors recipes + records production but is excluded from order-creation surfaces. Direct Cost Expenses can auto-link to a kitchen-ingredient inventory item: saving the expense bumps stock + emits a StockMovement in the same transaction.

The driving case: `Buy goat (₦75k expense, links to "Goat" inventory) → cook 1 batch of Pepper Soup recipe (deducts 1 goat + 5L palm oil + spices, adds 200 portions of Pepper Soup) → customer orders Pepper Soup (existing flow deducts portion-by-portion)`. The full buy → cook → sell flow is contained without manual stock adjustments.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** Recipe + Production models/interfaces, services with transactional execute + void, two pure helper modules + tests, kitchen pages + components, kitchen role auth helpers, customer-menu kind-filter updates, Expense auto-link logic + form changes, inventory dashboard tabs, backfill script, all SDLC artefacts.
- **Human Reviewer of AI Code:** ostendo-io + second reviewer (TBD) — HIGH baseline + AI-involvement +1 = 2 reviewers required
- **Components Regenerated:** None — every change is a targeted edit; existing back-end (REQ-026/030/031) is not regenerated
- **Prompt log:** `compliance/evidence/REQ-034/ai-prompts.md`

HIGH risk — requires two human reviewers per the Risk-Tiered Review Policy before merge to main.

---

## Implementation Details

(See `compliance/evidence/REQ-034/implementation-plan.md` for the full file-level spec.)

**Files Created:** 4 model/interface files, 2 service files, 2 server-action files, 3 pages, 4 component files, 2 pure helpers, 8 test files, 1 migration script. SDLC artefacts.

**Files Modified:** 18 files spanning models, interfaces, auth helpers, customer-menu services + actions, expense flow, settings UI, inventory dashboard.

**Schema additions** (additive only, no destructive migrations):

- `Inventory + kind: 'menu-item' | 'kitchen-ingredient'`
- `Expense + linkedInventoryId?: ObjectId, stockMovementId?: ObjectId`
- `StockMovement.category` enum extended to include `'production'`; new optional `productionId?: ObjectId` ref

**New collections:** `Recipe`, `Production`.

---

## Acceptance Criteria

(See `compliance/evidence/REQ-034/test-plan.md` for the canonical AC list and AC↔test mapping. 15 ACs covering kind discriminator + customer-menu isolation + tabs + kitchen role + auto-link + recipe builder + production execution + yield variance + void window + COGS regression + REQ-031 regression.)

---

## Test Plan

`compliance/evidence/REQ-034/test-plan.md`

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Lint: 0 errors
- [ ] Unit + integration tests: 46 new pass; 475 baseline (post-REQ-033) still pass
- [ ] E2E: 2 new specs (`recipe-and-production.spec.ts`, `role-isolation.spec.ts`) pass
- [ ] Build: `npm run build` succeeds
- [ ] Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes for REQ-034
- [ ] 2 human reviewers signed off
- [ ] AI prompts artefact captured

---

## Rollback Plan

Multi-stage:

1. **Pre-merge rollback**: revert the merge commit. `Inventory.kind` field stays in place (additive); harmless.
2. **Mid-flight production rollback**: super-admin runs `voidProduction(productionId)` within 24h to reverse linked StockMovements (additions for ingredients, deductions for yield).
3. **Auto-link Expense rollback**: editing or deleting an Expense with `linkedInventoryId` voids the linked StockMovement automatically (creates reversal entry).
4. **Backfill rollback**: `Inventory.kind` field can be removed by reverse script if absolutely necessary; not recommended (forms revert to non-kind queries on rollback, harmless).

---

## Post-Deploy Actions

1. **Run inventory-kind backfill** on production: `npx tsx scripts/backfill-inventory-kind.ts`. Expect output `Set kind: 'menu-item' on N rows; 0 already migrated`.
2. **Verify customer order surfaces** never show kitchen-ingredient inventory: spot-check `/dashboard/orders/express/create-order` after seeding 1-2 kitchen ingredients.
3. **Create kitchen role user** for at least one staff member during the post-deploy window.
4. **Soak window**: minimum 1 week on UAT + production before any further Inventory or Recipe-related REQs.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] Backfill script run on UAT, then production
- [ ] Kitchen role created + assigned to ≥1 staff user
- [ ] Both reviewers signed off
- [ ] META-COMPLY UAT approval obtained
- [ ] PR merged to main
- [ ] Production verified: backfill output, customer-menu isolation, kitchen pages reachable
