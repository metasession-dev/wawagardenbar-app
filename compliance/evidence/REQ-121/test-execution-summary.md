# Test Execution Summary — REQ-121

**Date:** 2026-11-17
**Implementation branch:** `feat/bundle-wa-06-wa-12-checkout-staff-alerts` (declared bundle, REQ-121 core, REQ-122 co-tracked; not yet pushed when this was written)
**Risk class:** HIGH

CI as of: not yet available. The branch has not been pushed, so there is no CI run to cite. The Feature In-Scope E2E and Quality Gates rows are added after the integration PR runs.

## Test design

**Layers planned:** unit, UI end-to-end, type-check, lint, production build, dependency gate. Visual regression is not configured.

**Layers covered:** unit ✓; UI E2E ✓ (`checkout-single-page` 10 tests, `checkout-closed-hours` 2 tests, plus the updated `customer-order-journey`, `customer-ordering-options-ui`, `customer-cannot-use-tabs`, `customer-tab-refusal-ui`, `req-084-checkout-separation`, `requirements-verification`); type-check ✓; lint ✓; build ✓; dependency gate ✓. Tier: all new specs are in `critical`; `checkout-closed-hours` rewrites shop-wide hours and runs in the serial aggregate chain.

**Exemptions:**

- **Payment on the provider's hosted page** is out of scope for e2e (test payments are on and foreign navigation is aborted); the paid-order path is exercised by the signed Paystack webhook in the REQ-122 specs. The hosted checkout belongs to WA-07.
- **Live check on UAT:** the UAT pack (steps 1 to 9) runs the checkout on the UAT environment.
- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 and authored `e2e/critical/checkout-single-page.spec.ts`, `checkout-closed-hours.spec.ts` and `e2e/helpers/checkout-page.ts`, and updated the specs listed in the UI regression sweep. `requirements-aligner`, `adr-author` and `risk-register-keeper` were invoked at Stage 1 and Stage 3.

## Gate results

| Gate                       | Result | Details                                                                                                                                                  |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit           | PASS   | `npm audit --omit=dev --audit-level=high`: no high or critical findings (11 moderate, none new from this REQ: `package.json` dependencies are unchanged) |
| TypeScript                 | PASS   | `npx tsc --noEmit`: 0 errors                                                                                                                             |
| ESLint                     | PASS   | 0 errors; pre-existing warnings only                                                                                                                     |
| Production build           | PASS   | `npm run build` completed                                                                                                                                |
| Unit + integration         | PASS   | Full suite: 2129 passed, 4 skipped (220 files passed, 1 skipped)                                                                                         |
| E2E (`smoke` + `critical`) | PASS   | 573 tests: 569 passed, 2 failed, 2 skipped; both failures were test-side and are fixed (see triage), their files re-run green                            |

## UI regression sweep

