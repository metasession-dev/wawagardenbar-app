# Test Scope — REQ-034

**Risk Level:** HIGH (financial data, multi-collection writes, new transaction type, customer-menu query change, new role)
**Requirement:** Recipes + Production + Kitchen-Ingredient Inventory + Kitchen role. Kitchen staff author recipes linking a target menu item to ingredient inventory; "production" events deduct ingredient stock and add finished portions to menu inventory atomically.
**GitHub Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Prereq:** [REQ-033 (#73)](https://github.com/metasession-dev/wawagardenbar-app/issues/73) — UoM registry must ship and soak ≥1 week first
**Date:** 2026-05-01

## Test Approach

Full verification per Test Strategy HIGH-risk requirements. This REQ touches multi-collection transactional writes, introduces a new role, modifies customer-facing menu queries, and reuses the existing `StockMovement` audit log with a new category. Pure logic (recipe execution math, expense→inventory mapping) extracted to helpers and exhaustively unit-tested; transaction behaviour and rollback paths covered by service-level integration tests; UI flow and sign-off via E2E + manual UAT.

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical vulnerabilities (REQ-031/033 baseline preserved)
- Vitest unit + integration suite: all pass
- Playwright E2E: existing suites unchanged + new kitchen recipe-and-production spec
- Human code review via PR (×2 — HIGH risk, AI-involvement +1)

**Security testing (mandatory for HIGH):**

- [ ] **Access control**: kitchen role gated to `/dashboard/kitchen/*` only. `requireKitchen` and `requireAdminOrKitchen` helpers added to `lib/auth-middleware.ts`. Order-creation surfaces (`/dashboard/orders/express/*`) explicitly REJECT kitchen role at page level + at server action level.
- [ ] **Audit logging**: every production event emits one `StockMovement` per ingredient + one for the yield. `productionId` foreign-keys all rows for traceability. Voiding emits reversal entries (no physical deletion). Auto-link Expense → Inventory writes a back-reference (`Expense.stockMovementId`) for edit/delete reversibility.
- [ ] **Input validation**: every recipe ingredient `inventoryId` validated to exist + be `kind: 'kitchen-ingredient'`. Every recipe `unitId` validated to match inventory `unitId` (strict — REQ-033's no-conversion rule). Production pre-flight blocks if any ingredient short. Path-qualified errors (`ingredients[i].quantity insufficient`).
- [ ] **Error handling**: rejection messages name the offending ingredient + missing quantity but do not leak DB IDs of unrelated rows or other recipes' contents.
- [ ] **Customer-menu isolation**: kitchen-ingredient inventory MUST never appear in any customer-facing menu query (`isAvailable: true` filter alone is insufficient — add `kind: 'menu-item'` guard). Tests cover all 6 query touchpoints (`category-service.ts:32, 60, 91`, `express-actions.ts`, `order-edit-actions.ts:×2`).

**Additional high-risk testing:**

- [ ] **Independent review**: 2 human reviewers required per Risk-Tiered Review Policy (HIGH baseline + AI-involvement +1).
- [ ] **Penetration testing consideration**: not warranted — change is additive validation on existing endpoints, no new public auth surface, no external integrations introduced.
- [ ] **Transaction rollback test**: production-service test deliberately fails one ingredient deduction mid-batch; assert all prior deductions and the yield addition are rolled back; assert no `StockMovement` rows persist for the failed batch.

## Out of Scope (per design decision)

- **Soft-warn-with-override** for stock-out at production pre-flight. v1 is strict (block).
- **Threshold-driven production triggers** ("auto-make a batch when stock drops below N"). v1 is manual click only.
- **Scheduled morning prep** ("today we made: …"). v1 is manual click only.
- **Per-batch ingredient overrides** at production time (e.g. "I used 1.2kg salt instead of the recipe's 1kg"). v1 deducts exactly the recipe quantity × batchCount; variance is captured only on yield, not inputs.
- **Unit conversion factors** (e.g. recipe says "200g salt" against inventory in `kg`). REQ-033 is strict-match-only. Future enhancement.
- **Recipe versioning history** beyond `updatedAt` and the per-production `ingredientsDeducted` snapshot. Recipes are mutable; a production records what was actually consumed.
- **Multi-recipe per menu item** (e.g. two ways to make Pepper Soup). v1: 1 recipe per menu item; the recipe model doesn't enforce this but the builder UI does.
- **LAN-local sync between kitchen tablets**. Out of scope for offline (REQ from #72), more so here.
- **Recipe search / categorisation UI**. v1 is a flat list grouped by target menu item.

## Rollback / Recovery

Multiple-stage rollback because of the multi-collection nature:

1. **Pre-merge rollback**: revert the merge commit. The `Inventory.kind` backfill (`scripts/backfill-inventory-kind.ts`) is idempotent and additive — leaving the field in place after rollback is harmless.
2. **Mid-flight production-event rollback**: every Production has `stockMovementIds: ObjectId[]` for traceability. If a mistake is detected, super-admin runs `voidProduction(productionId)` within 24h: emits reversal `StockMovement` entries (additions for ingredients, deductions for yield), flips status to `'voided'`. Audit trail preserved; original entries not deleted.
3. **Auto-link Expense rollback**: editing or deleting an Expense with a `linkedInventoryId` voids the linked `StockMovement` automatically (creates reversal entry, doesn't delete). Original Expense row is the source of truth for what was bought.
4. **Backfill rollback**: `Inventory.kind` field can be removed by a reverse script if absolutely necessary (no row's behaviour depends on it being absent — the order-query filter falls back to "all inventory" if the field is missing). Not recommended; safer to leave the field in place.
