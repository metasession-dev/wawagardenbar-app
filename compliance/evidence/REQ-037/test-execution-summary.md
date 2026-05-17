# Test Execution Summary — REQ-037

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-16
**Git SHA:** 10e5dd8371987c6a7d47c1e47b02e585e9afe7cb (develop)
**CI Run:** [25957961541](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25957961541) (CI Pipeline, conclusion: success)

REQ-037 was delivered as four sequential develop commits:

| SHA       | Subject                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| `3cdca07` | compliance: [REQ-037] scaffold — edit + delete kitchen ingredients               |
| `86aaaa1` | feat: [REQ-037] edit + delete kitchen ingredients with safe-removal guard        |
| `85186e1` | fix: [REQ-037] preserve View Details on Kitchen tab rows alongside Edit + Delete |
| `10e5dd8` | refactor: [REQ-037] Delete → Archive + Restore (reversible verb pair)            |

The final commit `10e5dd8` carries the in-flight verb refactor (Delete → Archive + Restore) folded into the same release per the user's request, and is the SHA the develop→main PR will be cut from. CI ran green on all four commits.

## Gate Results

| Gate              | Result | Details                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript        | PASS   | `tsc --noEmit`: 0 errors. Verified locally on `10e5dd8`.                                                                                                                                                                                                                                                                                          |
| SAST (Semgrep)    | PASS   | 0 findings on REQ-037 changed paths. Uploaded to DevAudit by CI run 25957961541.                                                                                                                                                                                                                                                                  |
| Dependency Audit  | PASS   | 0 unaccepted high/critical. REQ-034-closure baseline preserved (1 high `xlsx` CI-allowlisted + 3 moderates unchanged). Uploaded to DevAudit by CI run 25957961541.                                                                                                                                                                                |
| Vitest unit suite | PASS   | **728 passed / 4 skipped** (was 720 / 4 at REQ-034 closure). +8 net over baseline: +3 update-action tests + restore happy-path / not-found / not-archived / kind / partial-write tests + 3 list-by-kind active/archived filter tests. The 4 skipped tests are the REQ-034 D7 `expense-form.add-to-inventory.test.tsx` component stub (unchanged). |
| Playwright E2E    | PASS   | New project `kitchen-inventory-crud` registered in `playwright.config.ts`; **20 tests** covering every AC1–AC7 surface. Existing E2E suites unchanged. Uploaded to DevAudit by CI run 25957961541.                                                                                                                                                |
| Build             | PASS   | CI `npm run build` green on every REQ-037 commit (25957961541 / 25957078385 / 25955847388).                                                                                                                                                                                                                                                       |

## Test Changes in This Release

**Added:**

- `__tests__/services/recipe-service.references.test.ts` — active-recipe guard for archive (5 tests).
- `__tests__/services/inventory-service.list-by-kind.test.ts` — `listByKind` excludes archived + `listArchivedByKind` filters `archivedAt: { $exists: true }` (3 tests).
- `e2e/kitchen/inventory-crud.spec.ts` — full AC1–AC7 surface coverage (20 tests).

**Updated:**

- `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — extended from REQ-034 / D7 baseline to cover update / archive / restore (41 tests total; +29 over the REQ-034 / D7 baseline once the rename Delete → Archive is included).
- `playwright.config.ts` — registered `kitchen-inventory-crud` project.

**Removed:** none.

## Test Plan Coverage

(Mapping from `test-plan.md` AC ↔ test table.)

| AC  | Test                                                                                                                                         | Result  | Notes                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| AC1 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` update happy-path + `inventory-crud.spec.ts` AC1 walks (5 E2E)                  | PASS    | Edit dialog pre-fills; Unit field disabled with tooltip; View Details preserved; 3 actions visible.         |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` update validation / auth / partial-write + `inventory-crud.spec.ts` AC2 (4 E2E) | PASS    | Auth gated; blank-name + max-lt-min validations rejected inline; partial-write surfaces clear error.        |
| AC3 | `__tests__/services/recipe-service.references.test.ts` + `inventory-crud.spec.ts` AC3 (4 E2E)                                                | PASS    | Active-recipe guard names offending recipes; deactivated recipes don't block.                               |
| AC4 | `__tests__/services/inventory-service.list-by-kind.test.ts` + `inventory-crud.spec.ts` AC4 (4 E2E)                                           | PASS    | Archived rows hidden from Kitchen tab + Recipe builder + Expense form dropdowns; Sellable count unaffected. |
| AC5 | tsc 0; vitest 728 pass / 4 skipped; E2E `kitchen-inventory-crud` project green on CI 25957961541                                             | PASS    | Delta +8 vitest over REQ-034 closure baseline; +20 Playwright tests.                                        |
| AC6 | `compliance/evidence/REQ-037/uat-checklist.md` walkthrough                                                                                   | PENDING | Manual UAT scheduled with operator post-merge UAT environment refresh.                                      |
| AC7 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` restore branch + `inventory-crud.spec.ts` AC7 (3 E2E)                           | PASS    | Restore round-trip; Show archived toggle; Archive verb honoured (no Delete).                                |

## Regression

- REQ-034 Expense → Inventory link (D10 unit conversion path) — untouched.
- REQ-034 Recipe builder + production — only the ingredient listing changes (archived filter at the source method).
- REQ-034 customer-menu filter — unaffected.
- REQ-033 UoM registry — consumed read-only by the Edit dialog's locked Unit field.
- REQ-026 StockMovement / CostHistory audit log — unaffected; soft-archive preserves all back-refs.
- Daily Financial Report — unaffected; cost-history rows remain valid for weighted-average calculations.

## Evidence Locations

| Evidence                  | Location                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| E2E results (JSON + HTML) | DevAudit: wawagardenbar-app / REQ-037 — uploaded by CI run 25957961541                                            |
| SAST results              | DevAudit (security_scan) — CI run 25957961541                                                                     |
| Dependency audit          | DevAudit (security_scan) — CI run 25957961541                                                                     |
| TypeScript                | Verified locally on `10e5dd8`; CI step output                                                                     |
| Vitest summary            | CI run 25957961541 step output                                                                                    |
| Playwright report         | DevAudit (test_report category) — CI artifact from run 25957961541                                                |
| Compliance docs           | Git: `compliance/evidence/REQ-037/`, `compliance/pending-releases/RELEASE-TICKET-REQ-037.md`, `compliance/RTM.md` |

## Defects

None discovered during REQ-037 implementation or test execution. The one in-flight design change (Delete → Archive + Restore verb refactor) was an operator-driven UX improvement requested mid-stream and folded into the same release as commit `10e5dd8`, not a defect. The "all screenshots captured are exactly the same screen" UAT-evidence concern surfaced on 2026-05-17 is tracked as upstream template-gap [METACOMPLY-308](https://github.com/metasession-dev/devaudit/issues/308) — not a REQ-037 defect.
