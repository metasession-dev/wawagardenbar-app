# Test Execution Summary — REQ-095

**Date:** 2026-07-26 (original); **updated 2026-07-27** (post-merge regression pass, see below)
**Git SHA:** `92bbbedeb1dd22448ef4adee29bceecfe2b3ee95` (original); uncommitted at time of writing for the 2026-07-27 update — see the PR that carries this evidence forward
**Implementation PR:** [#604](https://github.com/metasession-dev/wawagardenbar-app/pull/604) (original)

## 2026-07-27 update — post-merge regression pass

The original PR merged without the Playwright coverage the implementation plan
called for. Writing it now and running the full `critical` regression suite against
it found and fixed defects beyond the original scope — see
`implementation-plan.md`'s "Scope addition" section for the full explanation. This
section records what actually got exercised; the 2026-07-26 sections below are kept
as the historical record of what the original PR claimed.

**Layers covered in this update:** unit ✓ (full suite, 1,304 passed), targeted E2E ✓
(new REQ-095 spec, 12/12), full regression E2E ✓ (292/292 at CI-equivalent config),
TypeScript ✓, ESLint ✓. **Not yet run**: this update has not gone through GitHub
Actions on a PR head SHA — everything above is a local run. UAT feature execution is
still genuinely pending an authorised reviewer; nothing here substitutes for that.

## Test design (original, 2026-07-26)

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

### Gates added 2026-07-27

| Gate                                              | Result | Details                                                                                                                      |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| REQ-095 targeted E2E                              | PASS   | `e2e/critical/daily-report-business-date-selection.spec.ts`, 12/12, verified at 1 worker and default parallelism             |
| Full `critical` regression (CI-equivalent config) | PASS   | 292/292 at `CI=true` (`workers: 1, retries: 2`, matching `playwright.config.ts`'s CI branch); 4 pre-existing unrelated skips |
| Order-number generator unit tests                 | PASS   | `__tests__/services/order-service.generateOrderNumber.test.ts`, 3/3 (scope addition)                                         |
| Full Vitest suite (re-run)                        | PASS   | 1,304 passed, 4 skipped                                                                                                      |
| TypeScript/ESLint (re-run)                        | PASS   | 0 errors, 0 new warnings                                                                                                     |

## Test executions

| Source  | SDLC stage         | Execution | Kind         | Outcome | Workflow / run                                                                                 | Related evidence                     | Date       |
| ------- | ------------------ | --------- | ------------ | ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ | ---------- |
| REQ-095 | 2 implement/test   | #1        | quality_gate | passed  | [Quality Gates](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30211223050) | 182 E2E, build, SAST, audit          | 2026-07-26 |
| REQ-095 | 2 implement/test   | #2        | unit/service | passed  | Local Vitest                                                                                   | 1,304 passed, 4 skipped; 35 targeted | 2026-07-26 |
| REQ-095 | 3 compile evidence | #1        | UAT smoke    | passed  | UAT health/home HTTP checks                                                                    | Feature interaction pending reviewer | 2026-07-26 |
| REQ-095 | 2 implement/test   | #3        | e2e (local)  | passed  | Local Playwright — not yet a CI run                                                            | New REQ-095 spec, 12/12, AC1-AC7     | 2026-07-27 |
| REQ-095 | 2 implement/test   | #4        | e2e (local)  | passed  | Local Playwright, `critical` project, `CI=true` — not yet a CI run                             | 292/292, full regression suite       | 2026-07-27 |
| REQ-095 | 2 implement/test   | #5        | unit (local) | passed  | Local Vitest — not yet a CI run                                                                | 1,304 passed + 3 new                 | 2026-07-27 |

## Test plan coverage

| Acceptance criterion                                                   | Status                               | Test                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Today/Yesterday are adjacent before and after cutoff                   | PASS                                 | `__tests__/lib/business-date.test.ts`; `daily-report-business-date-selection.spec.ts` AC1/AC2                     |
| Today matches the operational business date, not the raw calendar date | PASS (fixed 2026-07-27)              | `daily-report-business-date-selection.spec.ts` AC6 — regression found during this pass                            |
| Last 7 Days contains exactly seven labels; display matches query       | PASS (display-sync fixed 2026-07-27) | `__tests__/lib/business-date.test.ts`; `daily-report-business-date-selection.spec.ts` AC3/AC7                     |
| Custom ranges are inclusive                                            | PASS                                 | `__tests__/services/financial-report-service.business-day.test.ts`; AC4                                           |
| Cutoff-spanning and legacy records use correct bounds                  | PASS                                 | `__tests__/lib/business-date.test.ts`; service test                                                               |
| Export period remains aligned                                          | PASS (fixed 2026-07-27)              | `daily-report-business-date-selection.spec.ts` AC5 — was PENDING; export was dropping the range's end date        |
| Order numbers stay unique under concurrent creation (scope addition)   | PASS (2026-07-27)                    | `order-service.generateOrderNumber.test.ts`; confirmed against the real stuck-database state this defect produced |

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-095/`
- E2E and gate evidence: DevAudit upload associated with `REQ-095` after this compliance push (2026-07-26 push only; the 2026-07-27 update has not yet been pushed/uploaded)
- CI run: [30211223050](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30211223050) (2026-07-26; does not include REQ-095-tagged E2E)

## Final assessment

Code and automated verification — including the REQ-095-tagged E2E coverage that was
missing until this update, the export/cutoff-attribution defects that coverage found
and fixed, and the unrelated order-number race it surfaced — are now complete and
locally verified. Production promotion remains blocked on the same two items as
before, neither of which any amount of local testing can substitute for: an
independent code reviewer on the PR carrying this update (see
`docs/issues/stage2-independent-review-not-enforced.md`), and the dual-actor UAT
reviewer recording the feature-specific UAT execution on the real UAT deployment.
