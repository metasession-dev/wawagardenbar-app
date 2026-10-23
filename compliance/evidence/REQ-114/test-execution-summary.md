# Test Execution Summary — REQ-114

**Date:** 2026-10-23
**Implementation branch:** `fix/956-zod-4-upgrade` (worktree based on `develop` `a68bdef`)

## Test design

**Layers planned:** unit, E2E (regression tier), dependency gate, production build. Visual regression: `NOT_NEEDED` (no visual-regression tooling configured in this project).

**Layers covered:** unit ✓; E2E ✓ (one new regression-tier spec plus the full existing regression pack compared with `develop`); dependency gate ✓; type-check ✓; lint ✓; production build ✓.

**Exemptions:**

- Visual regression — `NOT_NEEDED`: no visual-regression tooling configured; the upgrade changes no markup or styles.
- E2E for the `requiredError` messages — not driven through the UI: every admin form that uses them seeds a default value, so the "required" path is unreachable from the UI. Proved at unit level (`__tests__/lib/zod4-migration.test.ts`).

**Skill invocation:** `e2e-test-engineer` invoked during Phase 2 of REQ-114 (2026-10-23). It added `e2e/settings/zod-validation-messages.spec.ts` (regression tier; the existing suite had no assertion on a rendered zod message) and ran the full regression comparison. `requirements-aligner`, `adr-author` and `risk-register-keeper` invoked at Stage 1 and Stage 3.

## Gate results

| Gate                  | Result | Details                                                                                                                                                                                                                                                                |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit      | PASS   | `scripts/evaluate-npm-audit.sh` on `npm audit --json`: `0 accepted, 0 unresolved`. Before this REQ: `Unaccepted high risk: GHSA-mrhx-c7xc-m3w5 (zod@3.25.76)`.                                                                                                         |
| TypeScript            | PASS   | `npx tsc --noEmit` — 0 errors (trial install had 34 errors in 19 files; all resolved)                                                                                                                                                                                  |
| ESLint                | PASS   | 0 errors; 999 pre-existing warnings, unchanged baseline                                                                                                                                                                                                                |
| Unit + integration    | PASS   | 1584 passed, 4 skipped (full suite) — includes 72 new tests                                                                                                                                                                                                            |
| E2E (new spec)        | PASS   | `e2e/settings/zod-validation-messages.spec.ts` 3/3 with retries off; negative control (compatibility map disabled) fails, as it should                                                                                                                                 |
| E2E (full regression) | PASS   | 555 passed, 8 failed, 25 skipped. All 8 failures triaged below as not caused by this REQ (pre-existing on `develop` or load flakes passing in isolation), tracked in #957. Same pack on the REQ-113 branch earlier the same day: 537 passed, 13 failed (same classes). |
| Build                 | PASS   | `npm run build` — compiled successfully; 70/70 static pages generated                                                                                                                                                                                                  |

## Test executions

| Source  | SDLC stage       | Execution | Kind                    | Outcome | Workflow / run                                                                      | Related evidence                                                                         | Date       |
| ------- | ---------------- | --------- | ----------------------- | ------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| REQ-114 | 2 implement/test | #1        | unit                    | passed  | Local Vitest full suite                                                             | 1584 passed, 4 skipped                                                                   | 2026-10-23 |
| REQ-114 | 2 implement/test | #2        | e2e (new spec)          | failed  | Local Playwright, `e2e/settings/zod-validation-messages.spec.ts`                    | Test bug: input is `type="email"`, so the browser blocked the submit on `x` — see triage | 2026-10-23 |
| REQ-114 | 2 implement/test | #3        | e2e (new spec)          | passed  | Local Playwright, same spec, 3 repeats, retries off                                 | `compliance/evidence/REQ-114/screenshots/`                                               | 2026-10-23 |
| REQ-114 | 2 implement/test | #4        | e2e (full regression)   | failed  | Local Playwright `regression` project, 2 workers, local `mongo:7` + CI seed scripts | 555 passed, 8 failed, 25 skipped — all 8 triaged below, none caused by REQ-114           | 2026-10-23 |
| REQ-114 | 2 implement/test | #5        | e2e (isolation re-runs) | passed  | Local Playwright, failed specs re-run alone on branch and on `develop`              | See triage evidence column                                                               | 2026-10-23 |
| REQ-114 | 2 implement/test | #6        | build                   | passed  | Local `npm run build`                                                               | Compiled successfully                                                                    | 2026-10-23 |

The portal's first-class test-execution read model was not queried: this session has no `DEVAUDIT_API_KEY`. CI runs on the integration PR and on `develop` are the authoritative executions and are recorded by CI.

## E2E failures & triage

