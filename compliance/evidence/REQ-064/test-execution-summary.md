# REQ-064 — Test execution summary

**Run date:** 2026-06-03
**Commit on develop:** post-PR-#270 merge

## Vitest (unit + integration)

```
RUN  v4.1.8 /home/william/Documents/SoftwareProjects/Metasession/wawagardenbar app

 Test Files  110 passed | 1 skipped (111)
      Tests  1063 passed | 4 skipped (1067)
   Start at  16:13:32
   Duration  4.42s
```

**REQ-064 cases (new):** 12 total + 1 updated.

- `__tests__/models/support-ticket-model.test.ts` — 3 new (defaults; whatsapp shape; invalid-status enum rejected).
- `__tests__/services/support-ticket-service.test.ts` — 7 new (createTicket shape; createFromWhatsAppInbound body-preview-as-subject for long + short bodies; addReply replies-push + NotificationService side-effect; addReply guest-path no-send; listTickets status filter applied; listTickets status="all" omits clause).
- `__tests__/actions/dashboard/support-actions.rbac.test.ts` — 4 new (unauth rejected; customer-role rejected; csr accepted with correct staff-author payload; admin can update status).
- `__tests__/services/whatsapp-inbound.support-ticket.test.ts` — 2 new (bridge wires `createFromWhatsAppInbound` + tags IncomingMessage actionTaken='ticketed'; ticket-create failure falls back to queued_for_staff so audit still persists).

**Updated:**

- `__tests__/services/whatsapp-inbound-service.routing.test.ts` — REQ-056 AC4 updated for new `'ticketed'` actionTaken value + added `SupportTicketService` mock at module level so the lazy-import doesn't reach into a real Mongo client (the previous "queued_for_staff" expectation was the no-op REQ-064 just closed).

## E2E (Playwright)

Five new specs registered against both `smoke` and `regression` projects (verified via `npx playwright test --list`). Not executed locally during this cycle — see _Execution constraint_ below.

**Specs added — 5 files, 8 cases:**

- `e2e/smoke/consent-split-pin-entry.spec.ts` — REQ-063, 2 cases (`test.fixme`).
- `e2e/smoke/consent-split-profile-toggle.spec.ts` — REQ-063, 1 case (`test.fixme`).
- `e2e/smoke/support-queue-rbac.spec.ts` — REQ-064 AC4, 3 cases (csr/admin/super-admin).
- `e2e/support-ticket-staff-flow.spec.ts` — REQ-064 AC4+AC5, 1 case (seeded ticket → queue → detail → reply → status).
- `e2e/support-ticket-whatsapp-inbound.spec.ts` — REQ-064 AC3, 1 case (POST inbound → ticket → queue).

**Execution constraint.** Per the `project_e2e_targeted_until_117` policy, the auto-trigger CI workflows are disabled for the duration of #117 work. New specs land in the pack and will fire via the queued #117-close full-regression run (or via manual `workflow_dispatch`). Local execution requires a running dev server + seeded csr/admin/super-admin from `scripts/seed-e2e-admins.ts` — neither configured in the build env for this cycle.

**REQ-063 deferred posture.** The 3 REQ-063 specs are `test.fixme`'d because the customer PIN-login flow is server-side SMS-fatal without a provider mock (the same blocker that `test.fixme`'s `e2e/smoke/customer-auth.spec.ts`). They un-fixme without a rewrite once `AFRICASTALKING_API_URL` is wired into the e2e setup.

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## ESLint

```
$ npx eslint . --max-warnings=10000
✖ 950 problems (0 errors, 950 warnings)
```

0 errors; 950 pre-existing `no-console` warnings (unchanged from REQ-063 baseline).

## Build

```
$ npm run build
# exit 0 — all routes built successfully, including new /dashboard/support + /dashboard/support/[ticketId]
```

## CI (post-merge to develop)

| Workflow                   | Run ID      | Status  |
| -------------------------- | ----------- | ------- |
| CI Pipeline                | 26901043060 | SUCCESS |
| Compliance Evidence Upload | 26901043224 | SUCCESS |
| CI Status Fallback         | 26901043108 | SUCCESS |

## Regression posture

- 1063 / 1067 = 99.6% pass rate (4 skipped are pre-existing).
- 0 new failures relative to the REQ-063 develop baseline (1047 pass).
- +16 cases delta (12 new REQ-064 + adjustment to existing REQ-056 routing test).
- E2E coverage extended by 5 specs which will run on the next workflow_dispatch or the queued full-regression.
