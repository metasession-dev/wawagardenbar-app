# Test Execution Summary — REQ-116

**Date:** 2026-11-01
**Implementation branch:** `feat/WA-02-webhook-hardening`, merged to `develop` as PR #991 (merge commit `4170091`)
**Risk class:** HIGH

CI as of: 41296977175/1 @ 4aaff5b — PR #991: Run in-scope E2E pass (4m39s), Quality Gates pass (7m25s), Detect REQ pass. The `develop` push `4170091` then failed in Register Release (see _E2E failures & triage_); this evidence PR adds the release ticket that job needs.

## Test design

**Layers planned:** unit, transport-layer E2E (critical tier), regression-pack fixes (E2E), type-check, lint, dependency gate. Visual regression is not configured.

**Layers covered:** unit ✓; transport-layer E2E ✓; UI E2E (the fixed regression-pack specs) ✓; type-check ✓; lint ✓; dependency gate ✓.

**Exemptions:**

- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured.
- **Live Meta delivery (`NOT_NEEDED` in CI, operator evidence):** CI does not send to Meta. The exact `verification_pin` payload is asserted in a unit test; the live round-trip is AC10, an operator step after the UAT deploy.
- **AC1 has no E2E:** it needs a server started without `WHATSAPP_APP_SECRET`; it is proved in `__tests__/api/whatsapp-webhook-route.test.ts`. AC3, AC7 and AC8 are unit-only (log spies, rate limit, retry timing).
- **Transport-layer specs have no screenshots:** the three new critical specs use no `page`; this document is their evidence form.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 (2026-10-31, before any `e2e/**` file was edited) and authored or changed every spec listed in `test-plan.md`. `requirements-aligner`, `adr-author` and `risk-register-keeper` ran at Stage 1; their Stage 3 artefacts are in this folder.

## Gate results

| Gate                                          | Result | Details                                                                                                       |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| Dependency audit                              | PASS   | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` unchanged |
| TypeScript                                    | PASS   | `npx tsc --noEmit`: 0 errors                                                                                  |
| ESLint                                        | PASS   | 0 errors; pre-existing warnings only                                                                          |
| Unit + integration                            | PASS   | Full suite: 1783 passed, 4 skipped (189 files passed, 1 skipped)                                              |
| E2E (new webhook specs)                       | PASS   | `whatsapp-webhook-security` (5), `whatsapp-inbound-idempotency` (2), `whatsapp-optout-optin` (1): 8/8         |
| E2E (full `critical` tier, default 4 workers) | PASS   | `--project=critical`: 326 passed, 0 failed, 0 skipped                                                         |
| E2E (PR #991 CI, in-scope)                    | PASS   | Run in-scope E2E, 4m39s, on `4aaff5b`                                                                         |

## Test executions

| Source  | SDLC stage       | Execution | Kind                             | Outcome | Workflow / run                                                           |
| ------- | ---------------- | --------- | -------------------------------- | ------- | ------------------------------------------------------------------------ |
| REQ-116 | 2 implement/test | #1        | unit                             | passed  | Local Vitest, new and changed files                                      |
| REQ-116 | 2 implement/test | #2        | e2e (new and modified specs)     | passed  | Local Playwright, isolated dev server and disposable `mongo:7`           |
| REQ-116 | 2 implement/test | #3        | e2e (full `critical`, 4 workers) | failed  | Before the fix: 7 failures (see triage)                                  |
| REQ-116 | 2 implement/test | #4        | e2e (full `critical`, 4 workers) | failed  | With three aggregate specs chained: 2 failures (REQ-066 inventory specs) |
| REQ-116 | 2 implement/test | #5        | e2e (full `critical`, 4 workers) | passed  | Final config: 326 passed, 0 failed, 0 skipped                            |
| REQ-116 | 2 implement/test | #6        | CI (PR #991)                     | passed  | Quality Gates and in-scope E2E on `4aaff5b`                              |
| REQ-116 | 3 evidence       | #7        | CI (`develop` push)              | failed  | Register Release: release ticket for REQ-116 not found                   |

The portal's first-class execution read model was not queried (no `DEVAUDIT_API_KEY` in this session). CI records the authoritative executions.

## E2E failures & triage

| Spec / check                                                                           | Source                     | Classification | Evidence                                                                                                                                                                                                | Disposition | Reference                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `dashboard-revenue`, `express-order-report`, `daily-report-payments` (aggregate delta) | local exec #3              | flake          | Pass serially (`--workers=1`), fail at 4 workers: other specs create, cancel or delete orders between baseline and read                                                                                 | Fix         | #991, AC12: run as chained dependency projects in `playwright.config.ts`; passes in exec #5 |
| `admin-order-inventory-delta.over-sell` / `.sale-point` (REQ-066 AC8, AC9)             | local exec #4              | flake          | Both mutate the first eligible shared inventory row; pass alone                                                                                                                                         | Fix         | #991, AC12: added to the chain; passes in exec #5                                           |
| `partial-payments` tab details (2 tests)                                               | local exec #3              | test bug       | "First tab in the list" is whichever tab a parallel spec is creating or deleting                                                                                                                        | Fix         | #991, AC12: opens the spec's own seeded tab                                                 |
| `webhook-signature-rejection` (paystack), `webhook-idempotency-replay` (monnify)       | local exec #3              | seed-data gap  | The disposable server had no payment-provider secrets seeded (the seed script warns); pass with dummy secrets                                                                                           | Fix         | #991: sandbox re-seeded with the provider secrets; CI supplies the real ones                |
| `cost-snapshot` (2 tests), `partial-payments` (6 tests)                                | local, un-skipped          | test bug       | They had been skipping silently. The edit-link selector matched nothing (the table opens the editor from a dropdown); `#price` is not unique on the edit page; the tabs list defaults to open tabs only | Fix         | #991, AC13                                                                                  |
| `staff-pot` start date (#932)                                                          | CI run 39055898995 (trace) | test bug       | The save request carried no `startDate` yet the toast showed: `fill()` ran before React hydrated                                                                                                        | Fix         | #991, AC14: `waitForHydration`                                                              |

## Test plan coverage

All 15 ACs are covered as described in `compliance/evidence/REQ-116/test-plan.md` and `test-scope.md`:

- **Unit:** `__tests__/lib/whatsapp.verification-pin.test.ts` (AC9), `__tests__/api/whatsapp-webhook-route.test.ts` (AC1–AC3), `__tests__/lib/whatsapp.handle-webhook.test.ts` (AC3, AC5), `__tests__/services/whatsapp-inbound.hardening.test.ts` (AC4, AC6, AC7, AC8), and the updated routing and support-ticket tests.
- **E2E:** `e2e/critical/whatsapp-webhook-security.spec.ts` (AC2), `whatsapp-inbound-idempotency.spec.ts` (AC4, AC5), `whatsapp-optout-optin.spec.ts` (AC6); fixes for AC11 to AC15 as listed in the plan.
- **Operator evidence, not yet recorded:** AC10, the live UAT PIN sign-in.

## Accepted skips

None. The earlier skips in `cost-snapshot` and `partial-payments` (REQ-115's accepted-skips table) are removed by AC13; the critical tier ran with 0 skipped.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-116/`
- Screenshots: none. The new specs are transport-layer (no `page`).
- Consolidated flake issues: #979 (addressed by AC11 to AC13) and #932 (AC14)
- CI runs: PR #991 and the `develop` pushes
