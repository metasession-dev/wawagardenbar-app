# REQ-055 — Security summary

**Requirement ID:** REQ-055
**Risk class:** LOW-MEDIUM
**Surface:** new `models/notification-log-model.ts`, `services/notification-log-service.ts`; small additions to `services/notification-service.ts` (REQ-054) and `lib/whatsapp.ts:handleWebhook`.

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                         |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | The webhook route at `app/api/webhooks/whatsapp/route.ts` already verifies Meta's `x-hub-signature-256` HMAC-SHA256 before any payload reaches `WhatsAppService.handleWebhook` (and therefore before any `NotificationLogService.updateStatus` call). REQ-055 doesn't change the auth surface. |
| **T** — Tampering       | Low              | The monotonic-status filter (AC5) prevents a stale or replayed Meta event from rolling the row back through the lifecycle. `failed` is terminal and can't be overwritten. Subsequent events for the same messageId at an earlier state are no-ops.                                             |
| **R** — Repudiation     | No               | This REQ IS the audit trail. Every attempt + every status change is persisted with timestamps (`attemptedAt`, `createdAt`, `updatedAt`).                                                                                                                                                       |
| **I** — Info disclosure | No               | Persisted fields are metadata only: `templateKey`, `userId`, `channel`, `messageId`, `status`, `failureReason`, `durationMs`. **No message body content**. Admin-only query surface (existing admin pattern; no new endpoint added).                                                           |
| **D** — DoS             | Low              | Per webhook event: one `findOneAndUpdate` with an indexed lookup (`messageId` sparse index). Per send attempt: one `create`. Persistence failures are swallowed by the service so a misbehaving DB doesn't break the send path or the webhook ACK.                                             |
| **E** — Elevation       | No               | No role / permission change. The service is called only from server-side code (REQ-054's `logAttempt` and `lib/whatsapp.ts:handleWebhook`).                                                                                                                                                    |

## Threat model — webhook lifecycle gates

The webhook flow is: Meta delivers event → `app/api/webhooks/whatsapp/route.ts` verifies signature → `WhatsAppService.handleWebhook(payload)` parses → `NotificationLogService.updateStatus(messageId, status, failureReason?)` updates the row.

Failure modes considered:

1. **Spoofed webhook event with crafted messageId** — signature verification at the route layer blocks. The service would never see the call.

2. **Replay attack with a real Meta event** — even if attacker captures a real webhook and replays it, the monotonic-status filter means the second-arrival event is a no-op (current state is at or after the replayed event's state). No state corruption.

3. **Event ordering: read arrives before delivered** — Meta normally delivers events in lifecycle order but can race. AC5: `delivered → read` works; if `read` arrives first, then `delivered` arrives second, the filter blocks the `delivered` update (read's position 3 > delivered's 2). Final state stays at `read`. Acceptable.

4. **Mass-write DoS via webhook flood** — if Meta sends thousands of events/sec, each is one indexed update. Mongo handles trivially. The webhook route ACKs 200 fast regardless of persistence outcome (existing pattern), so Meta doesn't retry-storm.

5. **Persistence layer down** — `recordAttempt` and `updateStatus` both swallow errors via `console.error`/`console.warn` and return `null`/`false`. The send path (REQ-054) and the webhook route both continue cleanly. Failure is observable in logs only — same posture as REQ-054's `console.log` v1.

6. **`userId` is sometimes null (guest path)** — the model defaults `userId: null` and the indexed query on `messageId` (sparse) still works. No-user paths still write rows.

## Privacy / regulatory

- No new PII collected. The log persists fields already on the User doc (userId), already in WhatsApp Cloud API responses (messageId), and runtime metadata (durationMs).
- **No message body content** in the log. `templateKey` indicates _what kind_ of message was sent, never the rendered content.
- Retention is unbounded in v1. A future REQ can add a Mongo TTL index (`createdAt` + N days) or an admin-driven purge endpoint.

## Static analysis

`semgrep scan --config auto models/notification-log-model.ts services/notification-log-service.ts services/notification-service.ts lib/whatsapp.ts` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Webhook signature verification + GET handshake → already implemented; not modified by REQ-055.
- Inbound-message state-machine routing → WA-3.
- Admin UI for the audit log → future REQ.
- TTL / retention policy → future REQ.
