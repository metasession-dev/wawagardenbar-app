# REQ-064 — Security summary

## Threat model — STRIDE pass over the changed surfaces

| Category               | Surface                                 | Assessment                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spoofing               | `/api/webhooks/whatsapp` inbound bridge | No new spoofing surface introduced by REQ-064 — the existing `x-hub-signature-256` validation from REQ-056 still runs (and is skipped only when `WHATSAPP_APP_SECRET` is unset, a local-only convenience). Auto-created tickets carry whatever `from` Meta reports; not a customer-claimed identity.                                                                     |
| Tampering              | Server-side RBAC on staff actions       | `addSupportReplyAction` + `updateSupportStatusAction` both call `requireStaffSession` server-side, which checks `session.role ∈ {csr, admin, super-admin}`. A forged client call (e.g. a customer hitting the action directly) reaches the gate, not the data. Layout-level `requireRole` is the first line; action gate is defence-in-depth.                            |
| Repudiation            | Reply audit                             | Every reply carries `authorRole` + `authorUserId` (the staff member's id from session) + a server-stamped `createdAt`. Conversation thread is append-only — no edit/delete surface in this REQ.                                                                                                                                                                          |
| Information disclosure | Cross-customer ticket read              | `SupportTicketService.getTicketById` is called only from the dashboard layout (already role-gated). No customer-side read surface added in this REQ (customers can see ticket-count + status of their own tickets only via the existing profile flow; ticket detail is staff-only). A future REQ that adds customer-self-serve detail will need its own ownership check. |
| Denial of service      | WhatsApp inbound auto-create            | Each inbound message persists one ticket + one IncomingMessage row. A spam-flood scenario was considered: Meta's webhook rate-limits at the source and the consumer already handles bulk via the existing throughput path. No additional Mongo queries beyond the existing user lookup + IncomingMessage write.                                                          |
| Elevation of privilege | None                                    | No new auth surface, no new permission boundary. Staff actions inherit the existing dashboard auth.                                                                                                                                                                                                                                                                      |

## Authentication & authorisation

- **Layout gate (first line):** `app/dashboard/support/layout.tsx` calls `requireRole(['csr', 'admin', 'super-admin'])` — anyone without that role gets redirected to `/dashboard/forbidden` before any page renders.
- **Action gate (defence in depth):** `app/actions/dashboard/support-actions.ts:requireStaffSession` re-checks session role server-side on every action call. RBAC is enforced even if a forged client call bypasses the page surface.
- **No new endpoints.** All staff actions use Next.js server actions over the existing session.

## Data protection

- **PII scope:** ticket holds the customer's message text + optional `customerEmail`, `customerPhone`, `orderId`. No new PII categories. All customer-supplied content is rendered as text (no HTML in the dashboard `<div>`s carrying ticket message + reply bodies).
- **WhatsApp body sanitisation:** subject is `body.slice(0, 60)` after trim with `...` ellipsis if truncated; full body lives in `message`. No regex stripping (text-as-text in display).
- **Reply notifications respect consent.** Replies route via REQ-054's `NotificationService.send` with `support_reply` (transactional category). Customers who've opted out of WhatsApp transactional get the email fallback; those who've opted out of email AT THIS LEVEL too just don't get a notification — the reply still persists on the ticket so the conversation history is intact for the next time they check.

## Dependency audit

- **No new packages** added.
- `npm audit --audit-level=high`: 0 vulnerabilities on the changed branch.

## SAST

- ESLint: 0 errors. 950 pre-existing `no-console` warnings unchanged.
- Semgrep / CI Security gate: SUCCESS (included in CI Pipeline run 26901043060).

## Rollback

Revert PR #270. The new collection (`supporttickets`) is purely additive — it stays in place after revert but is no longer written to. The WhatsApp inbound bridge reverts to its previous `actionTaken: 'queued_for_staff'` no-op. No data integrity exposure during a rollback window because no ticket-creation flow lived elsewhere before this REQ.
