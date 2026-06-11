# REQ-078 — Test plan

**Requirement ID:** REQ-078
**Risk:** LOW
**Related issue:** _(operator request via chat, no GH issue)_
**Date:** 2026-06-11

## Acceptance criteria → tests

All tests live in `__tests__/lib/scheduled-jobs.test.ts` under the existing `REQ-048 + REQ-058 + REQ-078: startScheduledJobs` describe block.

| AC  | Statement                                                                                                                                                               | Test                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | When `process.env.DISABLE_INVENTORY_RECONCILIATION_JOB === 'true'`, `startScheduledJobs()` does NOT register the inventory-reconcile `setTimeout` + `setInterval` pair. | `REQ-078 AC1 — DISABLE_INVENTORY_RECONCILIATION_JOB=true skips the inventory-reconcile registration` — asserts `setInterval` called 2× (reward + IG) and not 3×. |
| AC2 | When the env var is unset, `'false'`, or any other value, the inventory-reconcile job registers as it does today (no behaviour change).                                 | Three cases: `env var unset behaves as today`, `env=false does NOT disable`, `arbitrary non-"true" string does NOT disable` — each asserts `setInterval` × 3.    |
| AC3 | The boot log line reflects the gate decision: `inventory-reconcile: 15min` when active, `inventory-reconcile: DISABLED` when gated off.                                 | `REQ-078 AC3 — startup log reflects the gate decision` — spies on `console.warn`, asserts the log line contains `inventory-reconcile: DISABLED` when env=true.   |
| AC4 | The kill-switch only affects the inventory reconciliation job. Reward-expiry (REQ-048) and Instagram-rewards (REQ-058) jobs keep their schedule unconditionally.        | `REQ-078 AC4 — gate only affects inventory-reconcile; reward-expiry + instagram-rewards still register` — asserts both intervals are 3 600 000 ms (hourly).      |

## Surfaces / contracts under test

| Surface                                                               | Source-of-truth         | Pinned by                                           |
| --------------------------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| `startScheduledJobs()` env-var gate logic                             | `lib/scheduled-jobs.ts` | 7 vitest cases (existing default-3 + 6 new AC1-AC4) |
| Boot log line shape (`inventory-reconcile: 15min` vs `DISABLED`)      | `lib/scheduled-jobs.ts` | `REQ-078 AC3` case                                  |
| Strict literal `'true'` match (no falsey-coerce, no case-insensitive) | `lib/scheduled-jobs.ts` | `REQ-078 AC2` `'false'` + `'1'` cases               |

## Out of scope

- Integration tests against a real Mongo + scheduler tick — the gate decision happens at registration time (Node `setInterval`), so unit-level coverage is sufficient. The downstream `InventoryService.reconcileMissedDeductions` + `OrderService.scanStalePaidOrders` are independently tested under REQ-066's pack.
- E2E spec — no UI surface; this REQ ships only an env-var operational lever.
- Manual smoke after deploy — covered by Verification §3/§4 of the implementation plan.

## Test design (devaudit#50)

- **Layers planned:** unit only (no integration / e2e / visual / manual beyond the implementation plan's §4)
- **Layers covered:**
  - **unit ✓** — `__tests__/lib/scheduled-jobs.test.ts` (existing 4 cases + 7 new = 11 total in this file)
  - **integration: deferred** — no DB or external interaction; the gate is a boolean on `process.env`
  - **e2e: deferred** — no UI surface
  - **visual: deferred** — no rendered output
  - **manual: covered by §4 of implementation plan** — Railway env var flip + service restart + log inspection
- **Skill invocation:** no sub-skills invoked; LOW risk + unit-only put this REQ on the `stage_1_min_risk_class: MEDIUM` skip path for the SoT-alignment trio. `e2e-test-engineer` not invoked (no e2e specs).
