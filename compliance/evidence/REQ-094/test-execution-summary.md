# Test Execution Summary — REQ-094

**Date:** 2026-07-19
**Git SHA:** Pending dynamic shared-report and screenshot-evidence workflow cycle

## Test design

**Layers planned:** Unit, integration, authenticated E2E, manual UAT smoke.

**Layers covered:**

- Unit/integration: PASS locally — dynamic registry ordering, non-legacy categories, sale-time category preference, and explicit unmapped historical rows.
- Authenticated E2E: Pending rerun after the workflow fix. `e2e/reports/profitability-attribution.spec.ts` is tagged `REQ-094 AC3` and captures the named category filter; the feature workflow now uploads its PNG and metadata as first-class portal evidence.
- Manual UAT smoke: Pending after `develop` deploy; HIGH-risk UAT gate is required.

**Exemptions:** No visual-regression baseline is needed; the changed review surface is proven by an AC3 evidence screenshot rather than a pixel-baseline comparison.

**Surface inventory:** The profitability dashboard, Daily/per-main-category reconciliation read paths, inventory snapshots, and order-entry snapshot write path are covered by the approved implementation plan.

## Gate results

| Gate                     | Result | Details                                                                                                  |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| TypeScript               | PASS   | Local `npx tsc --noEmit` passed after the dynamic shared-report change.                                  |
| Focused unit/integration | PASS   | 6 tests across dynamic registry, legacy/unmapped, and order-type report suites.                           |
| Quality Gates            | PASS   | [Run 29645454045](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/29645454045), 6m43s. |
| REQ-scoped E2E           | Pending | Rerun is required after merge so named PNG screenshots and sidecar provenance populate DevAudit.          |
| Build                    | PASS   | Included in Quality Gates run 29645454045.                                                               |

## Test cycles

| Source release | SDLC stage       | Cycle | Kind           | Outcome | Workflow / run                                                                                   | Related evidence                          | Date       |
| -------------- | ---------------- | ----- | -------------- | ------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------- |
| REQ-094        | 2 implement/test | 1     | REQ-scoped E2E | PASS    | [Run 29645454047](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/29645454047) | Tagged AC3 reviewer spec                  | 2026-07-18 |
| REQ-094        | 2 implement/test | 2     | Quality gates  | PASS    | [Run 29645454045](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/29645454045) | TypeScript, SAST, dependency audit, build | 2026-07-18 |

## Test changes

**Added:**

- `__tests__/services/profitability-analytics-service.test.ts` — WAT business-date and category-scoped financial totals.
- `e2e/reports/profitability-attribution.spec.ts` — authenticated reviewer category-filter journey and AC3 evidence screenshot.
- `__tests__/lib/business-date.test.ts` — WAT calendar-date normalisation.

## Test-plan coverage

| AC  | Status | Evidence                                                                                                                 |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| AC1 | PASS   | `business-date.test.ts`; profitability service test; CI Quality Gates                                                    |
| AC2 | PASS   | Order-item snapshot write path and main-category report preference code review; broader regression remains covered by CI |
| AC3 | PASS   | `profitability-analytics-service.test.ts`; `profitability-attribution.spec.ts`; scoped CI E2E                            |
| AC4 | PASS   | WAT utility coverage and snapshot-service shared-normalisation review                                                    |
| AC5 | PASS   | Additive dry-run-first migration script with explicit fallback provenance; independent reviewer checks before any apply  |

## Final assessment

The shared Daily/range report is now registry-derived and uses sale-time category identity. UAT submission remains blocked until the post-merge REQ-scoped E2E rerun uploads its screenshots to DevAudit. The production data migration is deliberately not applied during CI or UAT; it remains a documented post-deploy, independently reviewed operation.
