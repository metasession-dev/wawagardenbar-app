---
req: REQ-078
risk: LOW
date: 2026-06-11
---

# REQ-078 — Env-var kill-switch for the inventory reconciliation job

## Context

Operator needs to disable `runInventoryReconciliationJob` (in `lib/scheduled-jobs.ts`) on a running Railway production deploy without a code-edit + redeploy cycle. The job today auto-retries `InventoryService.reconcileMissedDeductions` every 15 minutes (re-attempts stock deduction for orders with `inventoryDeducted: false`). When the operator wants to manually triage which orders should deduct vs which should stay flagged (e.g. during a sale-point inventory reconciliation), the auto-retry interferes.

The in-code comment at `lib/scheduled-jobs.ts:23-26` already anticipated this gap: _"Hard-coded for v1 — a future REQ can promote this to a SystemSettings field if operations needs to tune it without a redeploy."_ The full SystemSettings + admin UI promotion is REQ-sized and not urgent; the env-var gate is a 1-file change that unblocks production today.

## Acceptance criteria

| AC  | Statement                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 | When `process.env.DISABLE_INVENTORY_RECONCILIATION_JOB === 'true'`, `startScheduledJobs()` does **NOT** register the `setTimeout` + `setInterval` pair for `runInventoryReconciliationJob`. Reward-expiry and instagram-rewards jobs are unaffected.   |
| AC2 | When the env var is unset, set to `'false'`, or set to any other value, the inventory-reconciliation job registers as it does today (same cadence: 60s initial delay + 15-min interval). Default behaviour is unchanged.                               |
| AC3 | The startup log line at `lib/scheduled-jobs.ts:138-140` reflects the actual state: includes `inventory-reconcile: 15min` when active, `inventory-reconcile: DISABLED` when gated off, so the Railway log makes the gate decision visible at boot time. |
| AC4 | The kill-switch only gates the inventory reconciliation job. `runRewardExpiryJob` (REQ-048) and `runInstagramRewardsJob` (REQ-058) stay on the same schedule regardless of the env var.                                                                |

## Surfaces touched

- `lib/scheduled-jobs.ts` — add env-var gate around the inventory-reconciliation registration block (lines 134-136); update the bottom log message
- `__tests__/lib/scheduled-jobs.test.ts` — extend existing `startScheduledJobs` describe block with 2 new cases pinning the env-var contract; update the existing "registers THREE intervals" case to account for the env-var-disabled branch

## Out of scope

- SystemSettings field for the threshold (`STALE_PAID_ORDER_THRESHOLD_HOURS`) — separate REQ when needed
- Admin UI toggle at `/dashboard/settings/jobs` — separate REQ; this REQ is the operational stopgap
- Gating the `scanStalePaidOrders` sub-pass separately — both passes share the registration, so disabling the job disables both. Stale-paid-order detection is read-only (only creates `IncidentEvent` rows for visibility); leaving it off is acceptable while the operator triages
- E2E spec — no UI surface; unit-test coverage is sufficient for LOW risk

## Threat model + framework attribution

| Clause                                        | Coverage                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                  | AC1-AC4 each map to a unit test case (Pinning the env-var contract is the verification strategy.)     |
| **ISO 27001 A.8.25** Secure SDLC              | No new threat surfaces. The env var is read-only at boot; no user input flows into the gate decision. |
| **GDPR Art. 25** Data protection by design    | N/A — no personal data scope.                                                                         |
| **EU AI Act Art. 11** Technical documentation | N/A — no AI in scope.                                                                                 |

### Risk-register entries

- **No new risk-register entries.** The change is fail-safe: env unset = current behaviour preserved (AC2). Misconfiguration (e.g. operator forgets to unset after triage) results in stuck `inventory_deduction_failed` incidents which already have the manual `<IncidentRetryButton>` remediation path from REQ-066 AC10. No data loss, no correctness regression.

### Architecture decisions

- **No ADR needed.** Single-file env-var guard around an existing in-process scheduler registration. Reuses the same `process.env` access pattern other parts of the codebase use. No new dependency, no schema change, no pattern shift.

## SRS items proposed/touched

- **No new SRS items.** The kill-switch is an operational lever, not a user-observable behaviour change. REQ-066's existing SRS items (REQ-INV-012/013) remain the source of truth for the queue + retry semantics. Annotate the env-var as `@srs-deferred: operational-toggle` — when the SystemSettings + admin UI promotion happens, that REQ will codify the user-observable surface.

## Verification

1. `npx tsc --noEmit` → exit 0
2. `npx vitest run __tests__/lib/scheduled-jobs.test.ts` → all cases green (existing 5 + 2 new = 7)
3. Local dev sanity (optional): boot dev server with `DISABLE_INVENTORY_RECONCILIATION_JOB=true npm run dev`; confirm the startup log shows `inventory-reconcile: DISABLED`
4. Railway prod: after release, set `DISABLE_INVENTORY_RECONCILIATION_JOB=true` in the Railway env vars panel; redeploy (or restart the service); confirm the startup log shows `inventory-reconcile: DISABLED` in the Railway log stream

## Done when

- AC1-AC4 all pinned by unit tests
- tsc + vitest green locally
- Integration PR opens against develop with the test + implementation as a single change
- Release PR ships the env-var gate to main; operator sets the var in Railway prod when ready
