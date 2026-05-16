# Release Ticket: REQ-037 — Edit + archive + restore kitchen ingredients (with safe-removal guard for active recipes)

**Status:** SCAFFOLDED
**Date:** 2026-05-16
**Requirement ID:** REQ-037
**Risk Level:** MEDIUM (touches inventory data; archive/restore preserve audit-trail integrity; active-recipe guard is the load-bearing safety check)
**Issue:** [#83](https://github.com/metasession-dev/wawagardenbar-app/issues/83)
**Depends on:** REQ-034 (#74) — Kitchen Management feature (closed 2026-05-15)
**PR plan:** Single bundled PR develop → main after UAT (consistent with REQ-034 pattern)

---

## Summary

Completes CRUD on the kitchen-ingredient surface shipped under REQ-034.

1. **Edit** kitchen ingredient — name, COGS category, min/max stock thresholds. Unit and currentStock are excluded to preserve audit-trail integrity (changing the unit retroactively would corrupt every StockMovement, CostHistory row, and Recipe row referencing the ingredient; changing currentStock silently bypasses the StockMovement audit log).
2. **Delete** kitchen ingredient — **soft** (`archivedAt: Date` on both paired MenuItem + Inventory), not physical. Historical StockMovement / Expense / CostHistory back-refs remain valid. Listing surfaces (Inventory Kitchen tab, Recipe builder dropdown, Expense form "Add to kitchen inventory") filter archived rows from a single source.
3. **Safe-removal guard** — delete is blocked when any active recipe references the ingredient. The error names the offending recipes so the operator can deactivate them first. Deactivated recipes are not a blocker.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** schema additions, server actions (update / archive / restore), service helpers (`findActiveRecipesReferencingInventory`, `listArchivedByKind`), Edit + Archive dialog components, Show archived toggle + Restore UI, archived-row filter additions, all SDLC artefacts, all tests, all commit messages.
- **Human Reviewer of AI Code:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy)
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-037/ai-prompts.md`

---

## Implementation Details

(See `compliance/evidence/REQ-037/test-plan.md` for the canonical AC list + AC↔test mapping.)

### Files Created

- `compliance/evidence/REQ-037/{test-plan,security-summary,ai-prompts,uat-checklist}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-037.md` (this file)
- `components/features/admin/edit-kitchen-ingredient-dialog.tsx`
- `components/features/admin/archive-kitchen-ingredient-dialog.tsx`
- `__tests__/services/recipe-service.references.test.ts`
- `__tests__/services/inventory-service.list-by-kind.test.ts` (archived-filter regression)
- `e2e/kitchen/inventory-crud.spec.ts` (17 tests covering all AC1–AC5 surfaces)

### Files Modified

- `models/inventory-model.ts` (+ `archivedAt`)
- `models/menu-item-model.ts` (+ `archivedAt`)
- `interfaces/{inventory,menu-item}.interface.ts` (mirror)
- `services/inventory-service.ts` (`listByKind` excludes archived)
- `services/recipe-service.ts` (+ `findActiveRecipesReferencingInventory`)
- `app/actions/admin/kitchen-ingredient-actions.ts` (+ `updateKitchenIngredientAction`, `archiveKitchenIngredientAction`, `restoreKitchenIngredientAction`)
- `app/actions/finance/pending-expense-actions.ts` (kitchen-inventory list excludes archived)
- `components/features/admin/inventory-items-client.tsx` (Edit + Delete row actions on Kitchen tab)
- `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` (extended)
- `playwright.config.ts` (register new project)
- `compliance/RTM.md`

### Schema additions

- `Inventory.archivedAt?: Date` (default undefined; soft-delete marker)
- `MenuItem.archivedAt?: Date` (default undefined; soft-delete marker; paired with Inventory)

No migration required — both fields are optional and absent on existing documents.

---

## Acceptance Criteria

See `compliance/evidence/REQ-037/test-plan.md`.

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`) — `gates/tsc.txt`
- [ ] Unit tests: green (target ≥ +14 new tests over REQ-034-closure baseline) — `gates/vitest-summary.txt`
- [ ] E2E: new `kitchen-inventory-crud` Playwright project — 17 tests covering AC1–AC5; CI run green
- [ ] Build: `npm run build` green
- [ ] Semgrep: 0 findings on changed paths — `gates/semgrep.json`
- [ ] Dependency audit: 0 unaccepted high/critical — `gates/npm-audit.json`
- [ ] CI Pipeline: green on develop
- [ ] Compliance evidence uploaded to META-COMPLY

---

## Rollback Plan

If a defect surfaces in production after merge:

1. **No data corruption risk.** Soft-delete preserves all historical refs; revert is safe.
2. Revert the bundled PR via `git revert -m 1 <merge-sha>` on a hotfix branch → PR to main.
3. The `archivedAt` fields persist on documents that were soft-deleted before revert; they're optional + ignored by all queries that don't filter on them, so they're benign. A future re-deploy of REQ-037 will pick them up correctly.
4. No backfill / cleanup required post-revert.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] META-COMPLY / DevAudit UAT approval obtained
- [ ] PR merged to main
- [ ] Historical-data regression check on prod (UAT-checklist manual step)
- [ ] Production smoke (operator creates an ingredient, edits it, attempts a blocked archive, completes an archive, restores from Show archived)

---

## Audit Trail

| Date       | Action                 | Actor           | Notes                                                                                                                                                                                                                                              |
| ---------- | ---------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-15 | Issue filed            | ostendo-io      | #83 filed in response to operator request after REQ-034 closure.                                                                                                                                                                                   |
| 2026-05-16 | Requirement scaffolded | ostendo-io + AI | MEDIUM risk; RTM row added; evidence skeleton + this ticket created; single scaffold commit, no code yet. E2E test-plan enumerates 15 individual tests covering every AC1–AC5 behaviour per the user's instruction to maximise automated coverage. |