Strings and selectors removed by the diff were searched over all of `e2e/`: `input[name="customerName"]`, `customerEmail`, `Customer Info`, `Order Details`, `Payment Method`, `Proceed to Payment`, `Next` step buttons, `#card-payment`, `#existing-tab`, `Tip` step. Hits (`customer-journey` helper, `customer-order-journey`, `customer-ordering-options-ui`, `customer-cannot-use-tabs`, `customer-tab-refusal-ui`, `req-084-checkout-separation` AC2 and AC3, three checks in `requirements-verification`) were updated to the single page. REQ-084 AC3 changed meaning (no manual or admin payment options; Pay starts the gateway) because REQ-CHECKOUT-010 is superseded (follow-up #1045). The `regression` project was not run in full locally; the full `smoke` and `critical` tiers were, and every spec above is in them.

## Test executions

The portal's execution read model has no records for this release yet (nothing has been pushed). First-class rows are added after the integration PR runs; they are not inferred from artefacts.

### Local executions (Stage 2, isolated stack: `mongo:7`, project `server.ts` dev server, Lagos time)

| Source  | SDLC stage       | Execution | Kind                                   | Outcome | Run                                                           |
| ------- | ---------------- | --------- | -------------------------------------- | ------- | ------------------------------------------------------------- |
| REQ-121 | 2 implement/test | #1        | unit                                   | passed  | Local Vitest, full suite: 2129 passed, 4 skipped              |
| REQ-121 | 2 implement/test | #2        | e2e (new specs, per file)              | passed  | each new spec passed after its fixes (see triage)             |
| REQ-121 | 2 implement/test | #3        | e2e (`smoke` + `critical`, one worker) | failed  | 569 passed, 2 failed, 2 skipped (22 min)                      |
| REQ-121 | 2 implement/test | #4        | e2e (the two failed files)             | passed  | `customer-tab-refusal-ui`, `csr-order-tab-parity-req109` pass |

## E2E failures & triage

| Spec / check                                              | Source         | Classification | Evidence                                                                                                                                                                                             | Disposition | Reference                                 |
| --------------------------------------------------------- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------- |
| `customer-tab-refusal-ui` standalone order (REQ-120 AC6)  | local gate run | test bug       | Waited for `input[name="customerName"]`, a field of the removed wizard; now waits for the order-type selector and uses a per-context client address; passes                                          | Fix         | #968, #974 (this branch)                  |
| `csr-order-tab-parity-req109` csr cancels an unpaid order | local gate run | flake          | Locator `[role="dialog"]` matched the Next.js dev-tools dialog as well as the cancel dialog (strict-mode violation; present on any page in dev); locator now names the dialog `Cancel Order`; passes | Fix         | #968, #974 (this branch)                  |
| Tip order create (found while writing the new spec)       | local e2e      | app defect     | The Order model requires `tipPaymentMethod` when the tip is above zero, and the customer no longer chooses one; a tipped order could not be created. The service now records `card`                  | Fix         | #968, #974 (this branch), follow-up #1046 |
| First-name field flashes then disappears                  | local e2e      | app defect     | `/api/auth/user` `name` falls back to the email prefix; the form now reads `hasName` and waits for the profile                                                                                       | Fix         | #968, #974 (this branch)                  |
| Malformed staff alert number stored as `+080...`          | local e2e      | app defect     | A 12-digit local number passed the phone check; the service now refuses a number that is not international                                                                                           | Fix         | #968, #974 (this branch)                  |
| Staff components used `sonner` toasts                     | local e2e      | app defect     | No sonner toaster is mounted so the toast was invisible; the components use `use-toast`                                                                                                              | Fix         | #968, #974 (this branch), follow-up #1043 |
| `/api/auth/*` 429 under parallel specs                    | local e2e      | seed-data gap  | 5 requests a minute per IP; specs give each context its own client address (`giveOwnClientIp`)                                                                                                       | Fix         | follow-up #1042                           |
| Cookie banner over the Pay button                         | local e2e      | test bug       | Specs pre-set `cookieConsent`                                                                                                                                                                        | Fix         | follow-up #1044                           |

**Final assessment:** every REQ-121 acceptance criterion is proved by passing tests (AC7 and AC9 as described under Exemptions where they apply). The `smoke` and `critical` tiers are green locally; the full `regression` tier and the CI executions are still to come on the integration PR.

## Bundled Release Context

- **Core tracked release:** `REQ-121`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.14.0 sync, configure changes, expired exception removal); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-121.md`
- **Why bundled here:** REQ-121 (WA-06) and REQ-122 (WA-12) were declared as one bundle at planning time and ship through one integration PR and one UAT.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is written once, on REQ-121, and covers both.
- **Reviewer impact:** approval covers REQ-121 and its co-tracked member REQ-122 (both HIGH).
- **Security / risk impact:** see `security-summary.md` and the R-60 to R-66 records in `compliance/risk-register.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-06-wa-12-checkout-staff-alerts`
