# Test Execution Summary — REQ-118

**Date:** 2026-11-05
**Implementation branch:** `feat/bundle-wa-04-wa-10` (declared bundle REQ-117 + REQ-118; not yet pushed)
**Risk class:** MEDIUM (bundle ceremony HIGH)

**CI as of:** none yet — the integration PR has not been opened. Regenerate this summary after its CI, and the release PR's CI, reach a terminal state.

## Bundled Release Context

- **Core tracked release:** `REQ-117`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.12.0 template sync, sharded-regression CI tweak, REQ-116 accepted-failure record); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-117.md`
- **Why bundled here:** operator-declared bundle (`Bundles: #966, #972`). REQ-118 is a co-tracked member of the bundle. Both touch the WhatsApp channel and ship behind one UAT.
- **Evidence impact:** evidence stays per REQ. This folder covers REQ-118 only; REQ-117 has its own folder.
- **Reviewer impact:** one approval envelope (`REQ-117`, HIGH) covers both REQs; the reviewer reads both evidence folders.
- **Security / risk impact:** see the table below. Bundle ceremony is HIGH because REQ-117 is HIGH.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-04-wa-10`

## Test design

**Layers planned:** unit, UI end-to-end (critical tier plus updated smoke and regression specs), transport-layer end-to-end, type-check, lint, dependency gate. Visual regression is not configured.

**Layers covered:** unit ✓; UI E2E ✓ (updated staff-queue specs); transport-layer E2E ✓ (new critical spec); type-check ✓; lint ✓; dependency gate ✓.

**Exemptions:**

- **AC4 is an operator task:** submitting `support_reply` has no product behaviour; its evidence is `template-status.md` (both environments PENDING Meta review on 2026-11-05).
- **Live send of both reply modes (`NOT_NEEDED` in CI, operator evidence):** CI asserts the `NotificationLog` rows (`mode: 'text'` versus `mode: 'template'`, header and body parameters); the live round-trip waits for the UAT copy of `support_reply` to be approved.
- **The new critical spec has no screenshots** for the transport-layer assertions; this document is their evidence form.
- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 (2026-11-05, before any `e2e/**` file was edited) and authored or changed every spec listed in `test-plan.md`. `requirements-aligner`, `adr-author` and `risk-register-keeper` ran at Stage 1; their Stage 3 artefacts are in this folder.

## Gate results

| Gate                                              | Result | Details                                                                                                       |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Dependency audit                                  | PASS   | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` unchanged |
| TypeScript                                        | PASS   | `npx tsc --noEmit`: 0 errors                                                                                  |
| ESLint                                            | PASS   | 0 errors; pre-existing warnings only                                                                          |
| Unit + integration                                | PASS   | Full suite: 1846 passed, 4 skipped (194 files passed, 1 skipped)                                              |
| E2E (new critical spec)                           | PASS   | `whatsapp-support-thread.spec.ts`: 4/4                                                                        |
| E2E (full `critical` tier, default workers)       | PASS   | Second run: 337 passed, 0 failed, 1 skipped (see Accepted skips)                                              |
| E2E (regression-project run of the touched areas) | PASS   | 187 tests passed, including both updated support specs                                                        |

## Test executions

| Source  | SDLC stage       | Execution | Kind                                   | Outcome | Workflow / run                                                      |
| ------- | ---------------- | --------- | -------------------------------------- | ------- | ------------------------------------------------------------------- |
| REQ-118 | 2 implement/test | #1        | unit                                   | passed  | Local Vitest, full suite: 1846 passed, 4 skipped                    |
| REQ-118 | 2 implement/test | #2        | e2e (new and modified specs)           | passed  | Local Playwright, isolated worktree server and disposable `mongo:7` |
| REQ-118 | 2 implement/test | #3        | e2e (full `critical`, default workers) | failed  | First run: 336 passed, 1 failed, 1 skipped (see triage)             |
| REQ-118 | 2 implement/test | #4        | e2e (full `critical`, default workers) | passed  | Second run: 337 passed, 0 failed, 1 skipped                         |

The portal's first-class execution read model was not queried (no `DEVAUDIT_API_KEY` in this session). CI records the authoritative executions.

## E2E failures & triage

| Spec / check                                                                       | Source        | Classification | Evidence                                                                                                     | Disposition                                                                                      | Reference                                                        |
| ---------------------------------------------------------------------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `daily-report-business-date-selection` (REQ-095, pinned-clock Today and Yesterday) | local exec #3 | flake          | Passes in isolation and in the second full run (exec #4); nothing in the daily report changed on this branch | Accepted exception — confirmed by William Thompson, 2026-11-05; tracked in #1003 (umbrella #997) | https://github.com/metasession-dev/wawagardenbar-app/issues/1003 |

## Test plan coverage

AC1 to AC3 are covered as described in `compliance/evidence/REQ-118/test-plan.md` and `test-scope.md`:

- **Unit:** `support-ticket-service.threading`, `.window`, `.sla`, the updated `support-ticket-service` and `whatsapp-inbound.support-ticket` tests.
- **E2E:** `e2e/critical/whatsapp-support-thread.spec.ts` (thread and 72-hour reopen, free-form reply in the window, template reply after two days, urgent ticket with a 15-minute SLA ranked first and cleared by a reply); updated `support-ticket-whatsapp-inbound` and `support-ticket-staff-flow`.
- **AC4:** operator evidence in `template-status.md` (PENDING in both environments).
- **Operator evidence, not yet recorded:** the live UAT `support_reply` round-trip.

## Accepted skips

| Spec                                         | Reason                                                                                                                                                                                                                                                                                                         | Approved by                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `e2e/critical/close-tab-tip-capture.spec.ts` | Skipped itself with "No open tabs to close": a pre-existing precondition gap (the spec relied on an open tab already being in the shared database). Not accepted: the operator chose to fix it. The follow-up change makes the spec seed and remove its own open tab; it passed twice with no rows left behind | William Thompson, 2026-11-05 (fix instead of accept) |

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-118/`
- E2E scope decision: `compliance/evidence/REQ-118/e2e-scope-decision.md`
