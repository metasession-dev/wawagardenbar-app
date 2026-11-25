# Test Execution Summary — REQ-126

**Date:** 2026-11-25
**Implementation branch:** `feat/bundle-wa15-wa16-checkout-fix` (declared bundle, REQ-125 core; REQ-126 and REQ-127 co-tracked)
**Risk class:** MEDIUM

CI as of: 45666982374/1 @ 32847df1 (release PR #1090: Quality Gates passed by reuse, Compliance Validation failed on the triage references, E2E Regression Suite failed on two REQ-127 specs that needed a working payment gateway; all three addressed in the follow-up fix, the rows are in the triage table below).

## Test design

**Layers planned:** unit, UI or transport-layer end-to-end, type-check, lint, dependency gate.

**Layers covered:** unit ✓ (intents, precedence, the menu link, the router in every customer state, the ticket service escalation and alert title); transport-layer E2E ✓ (`whatsapp-order-link` 4, `whatsapp-status-enquiry` 3)

**Exemptions:**

- **Reply text** (menu link, acknowledgement) is asserted in unit tests: WhatsApp is off in the e2e stack and a direct reply is not logged, so the e2e specs assert the recorded intent and outcome tag, the ticket and the staff alert.
- **Live reply** is the UAT round-trip (no template needed).
- **Screenshots:** none; these specs have no `page` object (transport layer), so the evidence is this summary.
- **Visual regression (`NOT_NEEDED`):** none configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 and authored the specs for this bundle; `requirements-aligner`, `adr-author` and `risk-register-keeper` were invoked at Stage 1 (turns on 2026-11-25).

## Gate results

| Gate               | Result | Details                                                                                                                                                 |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit   | PASS   | `npm audit --omit=dev --audit-level=high`: no high or critical findings (11 moderate, none from this bundle: `package.json` dependencies are unchanged) |
| TypeScript         | PASS   | `npx tsc --noEmit`: 0 errors                                                                                                                            |
| ESLint             | PASS   | `npm run lint`: 0 errors; 1001 pre-existing warnings                                                                                                    |
| Unit + integration | PASS   | Full suite: 2348 passed, 4 skipped (246 files passed, 1 skipped)                                                                                        |
| Production build   | CI     | `npm run build` runs in CI Quality Gates on the PR; not run locally                                                                                     |
| SAST (semgrep)     | CI     | `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                  |

## UI regression sweep

Strings and surfaces changed by the bundle (the checkout form and its retry flow, the settings page "WhatsApp messages" section, support-ticket subjects and alert titles, the inbound intents) were searched over all of `e2e/`. 22 existing spec files that exercise those surfaces were run with the new specs on the isolated stack: all WhatsApp inbound, opt-out, support-thread, welcome, webhook-security, order-tracking and payment-link specs, the checkout, sign-in, tab-refusal and ordering-options specs, the staff-alert and staff-notification specs, the settings specs and `smoke/rbac`. 96 of 98 passed, 1 skipped, 2 failed (`whatsapp-support-thread` and `support-ticket-whatsapp-inbound`, both from the same over-broad "order" matcher in this bundle, fixed in #1086); the re-run of those two files and the new specs passed (19 of 19). The full `smoke` + `critical` tiers and the full `regression` tier are not run locally: CI runs `smoke` and `critical` on the PR, and the full regression runs on its nightly schedule.

## Test executions

<!-- generated-by: render-test-executions.sh journey-at 2026-11-25T18:16:55Z -->

| Source Release | SDLC Stage       | Execution | Suite         | Outcome | Workflow / Run                                                                                                               | Related Evidence | Incident / Remediation                         | Date                |
| -------------- | ---------------- | --------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------- | ------------------- |
| REQ-125        | 2 implement_test | #1        | quality_gate  | passed  | [Quality Gates](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/45622816174) (run 45622816174, attempt 1)  | None             | None                                           | 2026-11-25 13:29:36 |
| REQ-125        | 2 implement_test | #2        | e2e           | failed  | [E2E Regression](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/45666982374) (run 45666982374, attempt 1) | None             | authoritative workflow_run conclusion: failure | 2026-11-25 18:04:34 |
| REQ-125        | 2 implement_test | #3        | e2e           | failed  | [E2E Regression](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/45666982374) (run 45666982374, attempt 1) | None             | authoritative workflow_run conclusion: failure | 2026-11-25 18:04:34 |
| REQ-125        | 2 implement_test | #4        | e2e           | failed  | [E2E Regression](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/45666982374) (run 45666982374, attempt 1) | None             | authoritative workflow_run conclusion: failure | 2026-11-25 18:04:34 |
| REQ-125        | 2 implement_test | #5        | quality_gate  | passed  | [Quality Gates](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/45658854082) (run 45658854082, attempt 1)  | None             | None                                           | 2026-11-25 18:06:40 |
| REQ-125        | 4 uat_review     | #1        | uat_execution | passed  | Agent-executed UAT                                                                                                           | None             | None                                           | 2026-11-25 18:09:52 |

**Final assessment:** Stage-scoped execution numbering is authoritative from first-class portal test execution records.

### Local executions (Stage 2, isolated stack: `mongo:7`, project `server.ts` dev server)

| Source  | SDLC stage       | Execution | Kind                                                                    | Outcome | Run                                                                           |
| ------- | ---------------- | --------- | ----------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| REQ-126 | 2 implement/test | #1        | unit                                                                    | passed  | Local Vitest, full suite: 2348 passed, 4 skipped                              |
| REQ-126 | 2 implement/test | #2        | e2e (new specs)                                                         | passed  | 7 passed                                                                      |
| REQ-126 | 2 implement/test | #3        | e2e (existing WhatsApp inbound and checkout files, UI regression sweep) | failed  | 98 tests: 96 passed, 1 skipped, 2 failed: an over-broad order matcher (fixed) |
| REQ-126 | 2 implement/test | #4        | e2e (the two failed files plus the new specs)                           | passed  | 19 passed (27s)                                                               |

## E2E failures & triage

| Spec / check                                                         | Source              | Classification | Evidence                                                                                                                                                                    | Disposition | Reference |
| -------------------------------------------------------------------- | ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------- |
| Settings page returned HTTP 500                                      | local e2e           | app defect     | `diffSwitches` was exported from a `'use server'` file, which may export only async functions; moved to `lib/whatsapp-switch-diff.ts`                                       | Fix         | #1086     |
| "WhatsApp message settings saved" never shown                        | local e2e           | app defect     | The component used `sonner` toasts but the app mounts the shadcn toaster (the same unmounted-toaster defect REQ-122 found); now uses `use-toast`                            | Fix         | #1086     |
| Suppressed send not logged when WhatsApp is off                      | local e2e design    | app defect     | The gate ran after the service-enabled check, so a suppressed send was recorded as SERVICE_DISABLED in environments with WhatsApp off; the gate now runs first              | Fix         | #1086     |
| `whatsapp-support-thread` AC1, `support-ticket-whatsapp-inbound` AC1 | UI regression sweep | app defect     | "Order number is 4821" and "Also the drink was warm" were classified as order requests and never reached the ticket; an order request is now only an order word plus filler | Fix         | #1086     |

| REQ-127 critical e2e on the release PR (`checkout-payment-init-failure`, 2 tests) | CI release PR run | test bug | The two specs asserted that a payment start succeeds (a payment reference on the order, then a cleared cart); CI runs without test payments and has no working gateway, so the start cannot succeed there. Reproduced locally with `ENABLE_TEST_PAYMENTS=false`; the specs now assert only the order bookkeeping (one Pending order, same order reused, superseded order cancelled) and pass in that configuration | Fix | #1031 |

**Final assessment:** every acceptance criterion of REQ-126 is proved by passing tests (exemptions above). The two pre-existing failures the sweep found were caused by this bundle and are fixed. The new specs and the 22 related existing files pass locally; CI runs the full `smoke` and `critical` tiers on the PR.

## Bundled Release Context

- **Core tracked release:** `REQ-125` (this REQ, REQ-126, is a co-tracked member)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.15.0 sync, `reuse_pull_request_gates` config); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-125.md`
- **Why bundled here:** REQ-125 (WA-15), REQ-126 (WA-16) and REQ-127 (#1031) were declared as one bundle at planning time (MEDIUM, no overlapping files) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-125, and covers all three.
- **Reviewer impact:** approval covers REQ-125 and its co-tracked members REQ-126 and REQ-127 (all MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-77 to R-80 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa15-wa16-checkout-fix`
