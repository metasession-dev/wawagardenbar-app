# Test Execution Summary — REQ-115

**Date:** 2026-10-24
**Implementation branch:** `fix/REQ-115-whatsapp-phase0-hygiene`, branched from `develop` `9cb7c3c` (after a fast-forward to `origin/develop`)
**Risk class:** HIGH

**CI as of:** none yet — no CI run exists for this branch; regenerate after the integration PR's CI reaches a terminal state.

## Test design

**Layers planned:** unit, integration-level (route handler to MongoDB through Playwright request specs), E2E (critical tier for the merge-gating stories, one update to a regression-tier spec), type-check, lint, dependency gate. Visual regression is `NOT_NEEDED` because the project has no visual-regression tooling.

**Layers covered:** unit ✓; transport-layer E2E ✓; UI E2E ✓; type-check ✓; lint ✓; dependency gate ✓.

**Exemptions:**

- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured.
- **Live Meta delivery (`NOT_NEEDED` in CI, operator evidence):** CI runs with `ENABLE_WHATSAPP_NOTIFICATIONS=false`, so no message reaches Meta. The two WhatsApp critical specs assert the `NotificationLog` row (template key, header/body/button parameters, status, error code) and database state (Level 1). The live `account_recovery` round-trip (AC14) and a live 6-digit PIN sign-in (AC15) are operator evidence on UAT (Level 2) and are **not yet recorded**.
- **AC8, AC9, AC12, AC13 have no automated test:** they are configuration, documentation, issue housekeeping and operator tasks. AC8 (`.env.test`) and AC9 (SRS/RTM/docs) are checked by inspection; AC12 by issue #979; AC13 is operator evidence.

**Skill invocation:**

- `e2e-test-engineer` was invoked in Phase 2 (2026-10-24, before any `e2e/**` file was edited). It authored `e2e/helpers/whatsapp-webhook.ts`, `e2e/critical/whatsapp-welcome-params.spec.ts`, `e2e/critical/whatsapp-phone-normalisation.spec.ts`, `e2e/critical/customer-pin-six-digits.spec.ts` and the US-01.3 test in `e2e/support-ticket-staff-flow.spec.ts`, and updated the existing specs listed under Test plan coverage.
- `requirements-aligner`, `adr-author` and `risk-register-keeper` were invoked at Stage 1; their Stage 3 artefacts are in this folder.

## Gate results

