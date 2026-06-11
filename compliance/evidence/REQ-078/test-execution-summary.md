# REQ-078 — Test execution summary

**Requirement ID:** REQ-078
**Risk:** LOW
**Date:** 2026-06-11

## Test design (devaudit#50)

- **Layers planned:** unit only
- **Layers covered:**
  - **unit ✓** — `__tests__/lib/scheduled-jobs.test.ts` (4 pre-existing + 7 new = 11 cases in this file)
  - **integration: deferred** — gate decision is at `process.env` read time; no DB / external interaction
  - **e2e: deferred** — no UI surface
  - **visual: deferred** — no rendered output
  - **manual: covered by implementation-plan.md §Verification** — Railway env var flip + service restart + log inspection
- **Skill invocation:** no sub-skills invoked. LOW risk + unit-only places this REQ on the SoT-alignment trio's `stage_1_min_risk_class: MEDIUM` skip path. `e2e-test-engineer` not invoked (no `e2e/**/*.spec.ts` files touched).

## Quality gates (local pre-merge)

| Gate                                                  | Expected   | Actual                                                                          |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                    | exit 0     | exit 0                                                                          |
| `npx vitest run __tests__/lib/scheduled-jobs.test.ts` | 0 failures | 11 pass / 0 fail (existing 4 + 7 new REQ-078 cases)                             |
| `npx vitest run` (full)                               | 0 failures | 1232 pass / 4 skipped / 0 fail (+6 cases vs REQ-077 close-out baseline of 1226) |

## CI gates (post-merge to develop)

| Gate                                                             | Expected | Actual                                                                                 |
| ---------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| CI Pipeline (Quality Gates + Register Release + Upload Evidence) | green    | _to be filled when CI on PR #370's develop-merge finishes_                             |
| Compliance Evidence Upload                                       | green    | _to be filled when this Phase 3 PR merges + the compliance-evidence.yml workflow runs_ |
| CI Status Fallback                                               | green    | _to be filled when CI on PR #370's develop-merge finishes_                             |

## Coverage

| Layer | Files                                                                                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit  | `__tests__/lib/scheduled-jobs.test.ts` (7 new cases: AC1 disable / AC2 unset / AC2 'false' / AC2 '1' / AC3 boot-log / AC4 only-inventory-affected + the adapted existing AC2 default-3) |

## Known limitations honestly framed

- **No production rehearsal.** The gate's true validation is the Railway production restart — setting `DISABLE_INVENTORY_RECONCILIATION_JOB=true` in the Railway env-vars panel + restarting the service + observing the boot log line `inventory-reconcile: DISABLED`. This is the manual smoke described in implementation-plan §Verification §4 and is what the operator runs as part of the post-deploy verification step in Phase 5.
- **Unit-level coverage chosen.** No integration test against a real Mongo or against a real scheduler tick. Justification: the gate decision happens at `setInterval`-registration time on `process.env` boolean coerce — there is no DB interaction or scheduler-tick semantics at the gate; mocking `setInterval` + reading `console.warn` exhaustively covers the four ACs. The downstream services (`InventoryService.reconcileMissedDeductions`, `OrderService.scanStalePaidOrders`) are independently tested under REQ-066's pack.
- **`scanStalePaidOrders` is implicitly gated alongside the reconciliation.** Both passes share the registration. This is the design choice documented in test-scope.md "Out of scope" — separating the two would double the operator-facing surface for no current need.

## Sign-off

- **Test author:** ostendo-io — 2026-06-11
- **Reviewer:** ostendo-io (PR #370 review)
