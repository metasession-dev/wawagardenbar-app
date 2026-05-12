# Test Execution Summary — REQ-034

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-12
**Git SHA:** 9b19c430f0254f3616d0f0f18eff8f7d78ac69d9 (develop)
**CI Run:** [25703823360](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25703823360) (rerun green after META-COMPLY slug restore)

REQ-034 was delivered as a single bundled merge (`req-034/scaffold` →
`develop` at `4159c9c`) followed by a CVE-response patch on develop
(`9b19c43`). The Phase A / Phase B split named in the original test-plan
is preserved below for traceability, though both phases shipped together
per the 2026-05-09 user override.

## Gate Results

| Gate              | Result | Details                                                                                                                                                                                                                                                 |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript        | PASS   | `tsc --noEmit`: 0 errors. Evidence: `gates/tsc.txt`.                                                                                                                                                                                                    |
| SAST (Semgrep)    | PASS   | 0 findings, 0 errors on REQ-034 changed paths. Evidence: `gates/semgrep.json`.                                                                                                                                                                          |
| Dependency Audit  | PASS   | 0 unaccepted high/critical. CVE fix in `9b19c43` (next / fast-uri / fast-xml-builder). Remaining: 1 high `xlsx` (CI-allowlisted) + 3 moderates. Evidence: `gates/npm-audit.json`.                                                                       |
| Vitest unit suite | PASS   | 718 passed / 4 skipped (4 skipped = the `expense-form.add-to-inventory.test.tsx` AC5 component stub, excluded by `environment:'node'` config; AC5 covered by the `shouldShowAddToInventoryDropdown` pure helper). Evidence: `gates/vitest-summary.txt`. |
| Playwright E2E    | PASS   | New project `kitchen-recipe-and-production` registered in `playwright.config.ts`; 6 tests asserting AC4 / AC8 / AC10 / AC11 / AC13 / AC16 UI surfaces. Existing E2E suites unchanged. Evidence: uploaded to DevAudit via CI run 25703823360.            |
| Build             | PASS   | CI `npm run build` green. Evidence: CI artifact `ci-results`.                                                                                                                                                                                           |

## Test Changes in This Release

**Added:**

- `__tests__/lib/permissions-roles.test.ts` (step 1) — kitchen/bar/waiting role enum + permission map (36 tests).
- `__tests__/lib/inventory-kind.test.ts` (steps 2 + 3) — Inventory schema accepts `kind`; MenuItem schema mirrors; backfill helper idempotent (11 tests).
- `__tests__/services/category-service.kind-filter.test.ts` (step 3) — every customer-menu query filters `kind:'menu-item'` (7 tests).
- `__tests__/lib/inventory-tabs.test.ts` (step 4) — Sellable/Kitchen tab registry + role visibility (12 tests).
- `__tests__/lib/expense-inventory-link.test.ts` (step 5) — pure helpers for AC5/6/7 (21 tests).
- `__tests__/services/expense-inventory-link.test.ts` (step 5) — apply path (10 tests).
- `__tests__/services/expense-inventory-link.reversal.test.ts` (step 5) — reverse path + block-on-negative (9 tests).
- `__tests__/lib/admin-role-presets.test.ts` (step 7) — role dropdown helpers (19 tests).
- `__tests__/services/recipe-service.test.ts` (step 8) — AC8 validation (9 tests, was 9-test stub).
- `__tests__/services/recipe-service.deactivation.test.ts` (step 8 + 9) — AC16 (5 tests, was 5-test stub).
- `__tests__/lib/recipe-validation.test.ts` (step 8) — AC8/AC9 pure helpers (16 tests).
- `__tests__/lib/recipe-execution.test.ts` (step 10) — AC9/AC10/AC12/AC13 pure helpers (25 tests, was 16-test stub).
- `__tests__/services/production-service.preflight.test.ts` (step 9) — AC10 (4 tests, was 4-test stub).
- `__tests__/services/production-service.optimistic.test.ts` (step 9) — AC11 (9 tests, was 9-test stub).
- `__tests__/services/production-service.void.test.ts` (step 9) — AC13 (10 tests, was 10-test stub).
- `e2e/kitchen/recipe-and-production.spec.ts` (step 12) — kitchen flow E2E (6 tests, replaced stub).

**Updated:**

- `__tests__/services/expense-inventory-link.{test,reversal.test}.ts` — both scaffold stubs unskipped and filled in.
- `playwright.config.ts` — registered `kitchen-recipe-and-production` project.

**Removed:** none.

## Test Plan Coverage

(Mapping from `test-plan.md` AC ↔ test table.)

### Phase A