| Gate                               | Result | Details                                                                                                                                                                                                                                                          |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                   | PASS   | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` unchanged from `develop`                                                                                                                                     |
| TypeScript                         | PASS   | `npx tsc --noEmit`: 0 errors                                                                                                                                                                                                                                     |
| ESLint                             | PASS   | 0 errors; pre-existing warnings only                                                                                                                                                                                                                             |
| Unit + integration                 | PASS   | Full suite: 1755 passed, 4 skipped (185 files passed, 1 skipped)                                                                                                                                                                                                 |
| E2E (new and modified specs)       | PASS   | New critical specs: 7/7. Modified existing specs: 17/17 across `whatsapp-inbound-registration-templates`, `support-ticket-whatsapp-inbound`, `support-ticket-staff-flow`, `smoke/customer-auth`, `smoke/consent-split-pin-entry`, `customer/auth-pin-happy-path` |
| E2E (full `critical` tier, serial) | PASS   | `--project=critical --workers=1`: 315 passed, 0 failed, 3 skipped (see Accepted skips)                                                                                                                                                                           |

## Test executions

| Source  | SDLC stage       | Execution | Kind                             | Outcome             | Workflow / run                                                                                                                                                                          | Related evidence                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------------- | --------- | -------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-115 | 2 implement/test | #1        | unit                             | passed              | Local Vitest, new and changed REQ-115 files                                                                                                                                             | 1752 passed in the first full run                                                                                                                                                                                                                                                                                                   |
| REQ-115 | 2 implement/test | #2        | e2e (new specs)                  | passed              | Local Playwright `critical` project, isolated dev server (port 3055) and disposable `mongo:7`, `ENABLE_WHATSAPP_NOTIFICATIONS=false`, `WHATSAPP_APP_SECRET` set so signing is exercised | 7 passed (+3 auth setup)                                                                                                                                                                                                                                                                                                            |
| REQ-115 | 2 implement/test | #3        | e2e (modified specs)             | failed, then passed | Local Playwright `regression` project, same environment                                                                                                                                 | First run: 3 failures, all wrong expectations in my own tests (REQ-111 specs expected `_sent` while WhatsApp is off, which is exactly the D8 defect now fixed; the US-01.3 query matched the email fallback row instead of the WhatsApp row). Fixed and re-run: 7/7 pass. Earlier in the same run the 4 other modified specs passed |
| REQ-115 | 3 evidence       | #4        | unit                             | passed              | Local Vitest full suite                                                                                                                                                                 | 1755 passed, 4 skipped. A single run during a concurrent Playwright run showed 3 failures that did not recur on the next two runs; treated as load-induced, not investigated further                                                                                                                                                |
| REQ-115 | 3 evidence       | #5        | e2e (full `critical`, 4 workers) | failed              | Local Playwright `critical` project, default workers                                                                                                                                    | 269 passed, 6 failed, 43 skipped. The 6 failures and most skips are parallel interference, triaged below                                                                                                                                                                                                                            |
| REQ-115 | 3 evidence       | #6        | e2e (isolation re-runs)          | passed              | The 6 failing spec files re-run alone, `--workers=1`                                                                                                                                    | 45/45 passed                                                                                                                                                                                                                                                                                                                        |
| REQ-115 | 3 evidence       | #7        | e2e (full `critical`, serial)    | passed              | Local Playwright `critical` project, `--workers=1`                                                                                                                                      | 315 passed, 0 failed, 3 skipped                                                                                                                                                                                                                                                                                                     |

The portal's first-class test-execution read model was not queried, because this session has no `DEVAUDIT_API_KEY`. The CI runs on the integration PR and on `develop` are the authoritative executions, and CI records them.

## E2E failures & triage

| Spec / check                                                       | Source        | Classification | Evidence                                                                                                                                                                                                                                         | Disposition                                                       | Reference |
| ------------------------------------------------------------------ | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------- |
| `e2e/whatsapp-inbound-registration-templates.spec.ts` AC1 and AC4  | local exec #3 | test bug       | Asserted `account_recovery_sent` / `welcome_new_user_sent` while WhatsApp is disabled in the e2e environment. Those specs passed only because the old code tagged a failed send as sent. With D8 the real outcome is `…_failed:SERVICE_DISABLED` | Fix (assertions now accept `_sent` or `_failed:SERVICE_DISABLED`) | #963      |
| `e2e/support-ticket-staff-flow.spec.ts` [US-01.3]                  | local exec #3 | test bug       | Query matched the email fallback `NotificationLog` row first                                                                                                                                                                                     | Fix (query filters `channel: 'whatsapp'`)                         | #963      |
| `admin-order-inventory-delta.sale-point.spec.ts:300` (REQ-066 AC8) | local exec #5 | flake          | Passes in isolation (exec #6) and in the serial full run (exec #7). Fails only with 4 workers on a shared database                                                                                                                               | Deferral (tracked; target: the e2e-reliability work in #979)      | #979      |
| `admin-order-inventory-delta.over-sell.spec.ts:296` (REQ-066 AC9)  | local exec #5 | flake          | Same as above                                                                                                                                                                                                                                    | Deferral (tracked; target: the e2e-reliability work in #979)      | #979      |
| `daily-report-payments.spec.ts:141` (REQ-013)                      | local exec #5 | flake          | Same; passes in exec #6 and #7. Its serial dependants were skipped in exec #5                                                                                                                                                                    | Deferral (tracked; target: the e2e-reliability work in #979)      | #979      |
| `delete-tab-payment-revert.spec.ts:129` (REQ-096)                  | local exec #5 | flake          | Same                                                                                                                                                                                                                                             | Deferral (tracked; target: the e2e-reliability work in #979)      | #979      |
| `express-order-report.spec.ts:192`                                 | local exec #5 | flake          | Same; the 24 skips in this file were serial dependants of this failure. Passes in exec #6 and #7                                                                                                                                                 | Deferral (tracked; target: the e2e-reliability work in #979)      | #979      |
| `express-order-portion-pricing-req097.spec.ts:174` (AC3)           | local exec #5 | flake          | Same; this is the spec behind #945 and #949. Passes in isolation and in the serial run                                                                                                                                                           | Deferral (tracked; target: the e2e-reliability work in #979)      | #979      |

None of the failures involves WhatsApp, authentication, phone handling or any file REQ-115 changed.

## Test plan coverage

All 16 ACs are covered as described in `compliance/evidence/REQ-115/test-plan.md` and `test-scope.md`:

- **Unit:** `__tests__/lib/{whatsapp-template-params,whatsapp.send-message,whatsapp-error-mapping,whatsapp-template-contract,auth-utils.normalize-phone,phone-migration}.test.ts`, `__tests__/services/{whatsapp-inbound-service.routing,support-ticket-service}.test.ts`, `__tests__/lib/scheduled-jobs.incident-summary.test.ts`, `__tests__/actions/auth/{send-whatsapp-pin,verify-whatsapp-pin}.test.ts`, plus the PIN fixtures updated in the existing auth action tests.
- **E2E:** `e2e/critical/whatsapp-welcome-params.spec.ts` (AC1, US-01.1/01.2), `e2e/critical/whatsapp-phone-normalisation.spec.ts` (AC5, US-01.5), `e2e/critical/customer-pin-six-digits.spec.ts` (AC15, US-01.7), `e2e/support-ticket-staff-flow.spec.ts` (AC2, US-01.3), and the shared helper used by two existing specs (AC10). Each test calls `tagTest('REQ-115', …)` with its story id in the title.
- **The contract test** (`whatsapp-template-contract.test.ts`) found a real defect while it was being written: the `payment_link` body skipped `{{3}}`, which Meta rejects. Fixed in the template, builder and doc.
- **Operator evidence, not yet recorded:** AC8 token rotation, AC13 production WhatsApp check, AC14 live `account_recovery` round-trip, and the live part of AC15.

## Accepted skips

Three skipped tests in the serial full `critical` run. All are self-skips in other REQs' specs; none covers a REQ-115 acceptance criterion. **Pending operator approval**: they are precondition gaps, which this workflow does not normally accept.

| Spec                                                | Reason                                                                                                                                    | Class                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `critical/cost-snapshot.spec.ts` (2 tests, REQ-102) | "No menu items to edit": the spec looks for `a[href*="/menu/"][href$="/edit"]` on `/dashboard/menu` and finds none in the seeded database | precondition gap, pre-existing, not investigated |
| `critical/partial-payments.spec.ts` (1 test)        | A guard in the spec skips when its own preconditions are not met                                                                          | precondition gap, pre-existing, not investigated |

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-115/`
- Screenshots: `compliance/evidence/REQ-115/screenshots/` (AC2, AC15). The two WhatsApp critical specs are transport-layer specs with no `page`, so their evidence form is this document.
- Consolidated flake issue: #979
- CI runs: on the integration PR for `fix/REQ-115-whatsapp-phase0-hygiene`, and on `develop` after merge

## Final assessment

Every code and documentation AC (AC1–AC7, AC9–AC11, AC15 in code, AC16) passes at unit and/or E2E level. The full `critical` tier passes serially (315/315, 3 pre-existing self-skips). The only E2E failures REQ-115 caused were two wrong expectations in tests written for it or for REQ-111, one of which revealed that the old code reported failed sends as sent. Not yet verified: the live Meta behaviour. AC13, AC14, the live part of AC15 and the token rotation (AC8) need the operator, and R-040 to R-042 stay OPEN until then.
