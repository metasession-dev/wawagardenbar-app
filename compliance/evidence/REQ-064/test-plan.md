# REQ-064 — Test plan

**Requirement ID:** REQ-064
**Risk:** MEDIUM
**Related issue:** [#117 P3 #17](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-03

## Acceptance criteria → tests

| AC  | Statement                                                                                                                         | Test                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | SupportTicket model with status / source / priority / replies subdoc array                                                        | `__tests__/models/support-ticket-model.test.ts` — 3 cases (defaults + enum gates + whatsapp shape)                                                                                                                                                                                                                                       |
| AC2 | `submitSupportTicketAction` persists ticket FIRST then best-effort emails                                                         | `__tests__/services/support-ticket-service.test.ts` — `createTicket` returns persisted shape with TKT- prefix; manual UAT for the action's email-failure-non-fatal posture (covered by integration with the submit form on a staging mail outage)                                                                                        |
| AC3 | REQ-056 inbound bridge: `support_text` → `createFromWhatsAppInbound`; IncomingMessage `actionTaken: 'ticketed'`                   | `__tests__/services/whatsapp-inbound.support-ticket.test.ts` — 2 cases (bridge wires; failure fallback); `__tests__/services/whatsapp-inbound-service.routing.test.ts` AC4 — REQ-056 routing test updated. **E2E** `e2e/support-ticket-whatsapp-inbound.spec.ts` — POST inbound → SupportTicket auto-created → surfaces in queue         |
| AC4 | `/dashboard/support` queue with status filter chips; RBAC csr/admin/super-admin                                                   | `__tests__/actions/dashboard/support-actions.rbac.test.ts` — 4 cases (unauth + customer-role rejected; csr/admin accepted). **E2E** `e2e/smoke/support-queue-rbac.spec.ts` — 3 cases (csr/admin/super-admin can each open `/dashboard/support`). **E2E** `e2e/support-ticket-staff-flow.spec.ts` covers queue rendering with seeded data |
| AC5 | Ticket detail page with reply thread + status select; reply routes via `NotificationService.send` (`support_reply` transactional) | `__tests__/services/support-ticket-service.test.ts` — addReply pushes to replies[] + triggers NotificationService.send; guest path (no userId) doesn't send. **E2E** `e2e/support-ticket-staff-flow.spec.ts` — seeded ticket → CSR posts reply → reply renders in thread → status change to `resolved` persists (DB-verified)            |

## Test environment

- **Unit:** vitest 4.1.x. `@/lib/mongodb` / `@/lib/session` / `iron-session` / `next/headers` mocked. `@/models/support-ticket-model` mocked at the import boundary. `@/services/notification-service` mocked (no real outbound). `@/services/support-ticket-service` lazy-imported by the inbound router; mocked in REQ-056 routing test to avoid timeouts.
- **E2E:** Playwright via the existing 2-project setup (smoke + regression by location). REQ-063 specs are `test.fixme`'d pending an SMS provider mock (same blocker as `customer-auth.spec.ts`); they un-fixme when `AFRICASTALKING_API_URL` is wired into e2e setup. REQ-064 specs run today against any env with seeded CSR/admin/super-admin storageState + a local Mongo.
- **E2E auto-trigger:** OFF per `project_e2e_targeted_until_117`. New specs live in the pack and will fire via the queued #117-close full-regression run or via manual `workflow_dispatch`.

## Quality gates

| Gate                            | Expected                     | Actual (2026-06-03)                                       |
| ------------------------------- | ---------------------------- | --------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                       | exit 0                                                    |
| `npx vitest run` (full)         | 0 failures                   | 1063 pass / 4 skip / 0 fail                               |
| `npx eslint . --max-warnings=0` | 0 errors                     | 0 errors / 950 pre-existing console warnings              |
| `npm run build`                 | exit 0                       | exit 0                                                    |
| `npx playwright test --list`    | all specs compile + register | 5 new specs discovered across smoke + regression projects |
| CI Pipeline (develop)           | SUCCESS                      | run 26901043060 — SUCCESS                                 |
| Compliance Evidence Upload      | SUCCESS                      | run 26901043224 — SUCCESS                                 |