| Spec / check                                                      | Source        | Classification | Evidence                                                                                                                                                                     | Disposition | Reference                                                                           |
| ----------------------------------------------------------------- | ------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `e2e/settings/zod-validation-messages.spec.ts:66` (first run)     | local exec #2 | test bug       | Field is `<Input type="email">`; the browser's own check blocked the submit on `x`, so react-hook-form never ran. Fixed by using `user@example` (browser-valid, zod-invalid) | Fix         | https://github.com/metasession-dev/wawagardenbar-app/issues/956 (fixed in this REQ) |
| `e2e/kitchen/inventory-tabs.spec.ts:48`                           | local exec #4 | flake          | Fails on plain `develop` 3/4 in isolation, off by one in both directions: a count read races the creation. Pre-existing                                                      | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/webhook-idempotency-replay.spec.ts:167`             | local exec #4 | seed-data gap  | Needs `MONNIFY_SECRET_KEY`, absent locally ("cannot sign synthetic webhooks"); fails identically on `develop`                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/webhook-signature-rejection.spec.ts:129`            | local exec #4 | seed-data gap  | Needs payment-provider secrets absent locally; fails identically on `develop`                                                                                                | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/finance/cash-tags-and-edit.spec.ts:252`                      | local exec #4 | flake          | Passes 2/2 in isolation on the REQ-113 branch; failed in that branch's full run too. No zod in the cash-position path                                                        | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/admin-order-inventory-delta.over-sell.spec.ts:296`  | local exec #4 | flake          | Passes in isolation on both `develop` and the REQ-113 branch; failed in both full runs                                                                                       | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/critical/admin-order-inventory-delta.sale-point.spec.ts:300` | local exec #4 | flake          | Passes in isolation on both `develop` and the REQ-113 branch; failed in both full runs                                                                                       | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/admin/pricing-windows.spec.ts:183`                           | local exec #4 | flake          | Passes in isolation on this branch (4/4); the same spec family flaked under load on the REQ-113 branch and passed alone on `develop`                                         | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |
| `e2e/kitchen/inventory-crud.spec.ts:527`                          | local exec #4 | flake          | Passes in isolation on this branch; neighbouring tests in the same spec flaked under load on the REQ-113 branch. No zod in the kitchen-ingredient path                       | Deferral    | https://github.com/metasession-dev/wawagardenbar-app/issues/957                     |

## Test plan coverage

| Acceptance criterion                                   | Status | Test                                                                                                                                                      |
| ------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — dependency-audit gate clears GHSA-mrhx-c7xc-m3w5 | PASS   | `scripts/evaluate-npm-audit.sh` (local); CI `Quality Gates` on the integration PR                                                                         |
| AC2 — valid input still accepted                       | PASS   | `__tests__/lib/zod4-migration.test.ts` (email/URL corpus, `requiredError` valid values); `e2e/settings/zod-validation-messages.spec.ts`; full regression  |
| AC3 — invalid input rejected with the same messages    | PASS   | `__tests__/lib/zod4-migration.test.ts` (39 message cases); `__tests__/actions/zod4-action-errors.test.ts`; `e2e/settings/zod-validation-messages.spec.ts` |
| AC4 — suites pass, nothing weakened                    | PASS   | Full Vitest (1584 passed); full regression compared with `develop` (no failure attributable to this REQ); no existing test file edited                    |

## Accepted skips

None. The 25 skipped tests are pre-existing environment skips in other REQs' specs (identical class on the REQ-113 branch run); none covers a REQ-114 AC.

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-114/`
- Screenshots: `compliance/evidence/REQ-114/screenshots/` (AC2, AC3)
- Tracking issue for pre-existing E2E failures: #957
- CI runs: on the integration PR for `fix/956-zod-4-upgrade` and on `develop` after merge

## Final assessment

All four ACs pass. The advisory is cleared at the gate (AC1). Validation behaviour is preserved and proved against zod 3.25.76 itself: 39 of 40 default-message cases are identical, and the 40th is the documented, stricter `±Infinity` change. Email/URL acceptance is identical, server-action and rendered-form messages are unchanged (AC2, AC3), and the full unit and E2E suites show no failure attributable to this REQ (AC4). Every E2E failure from every execution is classified above: one test bug in this REQ's own new spec (fixed), and eight pre-existing failures or load flakes tracked in #957.

## Bundled Release Context

- **Core tracked release:** `REQ-114`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` — `ff2171b` (#955), `208f3da` (#952), `4ee226e` (#951), `055ddb4` (#950). See `compliance/pending-releases/BUNDLED-CHANGES-REQ-114.md`.
- **Why bundled here:** REQ-114 is the next tracked release after those housekeeping merges; housekeeping registers no release of its own.
- **Evidence impact:** Tests above cover REQ-114 only; the housekeeping commits were verified by their own PRs' CI. Evidence ownership stays with each source.
- **Reviewer impact:** Approval scope covers REQ-114 plus the four housekeeping commits.
- **Security / risk impact:** `208f3da` is itself a security-motivated dependency bump (audit gate) reviewed in PR #952; the template sync (#955) changes CI workflows and was reviewed in that PR. No additional security/risk impact from bundling; REQ-114's own risks are R-038/R-039.
- **Reference:** commit range `origin/main..HEAD`
