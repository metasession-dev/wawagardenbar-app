# REQ-077 — Test execution summary

**Requirement ID:** REQ-077
**Risk:** MEDIUM
**Date:** 2026-06-11

## Test design (devaudit#50)

- **Layers planned:** unit + e2e (no integration / visual / manual beyond §8 of the plan)
- **Layers covered:**
  - **unit ✓** — `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` (8 cases) + `__tests__/components/incident-row.hash-parse.test.ts` (10 cases) = 18 new cases
  - **e2e ✓** — `e2e/critical/incidents-expansion.spec.ts` (9 cases) — critical tier (gates PR-to-main per 3-tier model)
  - **integration: deferred** — service-method coverage at unit level + e2e at integration boundary is sufficient for MEDIUM risk UI feature
  - **visual: deferred** — no visual regression infra in project
  - **manual: covered by §8 of implementation plan** — manual smoke after deploy described in the plan
- **Skill invocation:** `e2e-test-engineer` invoked at Phase 2 step 3 mandatory gate; literal pre-test-work declaration `Delegating e2e test work to e2e-test-engineer` emitted before any spec edit; skill authored `e2e/critical/incidents-expansion.spec.ts` end-to-end.

## Quality gates (local pre-merge)

| Gate                                              | Expected            | Actual                                             |
| ------------------------------------------------- | ------------------- | -------------------------------------------------- |
| `npx tsc --noEmit`                                | exit 0              | exit 0                                             |
| `npx vitest run` (full)                           | 0 failures          | 1226 pass / 4 skipped / 0 fail (+18 cases vs base) |
| `npx playwright test --project=critical --list`   | new spec registered | 9 new tests under `[critical]`                     |
| `npx playwright test --project=regression --list` | new spec registered | spec inherits via regression `testMatch`           |

## CI gates (post-merge to develop)

| Gate                                                             | Expected | Actual                                                                                                              |
| ---------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| CI Pipeline (Quality Gates + Register Release + Upload Evidence) | green    | [run 27322979496](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27322979496) — success (16m37s) |
| Compliance Evidence Upload                                       | green    | [run 27322979515](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27322979515) — success (3m16s)  |
| CI Status Fallback                                               | green    | [run 27322979525](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27322979525) — success (8s)     |
| E2E Regression (critical tier) — PR #365 to develop              | green    | _to be filled when CI on PR #365 itself finishes — develop-side passed_                                             |

## Coverage

| Layer | Files                                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit  | `__tests__/services/incident-event-service.list-with-linked-orders.test.ts` (8); `__tests__/components/incident-row.hash-parse.test.ts` (10) |
| E2E   | `e2e/critical/incidents-expansion.spec.ts` (9 cases: 3 AC1 + 1 AC2+AC3 + 1 AC4-R-003 + 1 AC4-REQ-INV-016 + 1 AC5 + 1 AC6 + 1 AC6-R-004)      |

## Known limitations honestly framed

- **E2E execution against UAT.** Per the project's `feedback_run_e2e_in_ci` memory, e2e specs are not executed locally — execution happens on the CI's critical-tier project on the release PR. Spec authoring + registration verified locally via `--list`. First real execution lands on the develop→main release PR's E2E gate.
- **Retry-button click semantics not re-pinned.** AC4 (R-003) pins the button's _reachability_ + _enabled state_ inside the expansion container, not the action's outcome — that's REQ-066 AC10's domain and already e2e'd elsewhere. Combining the two specs would duplicate REQ-066 coverage without adding REQ-077 confidence.

## Post-Phase-3 follow-up — critical-tier locator + R-003 row-expand fix

The release PR #367's first critical-tier execution (the FIRST critical run for REQ-077 — earlier CI on develop only ran smoke, per PR #361's 3-tier model) surfaced two spec-side defects:

| Spec                                                             | Symptom                                                                                       | Root cause                                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/critical/incidents-expansion.spec.ts:374`                   | `getByRole('button', { name: /retry now/i })` not found inside expanded panel                 | `<IncidentRetryButton>` has `aria-label="Retry inventory deduction for order {id}"` which is the ARIA accessible name; visible "Retry now" is child text. ARIA spec: aria-label wins over text for accessible-name computation.                                                         | Switch locator to `name: /retry inventory deduction/i` + add a `panel.getByText('Retry now')` visible-text guard for completeness.                                   |
| `e2e/critical/admin-order-inventory-delta.over-sell.spec.ts:476` | `getByRole('button', { name: /retry inventory deduction for order .../i })` not found on page | Real **R-003 regression surface.** Before REQ-077 the button rendered inline on every row (always visible). REQ-077 PR #365 moved it inside the expansion panel — collapsed by default, not in the DOM until row-click. The R-003 risk register entry pre-flagged exactly this surface. | Add row-click step (`page.locator('tr', { hasText: handle.orderId }).click()`) before locating the button, then scope under `getByTestId('incident-details-panel')`. |

**Implementation unchanged.** `IsRetryEligible` gate in `incident-details-panel.tsx` is correct; `IncidentRetryButton` is unchanged. R-003 + R-004 mitigation contracts remain in force per `risk-assessment.md`.

**Follow-up PR:** `chore: fix REQ-077 critical-tier spec locators + REQ-066 AC10 row-expand [REQ-077]` — opened against develop; re-merge to develop + retrigger release PR #367's critical-tier gate is the verification path. Per `feedback_run_e2e_in_ci` we do not execute critical-tier specs locally.

Phase 3 SoT-alignment artefacts (`srs-alignment.md`, `architecture-decision.md`, `risk-assessment.md`) are unchanged — no SRS items move, no ADR worthiness changes, R-003 + R-004 entries hold as written.

## Sign-off

- **Test author:** ostendo-io (with `e2e-test-engineer` skill for e2e portion) — 2026-06-11
- **Reviewer:** ostendo-io (PR #365 review)
