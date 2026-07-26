# Test Execution Summary — REQ-095

**Date:** 2026-07-26
**Git SHA:** `92bbbedeb1dd22448ef4adee29bceecfe2b3ee95`
**Implementation PR:** [#604](https://github.com/metasession-dev/wawagardenbar-app/pull/604)

## Test design

**Layers planned:** unit, service, E2E, build, SAST, dependency audit, UAT smoke.

**Layers covered:** unit ✓, service ✓, E2E regression ✓, build ✓, SAST ✓, dependency audit ✓, UAT health ✓.

**UAT feature execution:** pending authorised reviewer execution. Local `.env.local`
credentials did not authenticate against the deployed UAT environment, so no false
pass is recorded here.

## Gate results

| Gate                         | Result  | Details                                                                                                                   |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                   | PASS    | `npx tsc --noEmit` locally and in Quality Gates                                                                           |
| Unit/service                 | PASS    | 1,304 passed, 4 skipped locally                                                                                           |
| Targeted business-date tests | PASS    | 35 passed                                                                                                                 |
| SAST                         | PASS    | Quality Gates completed successfully; no new blocking finding                                                             |
| Dependency audit             | PASS    | Quality Gates accepted the existing repository baseline                                                                   |
| E2E                          | PASS    | 182/182 in Quality Gates run [30211223050](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30211223050) |
| Build                        | PASS    | Production build completed successfully in Quality Gates                                                                  |
| UAT health                   | PASS    | `https://wawagardenbar-app-uat.up.railway.app/api/health` returned HTTP 200                                               |
| UAT home smoke               | PASS    | UAT home returned HTTP 200                                                                                                |
| UAT feature verification     | PENDING | Requires an authorised UAT reviewer account                                                                               |

## Test executions

| Source  | SDLC stage         | Execution | Kind         | Outcome | Workflow / run                                                                                 | Related evidence                     | Date       |
| ------- | ------------------ | --------- | ------------ | ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ | ---------- |
| REQ-095 | 2 implement/test   | #1        | quality_gate | passed  | [Quality Gates](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30211223050) | 182 E2E, build, SAST, audit          | 2026-07-26 |
| REQ-095 | 2 implement/test   | #2        | unit/service | passed  | Local Vitest                                                                                   | 1,304 passed, 4 skipped; 35 targeted | 2026-07-26 |
| REQ-095 | 3 compile evidence | #1        | UAT smoke    | passed  | UAT health/home HTTP checks                                                                    | Feature interaction pending reviewer | 2026-07-26 |

## Test plan coverage

| Acceptance criterion                                  | Status                            | Test                                                               |
| ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Today/Yesterday are adjacent before and after cutoff  | PASS                              | `__tests__/lib/business-date.test.ts`                              |
| Last 7 Days contains exactly seven labels             | PASS                              | `__tests__/lib/business-date.test.ts`                              |
| Custom ranges are inclusive                           | PASS                              | `__tests__/services/financial-report-service.business-day.test.ts` |
| Cutoff-spanning and legacy records use correct bounds | PASS                              | `__tests__/lib/business-date.test.ts`; service test                |
| Export period remains aligned                         | PENDING UAT/reviewer confirmation | Existing export path; reviewer must verify generated output        |

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-095/`
- E2E and gate evidence: DevAudit upload associated with `REQ-095` after this compliance push
- CI run: [30211223050](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30211223050)

## Final assessment

Code and automated verification are complete. Production promotion is blocked until
the dual-actor UAT reviewer records the feature-specific UAT execution and confirms
the export period/totals behavior.
