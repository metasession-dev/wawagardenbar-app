# Test Execution Summary — REQ-125

**Date:** 2026-11-25
**Implementation branch:** `feat/bundle-wa15-wa16-checkout-fix` (declared bundle, REQ-125 core; REQ-126 and REQ-127 co-tracked)
**Risk class:** MEDIUM

CI as of: not yet available. The branch has not been pushed when this was written, so there is no CI run to cite. The Feature In-Scope E2E and Quality Gates rows are added after the integration PR runs.

## Test design

**Layers planned:** unit, UI or transport-layer end-to-end, type-check, lint, dependency gate.

**Layers covered:** unit ✓ (catalogue completeness, the gate by template name, the PIN never gated, fail-open, cache invalidation, settings normalisation, suppressed log code, admin actions and audit); UI E2E ✓ (`whatsapp-notification-settings`, 8 tests including role refusal for csr, kitchen and a customer)

**Exemptions:**

- **AC1, AC9:** unit test and runbook respectively; no screen.
- **Payment-reminder suppression** is a timed job a spec cannot trigger, so the single-switch story uses order status updates (same gate, same log); the gate by template name covers both in unit tests.
- **The actions' role gate** is unit-tested; the e2e proves a csr, a kitchen member and a customer cannot reach the page.
- **WhatsApp sends** are off in the e2e stack; the assertion is the `NotificationLog` row.
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

Covered once for the whole bundle in `compliance/evidence/REQ-126/test-execution-summary.md` (22 existing spec files that touch the checkout, settings and WhatsApp surfaces were run with the new specs: 96 of 98 passed, the two failures were fixed and re-run green).

## Test executions

The portal's execution read model has no records for this release yet (nothing has been pushed). First-class rows are added after the integration PR runs; they are not inferred from artefacts.

### Local executions (Stage 2, isolated stack: `mongo:7`, project `server.ts` dev server)

| Source  | SDLC stage       | Execution | Kind                   | Outcome | Run                                                                                              |
| ------- | ---------------- | --------- | ---------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| REQ-125 | 2 implement/test | #1        | unit                   | passed  | Local Vitest, full suite: 2348 passed, 4 skipped                                                 |
| REQ-125 | 2 implement/test | #2        | e2e (new spec)         | failed  | first run 8 tests: found the use-server export build error and the unmounted toaster; both fixed |
| REQ-125 | 2 implement/test | #3        | e2e (new spec, re-run) | passed  | 8 passed (48s)                                                                                   |

## E2E failures & triage

| Spec / check                                                         | Source              | Classification | Evidence                                                                                                                                                                    | Disposition | Reference  |
| -------------------------------------------------------------------- | ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| Settings page returned HTTP 500                                      | local e2e           | app defect     | `diffSwitches` was exported from a `'use server'` file, which may export only async functions; moved to `lib/whatsapp-switch-diff.ts`                                       | Fix         | `1c815381` |
| "WhatsApp message settings saved" never shown                        | local e2e           | app defect     | The component used `sonner` toasts but the app mounts the shadcn toaster (the same unmounted-toaster defect REQ-122 found); now uses `use-toast`                            | Fix         | `1c815381` |
| Suppressed send not logged when WhatsApp is off                      | local e2e design    | app defect     | The gate ran after the service-enabled check, so a suppressed send was recorded as SERVICE_DISABLED in environments with WhatsApp off; the gate now runs first              | Fix         | `1c815381` |
| `whatsapp-support-thread` AC1, `support-ticket-whatsapp-inbound` AC1 | UI regression sweep | app defect     | "Order number is 4821" and "Also the drink was warm" were classified as order requests and never reached the ticket; an order request is now only an order word plus filler | Fix         | `65e7895c` |

**Final assessment:** every acceptance criterion of REQ-125 is proved by passing tests (exemptions above). The two pre-existing failures the sweep found were caused by this bundle and are fixed. The new specs and the 22 related existing files pass locally; CI runs the full `smoke` and `critical` tiers on the PR.

## Bundled Release Context

- **Core tracked release:** `REQ-125` (this REQ is the core)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.15.0 sync, `reuse_pull_request_gates` config); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-125.md`
- **Why bundled here:** REQ-125 (WA-15), REQ-126 (WA-16) and REQ-127 (#1031) were declared as one bundle at planning time (MEDIUM, no overlapping files) and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-125, and covers all three.
- **Reviewer impact:** approval covers REQ-125 and its co-tracked members REQ-126 and REQ-127 (all MEDIUM).
- **Security / risk impact:** see `security-summary.md` and R-77 to R-80 in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa15-wa16-checkout-fix`
