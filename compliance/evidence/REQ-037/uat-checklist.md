# UAT Checklist — REQ-037 (Edit + archive + restore kitchen ingredients)

**Requirement:** Edit + archive + restore kitchen ingredients with safe-removal guard
**Issue:** [#83](https://github.com/metasession-dev/wawagardenbar-app/issues/83)
**Date:** 2026-05-16
**UAT environment:** `https://wawagardenbar-uat.up.railway.app/`

## What's automated vs manual

REQ-037 inherits the REQ-034 D11 pattern: **E2E asserts behaviour; manual UAT is thin.** The 15 E2E tests in `e2e/kitchen/inventory-crud.spec.ts` cover every AC1–AC5 behaviour (see `test-plan.md`). Residual manual UAT below is limited to (a) regression checks that are awkward to E2E, and (b) the sign-off ceremony.

## Pre-flight

- [ ] No schema migration required — `archivedAt` is an optional new field on Inventory + MenuItem with no impact on existing documents (defaults to undefined).

## Manual — historical-data regression check (one-off, hard to E2E)

- [ ] Author a kitchen ingredient, record a few StockMovements against it (via expense link), then **archive** the ingredient.
- [ ] Open the Audit Logs page (or wherever historical StockMovements render). Confirm the now-archived ingredient's StockMovement rows still render — the ingredient name (from the archived MenuItem) still resolves; no `[unknown]` / `null` references appear.
- [ ] (Same flow) Open the Expenses list. The Expense that linked to the now-archived ingredient still shows the ingredient name in any column / detail surface that surfaces the link.

## Sign-off

- [ ] All E2E tests in `e2e/kitchen/inventory-crud.spec.ts` green on develop CI
- [ ] Historical-data regression check above completed
- [ ] DevAudit / META-COMPLY UAT approval recorded
- [ ] PR merged to main

## Appendix — items removed from manual UAT (covered by E2E)

| Former manual step                                                     | Now asserted by                  |
| ---------------------------------------------------------------------- | -------------------------------- |
| Edit dialog pre-fills current values                                   | `inventory-crud.spec.ts` AC1     |
| Unit dropdown disabled with tooltip                                    | `inventory-crud.spec.ts` AC1     |
| Edit name + min/max + save + reload                                    | `inventory-crud.spec.ts` AC1+AC2 |
| Blank name / max < min validation                                      | `inventory-crud.spec.ts` AC2     |
| Archive confirmation dialog renders                                    | `inventory-crud.spec.ts` AC3     |
| Archive blocked by active recipe → error names recipe                  | `inventory-crud.spec.ts` AC3     |
| Deactivate recipe → retry archive succeeds                             | `inventory-crud.spec.ts` AC3     |
| Show archived toggle reveals archived rows with Restore action         | `inventory-crud.spec.ts` AC7     |
| Restore round-trip: archive → restore → row back in active + dropdowns | `inventory-crud.spec.ts` AC7     |
| Archive verb (not Delete) on dialog title + button                     | `inventory-crud.spec.ts` AC7     |
| Archived ingredient gone from Kitchen tab                              | `inventory-crud.spec.ts` AC4     |
| Archived ingredient gone from Recipe builder dropdown                  | `inventory-crud.spec.ts` AC4     |
| Archived ingredient gone from Expense form "Add to kitchen inventory"  | `inventory-crud.spec.ts` AC4     |
| Sellable tab count unchanged when a kitchen ingredient is archived     | `inventory-crud.spec.ts` AC4     |