| AC  | Test                                                                  | Result | Notes                                                            |
| --- | --------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| AC1 | `__tests__/lib/inventory-kind.test.ts`                                | PASS   | Schema default 'menu-item'; backfill idempotent.                 |
| AC2 | `__tests__/services/category-service.kind-filter.test.ts`             | PASS   | All 10 customer-menu query sites guarded.                        |
| AC3 | `__tests__/lib/inventory-tabs.test.ts`                                | PASS   | Sellable/Kitchen split; kitchen tab hidden from kitchen role.    |
| AC4 | `__tests__/lib/permissions-roles.test.ts` + E2E AC4                   | PASS   | Three new roles + route allowlist.                               |
| AC5 | `__tests__/lib/expense-inventory-link.test.ts` (`shouldShow…` helper) | PASS   | TSX stub remains node-env-skipped; coverage via the pure helper. |
| AC6 | `__tests__/services/expense-inventory-link.test.ts`                   | PASS   | StockMovement + $inc + CostHistory + Expense back-ref.           |
| AC7 | `__tests__/services/expense-inventory-link.reversal.test.ts`          | PASS   | Reverse + block-on-negative naming the inventory + shortfall.    |

### Phase B

| AC   | Test                                                              | Result | Notes                                                   |
| ---- | ----------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| AC8  | `__tests__/services/recipe-service.test.ts`                       | PASS   | Target-kind, ingredient-kind, duplicates, yield, units. |
| AC9  | `__tests__/lib/recipe-execution.test.ts` (convertToInventoryUnit) | PASS   | Mass/volume conversion; count strict-id match.          |
| AC10 | `__tests__/services/production-service.preflight.test.ts`         | PASS   | Pre-flight shortage list + post-conversion comparison.  |
| AC11 | `__tests__/services/production-service.optimistic.test.ts`        | PASS   | Atomic deduction + reversal pass on partial failure.    |
| AC12 | `__tests__/lib/recipe-execution.test.ts` (computeYieldVariance)   | PASS   | actual − expected; under/over/zero variance.            |
| AC13 | `__tests__/services/production-service.void.test.ts`              | PASS   | Super-admin gate + 24h reasonNote rule + idempotency.   |
| AC14 | Regression: existing financial-report tests                       | PASS   | Per-portion COGS still computed via weighted-average.   |
| AC15 | Regression: existing customization-linked deduction tests         | PASS   | Customization deduction operates on `_id`, not `kind`.  |
| AC16 | `__tests__/services/recipe-service.deactivation.test.ts`          | PASS   | listActive filter + snapshot-independent void.          |
| E2E  | `e2e/kitchen/recipe-and-production.spec.ts`                       | PASS   | 6 surface-level UI tests; deeper integration in vitest. |

## Regression

- REQ-013 tip-amount field — untouched.
- REQ-026 Inventory + StockMovement audit log — extended (added `productionId` ref and `'production'` category) but the existing emission paths unchanged.
- REQ-030/031 customization-linked deduction — untouched (operates on inventory `_id`, not `kind`).
- REQ-032 financial-report aggregator — untouched.
- REQ-033 UoM registry — consumed read-only by `RecipeService` + `dimension-conversion.ts`.
- REQ-035/036 tip capture surfaces — untouched.

## Evidence Locations

| Evidence                  | Location                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| E2E results (JSON + HTML) | DevAudit: wawagardenbar-app / REQ-034 — uploaded by CI run 25703823360                                            |
| SAST results              | DevAudit (security_scan) + local `gates/semgrep.json`                                                             |
| Dependency audit          | DevAudit (security_scan) + local `gates/npm-audit.json`                                                           |
| TypeScript                | `gates/tsc.txt`                                                                                                   |
| Vitest summary            | `gates/vitest-summary.txt`                                                                                        |
| Playwright report         | DevAudit (test_report category) — CI artifact `ci-results`                                                        |
| Compliance docs           | Git: `compliance/evidence/REQ-034/`, `compliance/pending-releases/RELEASE-TICKET-REQ-034.md`, `compliance/RTM.md` |

## Defects

| ID  | Description                                                                                                                                                                                       | Discovered | Fixed in                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| D1  | First develop CI run on 4159c9c failed on Dependency Audit gate — 3 fresh CVEs (next / fast-uri / fast-xml-builder) published since the prior develop CI (2026-05-08). Unrelated to REQ-034 code. | 2026-05-12 | `9b19c43` — `npm audit fix` (lockfile-only update; no manifest changes; 718 tests still pass).   |
| D2  | Upload Evidence job 404'd on every DevAudit POST after CVE fix. META-COMPLY portal had lost the `wawagardenbar-app` project record between 2026-05-08 and 2026-05-12.                             | 2026-05-12 | META-COMPLY admin restored the project slug; `gh run rerun 25703823360 --failed` returned green. |
