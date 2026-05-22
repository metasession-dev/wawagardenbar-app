# Test Execution Summary — REQ-038

**Status:** SCAFFOLDED — pending implementation
**Date:** 2026-05-17 (scaffold) — TBD (execution)
**Git SHA:** TBD
**CI Run:** TBD

This file is a scaffold placeholder. It will be filled in after the REQ-038 implementation commits land on develop and CI runs green. Gate results, test deltas, and AC ↔ test mapping populated then.

## Planned Gate Results

| Gate              | Target                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| TypeScript        | 0 errors                                                                                           |
| SAST (Semgrep)    | 0 high/critical on changed paths                                                                   |
| Dependency Audit  | unchanged from REQ-037 closure baseline                                                            |
| Vitest unit suite | +12 new tests (5 helper + 5 service + 2 component)                                                 |
| Playwright E2E    | extended kitchen/expense-link.spec.ts (or new spec) with 5–6 walks; per-AC PNGs via `evidenceShot` |
| Build             | `npm run build` green                                                                              |

## Planned Test Changes

**Added:**

- `__tests__/components/menu-item-form.purchase-unit.test.tsx` — Purchase unit dropdown wiring (2 tests).

**Updated:**

- `__tests__/lib/expense-inventory-link.test.ts` — + `validateExpenseUnitAgainstOverride` 5 tests, generic over unit ids.
- `__tests__/services/expense-inventory-link.test.ts` — + sellable apply + override enforcement (5 tests).
- `__tests__/services/expense-inventory-link.reversal.test.ts` — + sellable reverse (2 tests).
- `e2e/kitchen/expense-link.spec.ts` — + 5–6 sellable walks (label, Bottles, Cans, Any, edit-reverse, customer-menu regression).

**Removed:**

- None.
