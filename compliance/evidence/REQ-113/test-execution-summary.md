# Test Execution Summary — REQ-113

**Date:** 2026-10-23
**Implementation branch:** `feat/REQ-113-printable-a4-menu`, rebased onto `develop` `8179c14` (after REQ-114, the zod 4 upgrade, merged)

## Test design

**Layers planned:** unit, E2E (regression tier), type-check, lint, dependency gate. Visual regression is `NOT_NEEDED` because the project has no visual-regression tooling.

**Layers covered:** unit ✓; E2E ✓ (a new regression-tier spec, plus the full regression pack before and after the rebase); type-check ✓; lint ✓; dependency gate ✓.

**Exemptions:**

- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured. Every UI-facing AC has an `evidenceShot` screenshot, and PDF output is checked against the real jsPDF in `__tests__/lib/menu-print/render-pdf.test.ts`.
- **AC13, AC15, AC16, AC19 and AC20 have no E2E:** they are layout or theme properties with no separate UI surface. Vitest proves them in the layout, themes and render-pdf tests (see `e2e-scope-decision.md`).
- **Manual check (build guide Part 8):** four PDFs covering both orientations, both templates and 1–3 columns, one printed on A4. The operator does this before UAT sign-off.

**Skill invocation:**

- `e2e-test-engineer` was invoked in Phase 2 (2026-10-23). It authored `e2e/admin/menu-print.spec.ts` (regression tier, since REQ-MENUMGT-011 is a Should) and ran the full-regression comparisons.
- `requirements-aligner`, `adr-author` and `risk-register-keeper` were invoked at Stage 1 and Stage 3.

## Gate results

