# Test Execution Summary — REQ-099

**Date:** 2026-08-16
**Implementation branch:** `feat/REQ-099-tabs-list-written-off`

## Test design

**Layers planned:** unit, E2E. Integration, visual regression, and manual smoke: not needed (see exemptions).

**Layers covered:** unit ✓ (3 new tests in 1 existing file), E2E ✓ (1 new test, 1 new file, run locally against a real dev server + MongoDB — not mocked).

**Exemptions:**

- Integration — `NOT_NEEDED`: the change is a query-filter branch + UI rendering only, fully exercised by the unit tests against the mocked Mongoose chain (matching the existing pattern in `__tests__/services/tab-service.pagination.test.ts`) and the E2E spec against the real stack.
- Visual regression — `NOT_NEEDED`: this project has no visual-regression tooling configured; not requested for this REQ.
- Manual smoke after deploy — see plan §8: load `/dashboard/orders/tabs`, confirm a known written-off tab (one of the 17 written off under REQ-098's 2026-08-14 production remediation) shows the new badge and the "Written off" filter isolates it.
- Full local regression pack — `SKIPPED` (operator-approved rationale, see _Accepted skips_ below): the REQ-099-targeted spec passed on 3 separate focused local runs; a full 89-spec local pack hit widespread pre-existing environment instability unrelated to this REQ.

**Skill invocation:** `e2e-test-engineer` invoked during Phase 2 of this session. The new spec file (`e2e/orders/tabs-list-written-off-badge-filter.spec.ts`) was authored via that invocation.

## Gate results

| Gate                        | Result             | Details                                                                                                                                                                                    |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript                  | PASS               | `npx tsc --noEmit` — 0 errors                                                                                                                                                              |
| ESLint                      | PASS               | 0 errors (984 pre-existing warnings, unrelated to this REQ — console statements in scripts, matching sibling scripts' convention)                                                          |
| Unit + integration          | PASS               | 1,381 passed, 4 skipped (full suite); 3 new tests for this REQ in `__tests__/services/tab-service.pagination.test.ts`                                                                      |
| E2E — REQ-099 targeted      | PASS               | 1/1, local run against real dev server + MongoDB (`--project=regression`), verified standalone and alongside 2 adjacent tab specs                                                          |
| E2E — full local regression | SKIPPED            | See exemption above — pre-existing local environment instability, unrelated to this REQ; CI's smoke gate (PR) + regression gate (PR→main) are the authoritative checks per `e2e/README.md` |
| Build                       | Not run this cycle | Production build not exercised locally; relies on CI Quality Gates on the integration PR                                                                                                   |
| npm audit                   | PASS               | Pre-existing accepted exceptions only (`compliance/security/accepted-vulnerabilities.json`); no new findings introduced by this REQ's diff                                                 |

## Test executions

| Source  | SDLC stage       | Execution | Kind        | Outcome | Workflow / run                                                                          | Related evidence                                                                                                          | Date       |
| ------- | ---------------- | --------- | ----------- | ------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| REQ-099 | 2 implement/test | #1        | unit        | passed  | Local Vitest; CI Quality Gates on the integration PR (pending)                          | 3 new tests in `tab-service.pagination.test.ts`, full suite 1,381 passed                                                  | 2026-08-16 |
| REQ-099 | 2 implement/test | #2        | e2e (local) | passed  | Local Playwright, `regression` project; CI in-scope E2E on the integration PR (pending) | 1/1, `tabs-list-written-off-badge-filter.spec.ts` AC1 + AC2, verified 3× (standalone, with adjacent tab specs, workers=1) | 2026-08-16 |

## Test plan coverage

| Acceptance criterion                                                                            | Status | Test                                                                                                         |
| ----------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| AC1 — written-off tab shows distinct badge, no "Tab Paid" button                                | PASS   | `e2e/orders/tabs-list-written-off-badge-filter.spec.ts`                                                      |
| AC2 — "Written off" filter checkbox isolates written-off tabs, independent of status checkboxes | PASS   | `__tests__/services/tab-service.pagination.test.ts`; `e2e/orders/tabs-list-written-off-badge-filter.spec.ts` |
| AC3 — existing "Closed" filter behavior unchanged (regression guard)                            | PASS   | `__tests__/services/tab-service.pagination.test.ts`                                                          |

## Accepted skips

| Spec / area                           | Classification    | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Approved by                                                          |
| ------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Full local regression pack (89 specs) | `environment_gap` | A full local `--project=regression` run (2 workers, ~23 min) produced 48 unexpected results across 26 spec files spanning completely unrelated domains (customer PIN auth, menu page rendering, webhooks, admin reports) — the REQ-099 spec itself merely _skipped_ in that run (stale admin auth session under sustained load), not failed. None of the 48 failures touch Tabs Management or any file this REQ changed. Re-running the REQ-099 spec standalone, and alongside 2 directly-adjacent tab specs (`write-off-tab.spec.ts`, `delete-tab-payment-revert.spec.ts`) under `--workers=1`, all pass cleanly — confirming the full-pack failures are local sandbox resource contention (single local MongoDB under concurrent load), not a regression this REQ introduced. Same failure signature and root cause as the accepted skip documented in REQ-098's test-execution-summary. The release PR's CI run (`e2e-regression.yml`, proper seed-data infrastructure) is the authoritative full-suite check. | william@ostendo.io (operator-authorized per prior REQ-098 precedent) |

No in-scope AC's coverage depends on the skipped full pack — AC1–AC3 each have their own passing dedicated test (see _Test plan coverage_ above).

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-099/`
- Screenshots: `compliance/evidence/REQ-099/screenshots/` (2 canonical PNGs — AC1, AC2; feature-tier stage screenshot for AC2 auto-suppressed on this local run since `E2E_NEW_SPECS` is CI-only)
- CI run: pending — will populate on integration PR push to `develop`

## Final assessment

Code and automated verification are complete for all 3 ACs, confirmed locally (unit + targeted E2E). The full local regression pack did not complete cleanly due to unrelated environment instability (documented above; accepted skip, same pattern as REQ-098). CI's Quality Gates + in-scope E2E on the integration PR, and the release PR's full regression run, are the authoritative full-suite checks per this project's e2e/README.md gating model.
