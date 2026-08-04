# Security Evidence Summary — REQ-098

**Date:** 2026-08-03

| Control                                               | Result | Evidence                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SAST                                                  | PASS   | `npm run lint` — 0 errors (pre-existing console-statement warnings only, including the new remediation script's own operator-facing `console.log` calls, consistent with sibling scripts)                                                                                |
| Dependency audit                                      | PASS   | No new dependencies introduced by this REQ (a separate, unrelated housekeeping PR — #635 — fixed two pre-existing npm audit findings; already merged to develop before this REQ's release PR)                                                                            |
| RBAC gate on write-off action (R-019)                 | PASS   | `writeOffTabAction` re-enforces `session.role === 'admin' \|\| 'super-admin'` server-side, identical to `deleteTabAction`'s pattern — proven by `__tests__/actions/tabs/tab-actions.write-off.test.ts`                                                                   |
| Required reason + audit trail (R-019, R-022)          | PASS   | `reason` required at both service and action layers; `tab.write_off` audit-log entry records actor/reason/amount; double-write-off explicitly refused — proven by `__tests__/services/tab-service.write-off.test.ts`                                                     |
| Remediation script scoping + backup (R-020)           | PASS   | Selection criteria hard-coded to the exact 2026-07-31 business-date window + a 30+ day gap threshold; `mongodump` backup before any write; explicit typed `yes` confirmation; idempotent rerun — proven by `__tests__/scripts/write-off-dormant-tabs-2026-07-31.test.ts` |
| No new secrets, credentials, or external dependencies | PASS   | The remediation script reuses existing `MONGODB_WAWAGARDENBAR_APP_URI`/`MONGODB_DB_NAME` env vars and the local `mongodump` binary already assumed present for `scripts/sync-prod-to-uat.sh`.                                                                            |

## Data handling

No new personal-data field, category, or purpose is introduced (see implementation plan §5). The `writeOff` subdocument's `writtenOffBy` actor reference follows the same pattern as the already-covered `deletedBy`/`reconciledBy`/`processedBy` actor references elsewhere on these models.

## Post-deploy controls

- No migration required — `paymentStatus` enum additions and the `writeOff` subdocument are additive-only; existing documents are unaffected until explicitly written off.
- The one-time remediation script (AC7) has **not** been run against production as part of this REQ's implementation — that is a deliberate, separate operator-initiated action per the plan's rollback section, gated on the dry-run output being reviewed against the known 51-tab list first.
- No new secrets, credentials, or external dependencies.
