# Release Ticket: REQ-064 — Support ticket model + WA-fed staff queue (#117 P3 #17)

**Status:** RELEASED
**Date:** 2026-06-03
**Requirement ID:** REQ-064
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 P3 #17](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#270](https://github.com/metasession-dev/wawagardenbar-app/pull/270) — merged to develop 2026-06-03.
**Release PR:** #272
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-064`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** UAT approved + Production approved on the DevAudit portal (`released`); post-deploy production smoke evidence captured. Closed out 2026-06-03.
**Sign-off (dual-actor):** Pending UAT approval + Production approval on the DevAudit portal.

---

## Summary

Replaces today's email-only ephemeral support flow with a persistent SupportTicket model + staff queue, and wires REQ-056's WhatsApp inbound `support_text` intent to auto-create tickets (which previously was a `queued_for_staff` no-op).

- **AC1** — New `SupportTicket` Mongoose model with `status` (open/in_progress/awaiting_customer/resolved/closed), `source` (web/whatsapp), `priority` (low/normal/high), and `replies[]` embedded subdoc array.
- **AC2** — `submitSupportTicketAction` persists the ticket FIRST, then best-effort email confirmation. Ticket is the source of truth — a mail-server outage no longer breaks the customer submit.
- **AC3** — `WhatsAppInboundService.handle` calls `SupportTicketService.createFromWhatsAppInbound` on the support branch; tags the IncomingMessage audit row with `actionTaken: 'ticketed'`. Failure falls back to `queued_for_staff` so the audit row still persists.
- **AC4** — `/dashboard/support` queue UI with status filter chips (default: open); RBAC csr/admin/super-admin.
- **AC5** — Ticket detail page with conversation thread + reply form + status select. Replies route via `NotificationService.send` (`support_reply` template, transactional category — falls through to email until WA-1 lands at Meta).

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** Implementation plan with 5 ACs + STRIDE + security considerations; new SupportTicket Mongoose model with 3 indexes (status+createdAt, userId+createdAt, source+createdAt); SupportTicketService with createTicket/createFromWhatsAppInbound/listTickets/getTicketById/updateStatus/addReply (best-effort notification side-effect); rewrite of submitSupportTicketAction to persist-first; bridge in WhatsAppInboundService.handle that lazy-imports SupportTicketService; staff queue UI (server-rendered list page + detail page + client reply-thread); two server actions with role-gated RBAC; 12 new vitest cases + 1 updated REQ-056 routing test for the new actionTaken value. See `compliance/evidence/REQ-064/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** authorised Bundle B/C/D from the post-REQ-062 backlog; at plan time confirmed wiring REQ-056 inbound → ticket auto-create in the same PR (rather than splitting to a follow-up REQ); reviewed integration PR #270.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § Four-eyes attestation.

## Implementation Details

**Files Added:**

- `models/support-ticket-model.ts` — Mongoose schema (~130 LOC).
- `services/support-ticket-service.ts` — service layer with NotificationService side-effect (~215 LOC).
- `app/dashboard/support/layout.tsx` — RBAC gate (csr/admin/super-admin).
- `app/dashboard/support/page.tsx` — queue listing with status filter chips.
- `app/dashboard/support/[ticketId]/page.tsx` — ticket detail + conversation thread.
- `app/actions/dashboard/support-actions.ts` — `addSupportReplyAction` + `updateSupportStatusAction` with server-side RBAC.
- `components/features/dashboard/support/reply-thread.tsx` — client reply + status-change surface.
- `__tests__/models/support-ticket-model.test.ts` — 3 cases.
- `__tests__/services/support-ticket-service.test.ts` — 7 cases.
- `__tests__/actions/dashboard/support-actions.rbac.test.ts` — 4 cases.
- `__tests__/services/whatsapp-inbound.support-ticket.test.ts` — 2 cases.
- `compliance/plans/REQ-064/implementation-plan.md` — plan with ACs, risk, security.

**Files Modified:**

- `app/actions/communication/communication-actions.ts:submitSupportTicketAction` — persist-first; best-effort email.
- `services/whatsapp-inbound-service.ts:handle` — bridges the support branch to `SupportTicketService.createFromWhatsAppInbound`; tags IncomingMessage with `actionTaken: 'ticketed'`.
- `__tests__/services/whatsapp-inbound-service.routing.test.ts` — REQ-056 AC4 updated (`queued_for_staff` → `ticketed`); AC7 mock surface extended with the new ticket-service mock.
- `compliance/RTM.md` — REQ-064 IN PROGRESS row.

**Schema changes:** new `SupportTicket` collection (auto-created on first write). 3 indexes.

**Migration:** none required (new collection).

## Test Plan & Evidence

See `compliance/evidence/REQ-064/test-plan.md` and `test-execution-summary.md`. Full vitest suite: 1063 pass / 4 skip / 0 fail (+16 from REQ-063 baseline of 1047). TypeScript 0 errors. ESLint 0 errors. Production build green.

## Security & Compliance

- **RBAC:** every dashboard server action gates on session role server-side (csr/admin/super-admin). Layout-level `requireRole` is the first line; action-level gate is defence-in-depth against forged client calls.
- **Reply consent posture:** outbound reply notifications use `NotificationService.send` with `support_reply` (transactional). Customers who've opted out of WhatsApp transactional still get the email fallback; those who've opted out of email at this level too just don't get a notification — the reply still persists on the ticket. Aligned with REQ-063's gate shape.
- **PII scope:** ticket holds the customer's submitted message (text-only; no HTML render) plus optional `customerEmail`/`customerPhone`/`orderId`. No new PII categories.
- **WhatsApp body sanitisation:** WA-fed ticket `subject` is `body.slice(0, 60)` after trim; full body in `message`. No HTML rendering anywhere in the dashboard for customer-supplied content.

## Rollback Plan

Revert PR #270. The schema is purely additive (new collection); a revert leaves the collection in place but unreferenced. The WhatsApp inbound branch reverts to its previous `queued_for_staff` no-op behaviour.

## Quality Gates

| Gate                            | Expected   | Actual (2026-06-03)                          |
| ------------------------------- | ---------- | -------------------------------------------- |
| `npx tsc --noEmit`              | exit 0     | exit 0                                       |
| `npx vitest run` (full)         | 0 failures | 1063 pass / 4 skip / 0 fail                  |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings |
| `npm run build`                 | exit 0     | exit 0                                       |
| CI Pipeline (develop)           | SUCCESS    | run 26901043060 — SUCCESS                    |
| Compliance Evidence Upload      | SUCCESS    | run 26901043224 — SUCCESS                    |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-064/implementation-plan.md`)
- [x] Stage 2 — Implement & test (PR #270 merged to develop)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Second of the post-REQ-062 trio (Bundle B → C → D); REQ-065 (data export + cookie consent) follows.
- Honesty note: outbound `support_reply` WhatsApp template won't exist until WA-1 is approved at Meta; reply notifications fall through to email — that's the right behaviour today.
- No new packages, no env vars.
