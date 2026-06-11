# REQ-078 — Test scope

## In scope (this PR)

### Production code

- `lib/scheduled-jobs.ts` — env-var gate added around the `runInventoryReconciliationJob` registration; boot log line extended to surface the gate decision

### Unit tests

- `__tests__/lib/scheduled-jobs.test.ts` — 7 new cases under the `REQ-048 + REQ-058 + REQ-078: startScheduledJobs` describe block. Existing `started`-flag idempotency case adapted to use `vi.resetModules()` + dynamic imports so the module state resets between cases. Added inventory-service + order-service mocks so the inventory-reconcile path is registrable without touching the real services.

### Compliance

- `compliance/RTM.md` — REQ-078 IN PROGRESS row above REQ-077
- `compliance/plans/REQ-078/implementation-plan.md` + mirrored evidence copy
- `compliance/evidence/REQ-078/{test-plan,test-scope,test-execution-summary,security-summary,ai-use-note,ai-prompts}.md` — 6-doc pack
- `compliance/pending-releases/RELEASE-TICKET-REQ-078.md`

## SRS items covered

**None added.** The kill-switch is an operational lever, not a user-observable behaviour change. REQ-066's existing SRS items (REQ-INV-012 incidents queue, REQ-INV-013 retry-now action) remain the source of truth for the queue + retry semantics that this REQ gates.

Annotated `@srs-deferred: operational-toggle` in the implementation plan — when the SystemSettings + admin UI promotion happens (separate future REQ), that REQ will codify the user-observable surface.

## Out of scope (deferred to follow-up REQs)

| Item                                                                      | Why deferred                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SystemSettings` field for `STALE_PAID_ORDER_THRESHOLD_HOURS`             | Separate operational knob; doesn't share the gate this REQ adds. Promote when operations needs to tune it without a redeploy.                                                                                 |
| Admin UI toggle at `/dashboard/settings/jobs`                             | Heavier scope — needs SystemSettings model + permission gate + UI + e2e. This REQ is the operational stopgap; an admin UI promotion is a separate REQ when not urgent.                                        |
| Gating `scanStalePaidOrders` (the second pass) separately                 | Both passes share the registration, so disabling the job disables both. Stale-paid-order detection is read-only — it only writes `IncidentEvent` rows for visibility — so leaving it off during triage is OK. |
| `runRewardExpiryJob` (REQ-048) + `runInstagramRewardsJob` (REQ-058) gates | Out of REQ-078 scope. Each would be a separate operational lever if/when operations needs to disable them; no current need surfaced.                                                                          |
