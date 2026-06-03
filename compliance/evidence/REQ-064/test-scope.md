# REQ-064 — Test scope

## In scope (unit + integration)

- SupportTicket model: schema defaults (status `open`, priority `normal`, replies `[]`); enum validation rejects bad status values; whatsapp source + whatsapp-inbound category accepted.
- SupportTicketService: `createTicket` shape (TKT- prefix, source/category/customer fields persisted); `createFromWhatsAppInbound` (subject = body preview, full body in message, source = whatsapp); `addReply` (push to replies[] + NotificationService.send side-effect for userId-bearing tickets; no send for guest tickets); `listTickets` filter shape (status = "all" omits clause).
- support-actions RBAC: unauthenticated rejected; customer role rejected; csr/admin accepted.
- WhatsAppInboundService.handle bridge: support intent → `createFromWhatsAppInbound` call + IncomingMessage `actionTaken: 'ticketed'`; ticket-create failure falls back to `actionTaken: 'queued_for_staff'` so the audit row still persists.

## In scope (E2E)

- `e2e/smoke/support-queue-rbac.spec.ts` — csr/admin/super-admin can each open `/dashboard/support`.
- `e2e/support-ticket-staff-flow.spec.ts` — seeded ticket → queue rendering → detail page → CSR reply persists + appears in thread → status change to `resolved` persists (DB verification).
- `e2e/support-ticket-whatsapp-inbound.spec.ts` — POST inbound webhook → `SupportTicket` auto-created with whatsapp source + body-preview subject + customer phone → surfaces in queue when filtered by `source=whatsapp`.

## REQ-063 E2E (deferred — fixme'd)

- `e2e/smoke/consent-split-pin-entry.spec.ts` — 2 `test.fixme` cases (3-checkbox render + AC1/AC3 persistence).
- `e2e/smoke/consent-split-profile-toggle.spec.ts` — 1 `test.fixme` case (profile email-marketing toggle).

These follow the same pattern as the existing `e2e/smoke/customer-auth.spec.ts` and un-fixme when the SMS provider mock lands. Until then, REQ-063's UI layer is covered by manual UAT.

## Out of scope

- **REQ-063 AC4 — NotificationService email-marketing gate via E2E.** No admin "trigger marketing email" UI surface exists, so the gate is unit-tested only (3 cases in `__tests__/services/notification-service.email-marketing-gate.test.ts`). Adding such an admin trigger would be its own REQ.
- **Customer-side support-form submission via E2E.** Same SMS-fatal blocker as REQ-063. The unit test for `submitSupportTicketAction` (via the integration of the action with `SupportTicketService.createTicket`) is the load-bearing gate.
- **Migration script.** No migration required — new collection auto-created.
- **Visual regression.** Project doesn't use visual regression; the new dashboard surface is conventional shadcn/Card/Table — visual-regression coverage would be over-investment.
- **Performance/load.** Ticket counts won't reach pagination-stress volumes for the foreseeable future; basic indexes on `status+createdAt`, `userId+createdAt`, `source+createdAt` are in place.

## Manual UAT — what to check

1. **Customer submits via SupportForm** — verify `TKT-...` number returned + ticket appears in `/dashboard/support` queue immediately.
2. **Email confirmation path** — disconnect the mail server (or set bogus SMTP creds), submit a ticket; the action should still succeed and the ticket should persist (just no confirmation email).
3. **CSR queue empty-state** — first-time CSR view shows the empty-state copy when no tickets match the filter.
4. **CSR detail → reply notification** — verify the customer receives the reply via email (with WA-1 still pending at Meta, the WhatsApp branch falls through). Email subject is `Re: <original subject>`.
5. **WhatsApp inbound STOP** — REQ-056 opt-out flow still works (this REQ doesn't touch it); confirm STOP from a customer who later sends a non-opt-out message still triggers the support_text → ticket auto-create.
6. **Status transitions** — open → in_progress → awaiting_customer → resolved → closed all persist + revalidate the list page.
