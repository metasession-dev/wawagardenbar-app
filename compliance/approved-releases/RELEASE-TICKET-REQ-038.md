# Release Ticket: REQ-038 — Restock sellable inventory from expense + per-MenuItem expense unit override

**Status:** SCAFFOLDED
**Date:** 2026-05-17
**Requirement ID:** REQ-038
**Risk Level:** MEDIUM (financial-data write path exercised; cross-kind service relaxation; new server-side safety check)
**Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**Depends on:** REQ-034 (#74) — original Kitchen Management feature with expense → inventory link; REQ-033 — UoM registry; REQ-037 (#83) — soft-archive filter
**PR plan:** Bundled PR with REQ-039 (#88) + REQ-040 (#89) develop → main

---

## Summary

Builds the **sellable-side** counterpart to REQ-034's kitchen-ingredient restock path. When the operator buys a case of 24 bottles, the Expense form now offers a sellable dropdown ("Update inventory count") that bumps the matching MenuItem's Inventory `currentStock` and creates the usual StockMovement / CostHistory audit trail.

Adds a per-MenuItem **`expenseUnitOverride`** that locks the Expense form's Unit field to the chosen unit (Bottles, Cans, Bags, Pieces, …) when restocking that item — so the operator can't accidentally type "5" (5 what?) into a unit-tracked inventory. Service-side enforcement is the load-bearing safety check; UI lock is defence in depth.

The Purchase unit dropdown is **generic over the UoM registry** — new units added in Settings → Units of Measurement auto-appear; no code change to support cans, crates, cases, kegs, growlers, or whatever else gets added.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** schema additions, server action edits, service helpers, UI form changes, pure helper (`validateExpenseUnitAgainstOverride`), all SDLC artefacts, all tests, all commit messages.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-038/ai-prompts.md`

---

## Implementation Details

(See `compliance/evidence/REQ-038/test-plan.md` + `implementation-plan.md` for the canonical AC list + order of work.)

### Files Created

- `compliance/evidence/REQ-038/{test-plan,test-scope,security-summary,implementation-plan,ai-prompts,uat-checklist,test-execution-summary}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-038.md` (this file)
- `__tests__/components/menu-item-form.purchase-unit.test.tsx`
- `e2e/expense-sellable-restock.spec.ts` _(optional; may extend `kitchen/expense-link.spec.ts` instead)_

### Files Modified

- `interfaces/menu-item.interface.ts` (+ `expenseUnitOverride?: string`)
- `models/menu-item-model.ts` (mirror)
- `services/expense-inventory-link-service.ts` (relax kind guard; add override enforcement before $inc)
- `lib/expense-inventory-link.ts` (+ `validateExpenseUnitAgainstOverride` helper)
- `components/features/admin/menu-item-form.tsx` (+ Purchase unit dropdown)
- `components/features/finance/expense-form.tsx` (rename label + add sellable surface + Unit lock)
- `__tests__/lib/expense-inventory-link.test.ts` (+ 5 helper tests)
- `__tests__/services/expense-inventory-link.test.ts` (+ 5 sellable + enforcement tests)
- `__tests__/services/expense-inventory-link.reversal.test.ts` (+ 2 sellable reverse tests)
- `e2e/kitchen/expense-link.spec.ts` (extend or split out)
- `compliance/RTM.md`

### Schema additions

- `MenuItem.expenseUnitOverride?: string` (UoM-registry id; default undefined; absent on legacy MenuItems)

No migration required.

---

## Acceptance Criteria

See `compliance/evidence/REQ-038/test-plan.md`.

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Unit tests: green (+12 new tests)
- [ ] E2E: extended kitchen/expense-link suite (or new sellable-restock spec) green; per-AC PNGs uploaded under `compliance/evidence/REQ-038/screenshots/`
- [ ] Build: `npm run build` green
- [ ] Semgrep: 0 findings on changed paths
- [ ] Dependency audit: 0 unaccepted high/critical
- [ ] CI Pipeline: green on develop
- [ ] Compliance evidence uploaded to META-COMPLY

---

## Rollback Plan

Single-commit revert.

1. `expenseUnitOverride` on existing MenuItem documents is benign (no query filter depends on it).
2. Relaxed kind guard returns to its REQ-034 shape; sellable-link writes stop.
3. UI surfaces revert to pre-REQ-038 shapes; "Update inventory count" checkbox + sellable dropdown disappear.
4. No backfill / cleanup required post-revert.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] META-COMPLY / DevAudit UAT approval obtained
- [ ] PR merged to main
- [ ] Cross-unit verification (Bottles + Cans) walked on UAT per uat-checklist.md
- [ ] Customer-menu regression check walked on UAT

---

## Audit Trail

| Date       | Action                 | Actor           | Notes                                                                                                                                                                                                        |
| ---------- | ---------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-15 | Issue filed            | ostendo-io      | #84 filed after operator request to add a sellable restock path parallel to REQ-034's kitchen-ingredient flow.                                                                                               |
| 2026-05-15 | Design refined         | ostendo-io + AI | Operator pushed back on the initial "Is Bottles" toggle design as too narrow. Redesigned as a single "Purchase unit" dropdown sourced from the UoM registry, with "Any" as the off state. Issue #84 updated. |
| 2026-05-17 | Requirement scaffolded | ostendo-io + AI | MEDIUM risk; RTM row added; full evidence skeleton (7 markdown files) + this ticket created; no code yet. Will ship in the bundled PR with REQ-039 + REQ-040.                                                |