| Gate                  | Result | Details                                                                                                                                                                                   |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit      | PASS   | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` are unchanged from `develop`                                                          |
| TypeScript            | PASS   | `npx tsc --noEmit`: 0 errors after the rebase                                                                                                                                             |
| ESLint                | PASS   | 0 errors; 1000 pre-existing warnings                                                                                                                                                      |
| Unit + integration    | PASS   | Full suite after the rebase: 1644 passed, 4 skipped. That includes the 60 REQ-113 tests in `__tests__/lib/menu-print/` (5 files) and `__tests__/actions/admin/menu-print-actions.test.ts` |
| E2E (new spec)        | PASS   | `e2e/admin/menu-print.spec.ts`: 10/10 after the rebase, run together with REQ-114's `zod-validation-messages` spec (13/13 including setup)                                                |
| E2E (full regression) | PASS   | After the rebase: 545 passed, 9 failed, 43 skipped or not run. None of the 9 failures is caused by this REQ; all are triaged below and tracked in #957                                    |

## Test executions

| Source  | SDLC stage       | Execution | Kind                    | Outcome | Workflow / run                                                                                                          | Related evidence                                                                                                       | Date       |
| ------- | ---------------- | --------- | ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| REQ-113 | 2 implement/test | #1        | unit                    | passed  | Local Vitest, REQ-113 files                                                                                             | 58 passed before the rebase; 2 slug-validation cases added at Stage 3 (60)                                             | 2026-10-23 |
| REQ-113 | 2 implement/test | #2        | e2e (full regression)   | failed  | Local Playwright `regression` project, 2 workers, local `mongo:7` + CI seed scripts, before the rebase (zod 3)          | 537 passed, 13 failed. `menu-print.spec.ts:241` was this REQ's own test bug; the other 12 are not REQ-113's            | 2026-10-23 |
| REQ-113 | 2 implement/test | #3        | e2e (isolation re-runs) | failed  | Local Playwright: the 13 failures from #2 re-run alone, on the branch and on `develop`                                  | Branch: 4 still fail (2 webhook specs, `cash-tags` 252 and 512); `develop`: webhook specs and `cash-tags` 512 fail too | 2026-10-23 |
| REQ-113 | 2 implement/test | #4        | e2e (new spec)          | passed  | Local Playwright `e2e/admin/menu-print.spec.ts` after the hydration-wait fix                                            | `compliance/evidence/REQ-113/screenshots/`                                                                             | 2026-10-23 |
| REQ-113 | 3 evidence       | #5        | unit                    | passed  | Local Vitest full suite after the rebase onto `8179c14`                                                                 | 1644 passed, 4 skipped                                                                                                 | 2026-10-23 |
| REQ-113 | 3 evidence       | #6        | e2e (new spec)          | passed  | Local Playwright, `menu-print` + `zod-validation-messages` specs after the rebase                                       | 13/13; screenshots refreshed                                                                                           | 2026-10-23 |
| REQ-113 | 3 evidence       | #7        | e2e (full regression)   | failed  | Local Playwright `regression` project, 2 workers, after the rebase (zod 4)                                              | 545 passed, 9 failed. None is REQ-113's; all are triaged below                                                         | 2026-10-23 |
| REQ-113 | 3 evidence       | #8        | e2e (isolation re-runs) | failed  | Local Playwright: new failures from #7 re-run alone (whole spec files where tests are serial), plus `develop` `8179c14` | `profitability-attribution:21` fails on the branch **and** on `develop`; the other three pass                          | 2026-10-23 |

The portal's first-class test-execution read model was not queried, because this session has no `DEVAUDIT_API_KEY`. The CI runs on the integration PR and on `develop` are the authoritative executions, and CI records them.

## E2E failures & triage

| Spec / check                                                      | Source            | Classification | Evidence                                                                                                                                                                                                                                                                        | Disposition | Reference                                                                           |
| ----------------------------------------------------------------- | ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `e2e/admin/menu-print.spec.ts:241` (AC2–AC4)                      | local exec #2     | test bug       | The test clicked before React hydrated the form. Fixed by waiting for the button's `__reactFiber$` key in `openPrintPage` (commit "wait for hydration before driving the print form"); 10/10 since                                                                              | Fix         | https://github.com/metasession-dev/wawagardenbar-app/issues/954 (fixed in this REQ) |
| `e2e/reports/profitability-attribution.spec.ts:21` (REQ-094)      | local exec #7, #8 | test bug       | Pre-existing test bug in REQ-094's spec: it relies on the default period. Fails identically on `develop` `8179c14` at the same time. The run was after midnight `Africa/Lagos`, so the default period is a business day with no orders yet. Passed in exec #2 (before midnight) | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/webhook-idempotency-replay.spec.ts:167`             | local exec #2, #7 | seed-data gap  | Needs `MONNIFY_SECRET_KEY`, which isn't set locally; fails identically on `develop`                                                                                                                                                                                             | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/webhook-signature-rejection.spec.ts:129`            | local exec #2, #7 | seed-data gap  | Needs payment-provider secrets that aren't set locally; fails identically on `develop`                                                                                                                                                                                          | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/finance/cash-tags-and-edit.spec.ts:512`                      | local exec #2     | app defect     | Pre-existing on `develop`, root cause not yet known: also fails in isolation on `develop` (exec #3). Passed in exec #7                                                                                                                                                          | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/finance/cash-tags-and-edit.spec.ts:252`                      | local exec #2, #7 | flake          | Failed in isolation once in exec #3, then passed 2/2 alone during REQ-114's verification; no menu-print code is in the cash-position path                                                                                                                                       | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/finance/cash-tags-and-edit.spec.ts:467`                      | local exec #2     | flake          | Passes in isolation (exec #3); passed in exec #7                                                                                                                                                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/admin-order-inventory-delta.over-sell.spec.ts:296`  | local exec #2, #7 | flake          | Passes in isolation on both `develop` and this branch; fails under load in every full run, including REQ-114's                                                                                                                                                                  | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/admin-order-inventory-delta.sale-point.spec.ts:300` | local exec #2, #7 | flake          | Passes in isolation on both `develop` and this branch; fails under load in every full run, including REQ-114's                                                                                                                                                                  | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/express-order-report.spec.ts:328`                   | local exec #7     | flake          | The whole spec passes 30/30 alone (exec #8); passed in exec #2 and in REQ-114's run                                                                                                                                                                                             | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/admin/menu-edit-all.spec.ts:329`                             | local exec #7     | flake          | Passes 2/2 alone with retries off (exec #8). REQ-113 adds only a toolbar button to `/dashboard/menu`; Edit All is unchanged                                                                                                                                                     | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/admin/menu-edit-all.spec.ts:132`                             | local exec #2     | flake          | Passes in isolation (exec #3); passed in exec #7                                                                                                                                                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/admin/price-management-triple-price.spec.ts:128`             | local exec #7     | flake          | Passes 2/2 alone with retries off (exec #8); passed in exec #2                                                                                                                                                                                                                  | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/admin/pricing-windows.spec.ts:70`                            | local exec #2     | flake          | Passes in isolation (exec #3); passed in exec #7                                                                                                                                                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/express-order-portion-pricing-req097.spec.ts:174`   | local exec #2     | flake          | Passes in isolation (exec #3); passed in exec #7                                                                                                                                                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/kitchen/inventory-crud.spec.ts:316`                          | local exec #2     | flake          | Passes in isolation (exec #3); passed in exec #7                                                                                                                                                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/kitchen/inventory-crud.spec.ts:550`                          | local exec #2     | flake          | Passes in isolation (exec #3); passed in exec #7                                                                                                                                                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |

