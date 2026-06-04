# REQ-066 — Security summary

## Threat model — STRIDE pass over the changed surfaces

| Category               | Surface                                 | Assessment                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spoofing               | `OrderService.completeOrder` chokepoint | No new auth surface introduced. The function is callable only from inside the server process (no HTTP endpoint added). Existing UI surfaces (`order-management-actions.ts`) that route through it perform the standard session/role gate before invocation.                                                                                                                                                                                                        |
| Tampering              | Order.status mutation                   | The canonical chokepoint is the ONLY function in the codebase that sets `Order.status = 'completed'` (proven by Phase 1 grep + the regression-guard test). The reconciliation cron explicitly never mutates `status` — that contract is operator-stipulated and enforced by code review of `lib/scheduled-jobs.ts`. A future regression would have to add a `status='completed'` mutation OUTSIDE the chokepoint, which would surface in the next inventory audit. |
| Repudiation            | Completion audit trail                  | Every completion writes an AuditLog entry via `AuditLogService.createLog` (`action: 'order.update'`, `details: { previousStatus, newStatus, inventoryDeducted, incidentWritten }`). On deduction throw, an IncidentEvent row is also written with `actorRole` + error details. The pre-existing `order.statusHistory` array also records every transition with `timestamp` + `note`.                                                                               |
| Information disclosure | IncidentEventModel                      | New collection holds operational metadata: `kind` (enum), `entityId` (Order id), `summary` (string), `errorDetails` (JSON object containing the error message + actor metadata). No customer PII beyond the order id already in the Order doc. `/dashboard/incidents` is gated by `requireRole(['csr', 'admin', 'super-admin'])` — same RBAC as the rest of the admin dashboard.                                                                                   |
| Denial of service      | 15-min reconciliation cron              | Both passes (retry-deduction + stale-paid-orders scan) have hard limits (default 100 rows per pass). If the missed-deduction queue grows, the cron picks up 100 per tick (~400/hour). The stale-paid-orders scan has a 24h-dedup window so the same stuck order doesn't generate ~96 rows/day in IncidentEvent. No external dep called — every operation is a Mongo query against indexed fields.                                                                  |
| Elevation of privilege | None                                    | No new role-elevation surface. Reconciliation cron runs server-side without a session; it never grants or modifies user permissions. The visibility scan is read-only.                                                                                                                                                                                                                                                                                             |

## Authentication & authorisation

- **Order completion UI gating:** `app/actions/admin/order-management-actions.ts:updateOrderStatusAction` requires `session.role ∈ {admin, super-admin, kitchen-staff}` before invoking `OrderService.completeOrder`. Direct invocation of `completeOrder` from a JS callsite is server-only (Next.js server action / cron-job context); no client-side path can call it without going through the role-gated action.
- **Incidents view:** `app/dashboard/incidents/layout.tsx` calls `requireRole(['csr', 'admin', 'super-admin'])` — same gate as `/dashboard/support`. No actions in this v1 (read-only); no XSS surface (rendered text only).
- **Cron:** runs in-process via `lib/scheduled-jobs.ts`. No HTTP endpoint, no session, no external trigger. Single-instance assumption documented at the top of the file.

## Data protection

- **No new PII collected or exposed.** IncidentEvent rows hold `{ kind, entityId, summary, errorDetails }` — operational metadata referencing orderIds already visible to admins.
- **AuditLog entries on every completion** strengthen the GDPR Art. 5(1)(d) accuracy posture — every status flip + inventory mutation is timestamped and attributed.
- **Idempotency** on every deduction call: the `!inventoryDeducted` guard ensures duplicate triggers (cron retry + manual completion race) cannot double-decrement. Inventory totals stay correct under any sequencing.

## Dependency audit

- **No new packages** added.
- `npm audit --audit-level=high`: 0 vulnerabilities on the changed branch.

## SAST

- ESLint: 0 errors. 950 pre-existing `no-console` warnings unchanged.
- Semgrep / CI Security gate: SUCCESS.

## Rollback

Revert PR #281. The schema additions are purely additive (IncidentEvent collection stays in place but unreferenced; pre-existing data unaffected). The cron deregisters cleanly. The deduction goes back to the pre-REQ-066 mess of 6 inline call sites + the duplicate completion functions — meaning **the original #277 bug returns**.

Therefore: rollback only as a true emergency. A forward-fix (e.g. addressing a defect surfaced during UAT review) is strongly preferred. The reconciliation cron's retry pass + the stale-paid-orders visibility scan make any forward-fix safer than rolling back.
