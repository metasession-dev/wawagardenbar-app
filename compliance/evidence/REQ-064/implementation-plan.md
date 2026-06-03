# REQ-064 — Bundle C (support ticket model + WA-fed staff queue)

**Status:** IN PROGRESS · **Risk:** MEDIUM · **Issue:** #117 P3 #17

## Context

Today `submitSupportTicketAction` only sends an email (`sendSupportTicketEmail`) with a generated `TKT-${Date.now()}` number and never persists. There's no `/dashboard/support` page, so staff have to dig support requests out of their inbox. REQ-056 (RELEASED) already classifies WhatsApp inbound messages with intent `support_text` and persists them to `IncomingMessage` with `actionTaken: 'queued_for_staff'` — but nothing actually picks them up. P3 #17 asks for the persistent model + staff queue, with the WhatsApp inbound path auto-creating tickets when REQ-056 classifies a support intent.

## Acceptance criteria

1. **AC1 — SupportTicket model.** New `models/support-ticket-model.ts` persists every submitted ticket. Fields: `ticketNumber` (unique, generated server-side), `userId` (optional — guests + WhatsApp auto-creates), `customerEmail` / `customerPhone` (for contact-method fallback), `source` (`web` / `whatsapp`), `category`, `subject`, `message`, `orderId` (optional), `status` (`open` / `in_progress` / `awaiting_customer` / `resolved` / `closed`, default `open`), `priority` (`low` / `normal` / `high`, default `normal`), `assignedTo` (optional userId), `replies: [{ authorRole, authorUserId, body, createdAt }]`, `createdAt`/`updatedAt`. Unique index on `ticketNumber`.
2. **AC2 — submitSupportTicketAction persists.** Replaces the current email-only path with a `SupportTicketService.createTicket` call. The existing `sendSupportTicketEmail` is kept as a best-effort confirmation (don't fail the action if email errors — the ticket is the source of truth).
3. **AC3 — WhatsApp inbound auto-creates.** `WhatsAppInboundService.handle` calls `SupportTicketService.createFromWhatsAppInbound(from, body, userId)` when `intent === 'support_text'` (the catch-all branch that today logs `queued_for_staff` without doing anything). The ticket gets `source: 'whatsapp'`, `category: 'whatsapp-inbound'`, `subject` derived from the message preview (first 60 chars), and the full body as the message.
4. **AC4 — `/dashboard/support` queue UI.** Server-rendered list with: status badges, source pill (web/whatsapp), category, subject, customer, created-at, time-since-open. Status filter (default: not-closed). RBAC: `admin`, `super-admin`, `csr` per the existing dashboard pattern (`getCurrentUser` gate).
5. **AC5 — Ticket detail + reply.** Click a row → detail page with full message + replies thread + status select (open / in_progress / awaiting_customer / resolved / closed) + reply textarea. Reply path: persists to `replies[]` and `NotificationService.send`s the reply to the customer (`support_reply` template; channel-fallback honours user consent — REQ-054).

## Technical approach

### Model + service (3 new files)

- `models/support-ticket-model.ts` — Mongoose schema with the AC1 shape. Unique index on `ticketNumber`. `replies` is an embedded subdoc array (each with `_id` for deletion if ever needed).
- `services/support-ticket-service.ts` — `createTicket`, `createFromWhatsAppInbound`, `listTickets({ status?, source?, category?, search?, limit?, skip? })`, `getTicketById`, `updateStatus`, `addReply` (calls `NotificationService.send` for the outbound notification with a `support_reply` template — added to `lib/notification-templates.ts` as `transactional`).
- `interfaces/support-ticket.interface.ts` — `ISupportTicket` type + status/source/category enums.

### Submit-action rewire (1 file)

`app/actions/communication/communication-actions.ts:submitSupportTicketAction` — call `SupportTicketService.createTicket` first, then best-effort `sendSupportTicketEmail`. Return the DB-persisted `ticketNumber`.

### WhatsApp inbound bridge (1 file)

`services/whatsapp-inbound-service.ts:handle` — replace the `actionTaken = 'queued_for_staff'` branch with a `SupportTicketService.createFromWhatsAppInbound` call, then set `actionTaken = 'ticketed'`.

### Dashboard pages (3 new files)

- `app/dashboard/support/page.tsx` — server component: list with filters. Calls `SupportTicketService.listTickets`. Renders rows via a small client filter-bar.
- `app/dashboard/support/[ticketId]/page.tsx` — server component: detail + replies thread. Embeds the reply client component.
- `components/features/dashboard/support/reply-thread.tsx` — client component: reply form + status select. Calls `addSupportReplyAction` / `updateSupportStatusAction`.

### Server actions for the UI (1 file)

`app/actions/dashboard/support-actions.ts` — `addSupportReplyAction(ticketId, body)`, `updateSupportStatusAction(ticketId, status)`. RBAC gate on each (`getCurrentUser().role` ∈ admin/super-admin/csr).

### Template registry (1 file)

`lib/notification-templates.ts` — add `support_reply: 'transactional'`. Honesty note: the Meta template won't exist until WA-1 lands; the WhatsApp branch will fail and the orchestrator falls through to email. That's the right behaviour for now.

### Nav (1 file)

`components/features/dashboard/sidebar.tsx` (or whatever the dashboard sidebar is) — add a "Support" link visible to admin/super-admin/csr.

## Risk

**MEDIUM.** New model + new admin surface + cross-system bridge (REQ-056 inbound router → tickets). No new auth surface — uses existing session-based RBAC. No PII added (everything the model holds is already in `IncomingMessage` or the user record).

## Security considerations

- **RBAC on staff actions.** Every dashboard server action gates on `getCurrentUser` returning a role ∈ {admin, super-admin, csr}. Forged client calls reach the gate, not the data.
- **Customer can read only their own tickets.** No customer-side UI in this REQ (kept tight), but `getTicketById` rejects when `session.userId !== ticket.userId` unless the caller is staff. Tested.
- **No mass-email risk in reply.** Reply uses `NotificationService.send` with `support_reply` (`transactional` category) — the consent gate from REQ-054 stops sends to users who've opted out.
- **WhatsApp body sanitisation.** `subject` for a WA-fed ticket is `body.slice(0, 60)` after trimming control chars; the full body lives in `message`. No HTML rendering of customer-supplied content in the dashboard (text-only).

## Dependencies

- REQ-054 (RELEASED) — `NotificationService.send` provides the reply send path with consent fallback.
- REQ-055 (RELEASED) — pattern for embedded-subdoc audit (NotificationLog).
- REQ-056 (RELEASED) — `WhatsAppInboundService.handle` already classifies `support_text`; REQ-064 adds the action arm.
- REQ-063 (RELEASED) — new consent shape; reply send respects the right gates by routing through NotificationService.

## Test scope

Vitest cases (target ~9):

1. `support-ticket-model.test.ts` — defaults (status `open`, priority `normal`); ticketNumber generation uniqueness.
2. `support-ticket-service.createTicket.test.ts` — creates with the expected shape; returns ticketNumber.
3. `support-ticket-service.createFromWhatsAppInbound.test.ts` — source `whatsapp`, subject is body preview, full body in `message`.
4. `support-ticket-service.addReply.test.ts` — appends to replies, calls NotificationService.send with `support_reply` template + the user's userId.
5. `support-ticket-service.listTickets.test.ts` — filter by status + source + search.
6. `submitSupportTicketAction.test.ts` — persists ticket; email send failure does not fail the action.
7. `whatsapp-inbound.support_text-creates-ticket.test.ts` — `support_text` intent triggers `createFromWhatsAppInbound` + IncomingMessage `actionTaken === 'ticketed'`.
8. `support-actions.rbac.test.ts` — non-staff session is rejected from `addSupportReplyAction` and `updateSupportStatusAction`.
9. `support-ticket-service.getTicketById.test.ts` — customer can read own ticket; rejects cross-customer access.

Dashboard pages + reply-thread client component: manual UAT (UI-only; service layer is unit-tested).

## Plan deviation

_(to be filled if implementation requires divergence)_