## Test plan coverage

All 20 ACs pass. AC-by-AC tests are listed in `compliance/evidence/REQ-113/test-plan.md`:

- **Unit:** `__tests__/lib/menu-print/{format,build-menu-print-model,themes,layout,render-pdf}.test.ts` and `__tests__/actions/admin/menu-print-actions.test.ts`.
- **E2E:** `e2e/admin/menu-print.spec.ts` covers AC1–AC12, AC14, AC17 and AC18, each with `tagTest('REQ-113', …)` and an `evidenceShot`.
- **Unit only:** AC13, AC15, AC16, AC19 and AC20.

## Accepted skips

None. The skipped and not-run tests are pre-existing environment skips and serial-block dependants in other REQs' specs. None of them covers a REQ-113 AC.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-113/`
- Screenshots: `compliance/evidence/REQ-113/screenshots/` (AC1–AC12, AC14, AC17, AC18)
- Tracking issue for pre-existing E2E failures: #957
- CI runs: on the integration PR for `feat/REQ-113-printable-a4-menu`, and on `develop` after merge

## Final assessment

All 20 ACs pass at unit and/or E2E level on the rebased branch, with zod 4. REQ-113 caused one E2E failure in its own new spec, a hydration-timing test bug, which is fixed. Every other failure from every execution is classified above as pre-existing, environmental or a load flake, and is tracked in #957. None involves the print page, the menu-print modules or the data action.

## Bundled Release Context

- **Core tracked release:** `REQ-113`
- **Absorbed predecessor releases:** `REQ-114`, the zod 3 → 4 upgrade (#956, PR #958). It merged to `develop` first and has not yet been released to `main`.
- **Absorbed non-release work:** the housekeeping commits REQ-114 already carried since `origin/main`: `ff2171b` (#955), `208f3da` (#952), `4ee226e` (#951) and `055ddb4` (#950). See `compliance/pending-releases/BUNDLED-CHANGES-REQ-113.md`.
- **Why bundled here:** REQ-113 is rebased onto REQ-114 and its code depends on it, because `menu-print-actions.ts` imports `z` from `@/lib/zod`. REQ-114's commits are in `origin/main..HEAD`, so they ship under this release.
- **Evidence impact:** Evidence ownership stays with each source. REQ-114's evidence is in `compliance/evidence/REQ-114/`, and nothing in it is relabelled as REQ-113's. The tests above cover REQ-113 and were run on top of REQ-114.
- **Reviewer impact:** UAT and Production approval covers REQ-113, plus REQ-114 and the four housekeeping commits.
- **Security / risk impact:** REQ-114 is itself a security fix (GHSA-mrhx-c7xc-m3w5), with risks R-038 and R-039 reviewed in PR #958. Bundling adds no risk, and REQ-113 adds none to the register (LOW, `@risk-deferred`).
- **Reference:** commit range `origin/main..HEAD`
