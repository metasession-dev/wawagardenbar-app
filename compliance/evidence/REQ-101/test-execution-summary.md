# Test Execution Summary — REQ-101

**Date:** 2026-09-04
**Implementation branch:** `feat/REQ-101-portion-size-report-split`

## Test design

**Layers planned:** unit only. Integration, browser-driven, visual regression, and manual smoke: not needed (see exemptions).

**Layers covered:** unit ✓ (3 new tests across 2 files, plus all 14 pre-existing tests in those files re-verified).

**Exemptions:**

- Integration — `NOT_NEEDED`: the change is confined to service-layer in-memory aggregation; fully exercised by the unit tests against the existing mocked Mongo/menu-item lookup chains already used by the pre-existing tests in both files.
- Browser-driven / visual regression — `NOT_NEEDED`: no UI-facing files (`app/**/*.tsx`, `components/**/*.tsx`, etc.) are touched. The report pages render whatever rows the service returns unchanged; only the row-grouping computation is corrected. No spec-authoring skill was invoked; no browser-test spec files were authored or edited. See `compliance/evidence/REQ-101/e2e-scope-decision.md`.
- Manual smoke after deploy — view Dashboard → Reports → Daily → Revenue tab for "Peppered Meat" on UAT (which already has the real mixed-portion order data from issue #689's investigation) and confirm two distinct rows now appear (₦1000 full-portion, ₦500 half-portion) instead of one blended ₦940 row.
- Full local regression pack — not run; not needed given the change has no UI/browser surface. CI's Quality Gates on the integration PR is the authoritative check.

## Gate results

| Gate                 | Result             | Details                                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript           | PASS               | `npx tsc --noEmit` — 0 errors                                                                                                                                                                                                                                                                    |
| ESLint               | PASS               | 0 errors on changed files (`services/financial-report-service.ts`, both test files); 984 pre-existing warnings elsewhere, unrelated to this REQ                                                                                                                                                  |
| Unit + integration   | PASS               | 1,387 passed, 4 skipped (full suite); 3 new tests for this REQ (1 in `main-category.test.ts`, 2 in `dynamic-main-categories.test.ts`), all pre-existing tests in both files pass                                                                                                                 |
| Browser-driven tests | NOT_NEEDED         | No UI-facing files touched — see exemption above                                                                                                                                                                                                                                                 |
| Build                | Not run this cycle | Production build not exercised locally; relies on CI Quality Gates on the integration PR                                                                                                                                                                                                         |
| npm audit            | PASS               | Resolved as part of `chore/devaudit-update-v1.2.5` (PR #690, merged to `develop` before this branch) — newly-disclosed `fast-uri`/`browserslist` advisories fixed, plus a real CI-side npm-version bug (npm 10.8.2 hitting a retired audit endpoint) fixed; this branch inherits the clean state |

## Test executions

| Source  | SDLC stage       | Execution | Kind | Outcome | Workflow / run                                                 | Related evidence                                                                                                        | Date       |
| ------- | ---------------- | --------- | ---- | ------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| REQ-101 | 2 implement/test | #1        | unit | passed  | Local Vitest; CI Quality Gates on the integration PR (pending) | 3 new tests (1 in `main-category.test.ts`, 2 in `dynamic-main-categories.test.ts`), full suite 1,387 passed / 4 skipped | 2026-09-04 |

## Test plan coverage

| Acceptance criterion                                               | Status | Test                                                                          |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| AC1 — Revenue tab splits full/half portion rows for the same item  | PASS   | `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` |
| AC2 — Costs tab likewise splits per portion size                   | PASS   | `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` |
| AC3 — Date-range / per-main-category report applies the same split | PASS   | `__tests__/services/financial-report-service.main-category.test.ts`           |
| AC4 — Full-portion-only items unaffected (regression pin)          | PASS   | `__tests__/services/financial-report-service.dynamic-main-categories.test.ts` |

## Accepted skips

None.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-101/`
- CI run: pending on this branch's push to `develop`

## Final assessment

Code and automated verification are complete for all 4 ACs, confirmed locally via unit tests including a regression pin against REQ-100's existing multi-price-same-portion behaviour. No browser-driven surface exists for this REQ, so no such coverage was needed. CI's Quality Gates on the integration PR is the authoritative gate check.
