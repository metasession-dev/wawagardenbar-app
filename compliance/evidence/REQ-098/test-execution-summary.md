# Test Execution Summary — REQ-098

**Date:** 2026-08-03
**Implementation branch:** `feat/REQ-098-dormant-tab-write-off`

## Test design

**Layers planned:** unit, integration, E2E. Visual regression and manual smoke: not needed (see exemptions).

**Layers covered:** unit ✓ (35 new tests across 6 files), integration ✓ (financial-report-service written-off section), E2E ✓ (2 tests in 2 new files, run locally against a real dev server + MongoDB — not mocked).

**Exemptions:**

- Visual regression — `NOT_NEEDED`: this project has no visual-regression tooling configured; not requested for this REQ.
- Manual smoke after deploy — see plan §8: verify the new "Written off (bad debt)" report section against real (non-destructive) data; verify the dormancy incident appears for a genuinely dormant tab in a lower environment before the remediation script ever touches production.
- Full adjacent-area e2e regression sweep — `SKIPPED` (operator-approved rationale): attempted locally across 13 adjacent critical-tier specs (tabs/reports/incidents) to catch unintended side effects; the run hung on an unhealthy local dev-server process unrelated to this REQ's code (123% CPU, 48+ min CPU time on a server that should have been idle). The process was killed and the two REQ-098-targeted specs re-verified clean on a fresh server afterward. The full critical/regression suite will run authoritatively via CI on the release PR, which has proper seed-data infrastructure this local environment lacks.

**Skill invocation:** `e2e-test-engineer` invoked during Phase 2 of this session. Both new spec files (`e2e/critical/write-off-tab.spec.ts`, `e2e/orders/dormant-tab-visibility.spec.ts`) were authored via that invocation.

## Gate results

| Gate                           | Result             | Details                                                                                                                                                                                                       |
| ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                     | PASS               | `npx tsc --noEmit` — 0 errors                                                                                                                                                                                 |
| ESLint                         | PASS               | 0 errors (982 pre-existing warnings, unrelated to this REQ — console statements in scripts, matching sibling scripts' convention)                                                                             |
| Unit + integration             | PASS               | 1,375 passed, 4 skipped (full suite); 35 new tests for this REQ across 6 files                                                                                                                                |
| E2E — REQ-098 targeted         | PASS               | 2/2, local run against real dev server + MongoDB (`--project=regression`), verified twice                                                                                                                     |
| E2E — full adjacent-area sweep | SKIPPED            | See exemption above — local dev-server instability, unrelated to this REQ; the release PR's CI full-suite run is the authoritative check                                                                      |
| Build                          | Not run this cycle | Production build not exercised locally; relies on CI Quality Gates on the integration PR                                                                                                                      |
| npm audit                      | PASS               | 16 accepted (pre-existing, risk-accepted), 0 unresolved — the 2 new findings discovered mid-session (socket.io-parser, fast-uri) were fixed in a separate housekeeping PR (#635), already merged to `develop` |

## Test executions

| Source  | SDLC stage       | Execution | Kind        | Outcome | Workflow / run                                                                                                                                                        | Related evidence                                                       | Date       |
| ------- | ---------------- | --------- | ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| REQ-098 | 2 implement/test | #1        | unit        | passed  | Local Vitest, then CI Pipeline on `develop` — [run 30853310138](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30853310138)                        | 35 new tests across 6 files, full suite 1,375 passed                   | 2026-08-03 |
| REQ-098 | 2 implement/test | #2        | e2e (local) | passed  | Local Playwright, `regression` project; CI in-scope E2E on PR #636 — [run 30852776780](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30852776780) | 2/2, `write-off-tab.spec.ts` AC4, `dormant-tab-visibility.spec.ts` AC5 | 2026-08-03 |

## Test plan coverage

| Acceptance criterion                                                                                | Status | Test                                                                                               |
| --------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| AC1 — `'written-off'` accepted on both Tab/Order `paymentStatus`, existing values unaffected        | PASS   | `__tests__/models/write-off-schema.test.ts`                                                        |
| AC2 — `writeOffTab` happy path (incl. `partialPayments`), refusal on already-written-off, audit log | PASS   | `__tests__/services/tab-service.write-off.test.ts`                                                 |
| AC3 — `writeOffTabAction` RBAC gate (admin/super-admin only)                                        | PASS   | `__tests__/actions/tabs/tab-actions.write-off.test.ts`                                             |
| AC4 — write-off dialog end-to-end, reason required, Delete action unaffected                        | PASS   | `e2e/critical/write-off-tab.spec.ts`                                                               |
| AC5 — dormancy flag + filter on tabs list; incident scan dedup                                      | PASS   | `__tests__/services/tab-service.dormant-scan.test.ts`; `e2e/orders/dormant-tab-visibility.spec.ts` |
| AC6 — written-off exclusion from revenue + new report section (on-screen + exports)                 | PASS   | `__tests__/services/financial-report-service.write-off-section.test.ts`                            |
| AC7 — scoped remediation script selection logic (30+ day gap, exact business-date window)           | PASS   | `__tests__/scripts/write-off-dormant-tabs-2026-07-31.test.ts`                                      |

## Accepted skips

| Spec / area                                            | Classification    | Rationale                                                                                                                                                                                                                                                                                                                                                                        | Approved by        |
| ------------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Adjacent-area e2e regression sweep (13 critical specs) | `environment_gap` | Local dev-server process degraded (123% CPU, 48+ min CPU time) unrelated to this REQ's code, causing the broader run to hang with no test output. Killed and did not retry locally — the two REQ-098-targeted specs were independently re-verified clean on a fresh server, and the release PR's CI run (proper seed-data infrastructure) is the authoritative full-suite check. | william@ostendo.io |

No in-scope AC's coverage depends on the skipped sweep — AC1–AC7 each have their own passing dedicated test (see _Test plan coverage_ below).

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-098/`
- Screenshots: `compliance/evidence/REQ-098/screenshots/` (2 canonical PNGs — AC4, AC5; feature-tier stage screenshots auto-suppressed on this local run since `E2E_NEW_SPECS` is CI-only)
- CI run: [Register Release + Quality Gates on `develop`, run 30853310138](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30853310138); [in-scope E2E on integration PR #636, run 30852776780](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30852776780)

## Final assessment

Code and automated verification are complete for all 7 ACs, confirmed both locally and by CI Quality Gates + in-scope E2E on the integration PR (#636, merged to `develop`). The adjacent-area e2e regression sweep did not complete locally due to unrelated environment instability (documented above; accepted skip). This release PR (#637, `develop` → `main`) now awaits the dual-actor UAT reviewer's portal review and approval before Production promotion. The AC7 remediation script itself has not been run against production — that is a separate, explicit operator action after this release ships.
