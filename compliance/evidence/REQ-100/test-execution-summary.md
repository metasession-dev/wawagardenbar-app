# Test Execution Summary — REQ-100

**Date:** 2026-08-27 (amended Iteration 1)
**Implementation branch:** `fix/REQ-100-kitchen-revenue-multi-price` (original), `fix/REQ-100-daily-and-range-report-multi-price` (Iteration 1)

## Requirements gap — Iteration 1

After the original fix (AC1–AC3, `generateMainCategoryReport()` only) was merged to `develop` and deployed to UAT, the operator found the **Daily Financial Report** page (`/dashboard/reports/daily`, powered by `generateDailySummary()`) still showing the original bug's exact symptom — this was, in fact, the actual page the original bug report's screenshot came from, not `generateMainCategoryReport()`. A third copy of the identical bug was found in `generateDateRangeReport()`. New ACs (AC4, AC5) were added; see `compliance/plans/REQ-100/implementation-plan.md` § Requirements gap — Iteration 1 for the full account.

## Test design

**Layers planned:** unit only. Integration, browser-driven, visual regression, and manual smoke: not needed (see exemptions).

**Layers covered:** unit ✓ (3 new tests across 2 files, plus all 11 pre-existing tests in those files re-verified).

**Exemptions:**

- Integration — `NOT_NEEDED`: the change is confined to service-layer in-memory aggregation; fully exercised by the unit tests against the existing mocked Mongo/menu-item lookup chains already used by the pre-existing tests in both files.
- Browser-driven / visual regression — `NOT_NEEDED`: no UI-facing files (`app/**/*.tsx`, `components/**/*.tsx`, etc.) are touched. The report pages render the same `price`/`total`/`costPerUnit` field shape unchanged; only the underlying computation is corrected. No spec-authoring skill was invoked; no browser-test spec files were authored or edited.
- Manual smoke after deploy — see plan §8: view `/dashboard/reports/by-main-category` **and** `/dashboard/reports/daily` for the Kitchen category on the business date that originally surfaced the bug (2026-08-24 on UAT) and confirm Total Kitchen Revenue reads ₦32,000 (not ₦25,000) and the Beef line reads ₦15,500 (not ₦8,500) on both. **This was already independently verified by the operator directly against the live UAT database** (recomputing with the identical logic now shipped) before this Iteration 1 evidence was compiled — see the release ticket.
- Full local regression pack — not run; not needed given the change has no UI/browser surface. CI's Quality Gates on the integration PR is the authoritative check.

## Gate results

| Gate                 | Result             | Details                                                                                                                                                                                |
| -------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript           | PASS               | `npx tsc --noEmit` — 0 errors                                                                                                                                                          |
| ESLint               | PASS               | 0 errors on changed files (`services/financial-report-service.ts`, both test files); 984 pre-existing warnings elsewhere, unrelated to this REQ                                        |
| Unit + integration   | PASS               | 1,384 passed, 4 skipped (full suite); 3 new tests for this REQ total (1 in `main-category.test.ts`, 2 in `dynamic-main-categories.test.ts`), all pre-existing tests in both files pass |
| Browser-driven tests | NOT_NEEDED         | No UI-facing files touched — see exemption above                                                                                                                                       |
| Build                | Not run this cycle | Production build not exercised locally; relies on CI Quality Gates on the integration PR                                                                                               |
| npm audit            | PASS               | Pre-existing accepted exceptions only (`compliance/security/accepted-vulnerabilities.json`, renewed 2026-08-26 to 2026-09-25); no new findings introduced by this REQ's diff           |

## Test executions

| Source  | SDLC stage       | Execution | Kind | Outcome | Workflow / run                                                 | Related evidence                                                                                                    | Date       |
| ------- | ---------------- | --------- | ---- | ------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| REQ-100 | 2 implement/test | #1        | unit | passed  | Local Vitest; CI Quality Gates on the integration PR (merged)  | 1 new test + 8 pre-existing in `financial-report-service.main-category.test.ts`, full suite 1,382 passed            | 2026-08-27 |
| REQ-100 | 2 implement/test | #2        | unit | passed  | Local Vitest; CI Quality Gates on the Iteration 1 PR (pending) | 2 new tests + 3 pre-existing in `financial-report-service.dynamic-main-categories.test.ts`, full suite 1,384 passed | 2026-08-27 |

## Test plan coverage

| Acceptance criterion                                                | Status | Test                                                                          |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| AC1 — revenue total correctness for an item sold at multiple prices | PASS   | `__tests__/services/financial-report-service.main-category.test.ts`           |
| AC2 — cost total correctness, same accumulation code path           | PASS   | `__tests__/services/financial-report-service.main-category.test.ts`           |
| AC3 — no regression for the single-price case                       | PASS   | 8 pre-existing tests in the same file                                         |
| AC4 — Daily Financial Report (`generateDailySummary`) correctness   | PASS   | `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` |
| AC5 — Date Range mode (`generateDateRangeReport`) correctness       | PASS   | `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` |

## Accepted skips

None.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-100/`
- CI run: original iteration — PR #678, merged; Iteration 1 — pending on its own PR push to `develop`

## Final assessment

Code and automated verification are complete for all 5 ACs, confirmed locally via unit tests, and additionally cross-checked by the operator directly against live UAT data for the exact business date from the original bug report. No browser-driven surface exists for this REQ, so no such coverage was needed. CI's Quality Gates on the integration PR is the authoritative gate check.
