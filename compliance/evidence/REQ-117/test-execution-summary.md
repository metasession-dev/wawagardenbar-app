# Test Execution Summary — REQ-117

**Date:** 2026-11-05
**Implementation branch:** `feat/bundle-wa-04-wa-10` (declared bundle REQ-117 + REQ-118; not yet pushed)
**Risk class:** HIGH (customer authentication, credential storage, session lifetime)

**CI as of:** none yet — the integration PR has not been opened. Regenerate this summary after its CI, and the release PR's CI, reach a terminal state.

## Bundled Release Context

- **Core tracked release:** `REQ-117`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.12.0 template sync, sharded-regression CI tweak, REQ-116 accepted-failure record); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-117.md`
- **Why bundled here:** operator-declared bundle (`Bundles: #966, #972`). REQ-117 is the primary REQ of the bundle. Both touch the WhatsApp channel and ship behind one UAT.
- **Evidence impact:** evidence stays per REQ. This folder covers REQ-117 only; REQ-118 has its own folder.
- **Reviewer impact:** one approval envelope (`REQ-117`, HIGH) covers both REQs; the reviewer reads both evidence folders.
- **Security / risk impact:** see the table below. Bundle ceremony is HIGH because REQ-117 is HIGH.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-04-wa-10`

## Test design

**Layers planned:** unit, UI end-to-end (critical tier plus updated smoke and regression specs), transport-layer end-to-end, type-check, lint, dependency gate. Visual regression is not configured.

**Layers covered:** unit ✓; UI E2E ✓ (new critical spec and updated specs); transport-layer E2E ✓ (AC10 webhook); type-check ✓; lint ✓; dependency gate ✓.

**Exemptions:**

- **AC6 is unit-only:** the 24-hour purge is time-based and is proved in `__tests__/lib/scheduled-jobs.unverified-purge.test.ts`.
- **AC5 request limit and the AC9 Incident are unit-only:** five PIN requests per hour per phone is counted on the user document, and the Incident record needs no browser; both are in `__tests__/actions/auth/send-whatsapp-pin.test.ts`.
- **AC3 and AC9 notices are driven by `mockSendPinResult`:** `ENABLE_E2E_PIN_INTERCEPT=true` returns before Meta is reached, so the browser test rewrites the server action's result. The action's own result shapes are unit-tested.
- **Live Meta delivery (`NOT_NEEDED` in CI, operator evidence):** CI does not send to Meta. The live UAT sign-in with a real number is an operator step.
- **AC10 has no screenshot:** the webhook check is transport-layer (no `page`); this document is its evidence form.
- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 (2026-11-05, before any `e2e/**` file was edited) and authored or changed every spec listed in `test-plan.md`. `requirements-aligner`, `adr-author` and `risk-register-keeper` ran at Stage 1; their Stage 3 artefacts are in this folder.

## Gate results

| Gate                                              | Result | Details                                                                                                       |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Dependency audit                                  | PASS   | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` unchanged |
| TypeScript                                        | PASS   | `npx tsc --noEmit`: 0 errors                                                                                  |
| ESLint                                            | PASS   | 0 errors; pre-existing warnings only                                                                          |
| Unit + integration                                | PASS   | Full suite: 1846 passed, 4 skipped (194 files passed, 1 skipped)                                              |
| E2E (new critical spec)                           | PASS   | `customer-signin-whatsapp-only.spec.ts`: 9/9                                                                  |
| E2E (full `critical` tier, default workers)       | PASS   | Second run: 337 passed, 0 failed, 1 skipped (see Accepted skips)                                              |
| E2E (regression-project run of the touched areas) | PASS   | 187 tests passed                                                                                              |

## Test executions

| Source  | SDLC stage       | Execution | Kind                                   | Outcome | Workflow / run                                                      |
| ------- | ---------------- | --------- | -------------------------------------- | ------- | ------------------------------------------------------------------- |
| REQ-117 | 2 implement/test | #1        | unit                                   | passed  | Local Vitest, full suite: 1846 passed, 4 skipped                    |
| REQ-117 | 2 implement/test | #2        | e2e (new and modified specs)           | passed  | Local Playwright, isolated worktree server and disposable `mongo:7` |
| REQ-117 | 2 implement/test | #3        | e2e (full `critical`, default workers) | failed  | First run: 336 passed, 1 failed, 1 skipped (see triage)             |
| REQ-117 | 2 implement/test | #4        | e2e (full `critical`, default workers) | passed  | Second run: 337 passed, 0 failed, 1 skipped                         |

The portal's first-class execution read model was not queried (no `DEVAUDIT_API_KEY` in this session). CI records the authoritative executions.

## E2E failures & triage

| Spec / check                                                                       | Source        | Classification | Evidence                                                                                                     | Disposition                                                                                      | Reference                                                        |
| ---------------------------------------------------------------------------------- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `daily-report-business-date-selection` (REQ-095, pinned-clock Today and Yesterday) | local exec #3 | flake          | Passes in isolation and in the second full run (exec #4); nothing in the daily report changed on this branch | Accepted exception — confirmed by William Thompson, 2026-11-05; tracked in #1003 (umbrella #997) | https://github.com/metasession-dev/wawagardenbar-app/issues/1003 |

## Test plan coverage

All 10 ACs are covered as described in `compliance/evidence/REQ-117/test-plan.md` and `test-scope.md`:

- **Unit:** `send-whatsapp-pin`, `verify-whatsapp-pin`, `pin-intercept` (actions), `auth-utils.pin-hash`, `session.customer-ttl`, `scheduled-jobs.unverified-purge`, `whatsapp-webhook-no-session`.
- **E2E:** `e2e/critical/customer-signin-whatsapp-only.spec.ts` (AC1 to AC5, AC7 to AC10); updated `auth-pin-happy-path`, `smoke/customer-auth`, `auth-guest-flow`, `req-084-checkout-separation`, `requirements-verification`, `consent-split-pin-entry` and `customer-pin-six-digits`.
- **Operator evidence, not yet recorded:** the live UAT sign-in with a real number.
- **Plan deviation (AC8):** legacy accounts are found by phone in any stored form and reused; email-only accounts whose phone on file is not their WhatsApp number go through staff recovery (REQ-111). Recorded in the plan.

## Accepted skips

| Spec                                         | Reason                                                                                                                                                                                                                                                                                                         | Approved by                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `e2e/critical/close-tab-tip-capture.spec.ts` | Skipped itself with "No open tabs to close": a pre-existing precondition gap (the spec relied on an open tab already being in the shared database). Not accepted: the operator chose to fix it. The follow-up change makes the spec seed and remove its own open tab; it passed twice with no rows left behind | William Thompson, 2026-11-05 (fix instead of accept) |

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-117/`
- E2E scope decision: `compliance/evidence/REQ-117/e2e-scope-decision.md`
