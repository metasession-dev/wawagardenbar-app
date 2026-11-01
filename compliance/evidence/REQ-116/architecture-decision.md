---
req: REQ-116
generated_by: adr-author
generated_at: 2026-11-01T11:00:00Z
---

# Architecture decision — REQ-116

## Outcome

**Produced ADR-007:** Insert-first idempotency on `wamid` and an in-memory per-phone rate limit (`docs/ADR/ADR-007-webhook-insert-first-idempotency-and-phone-rate-limit.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-007-webhook-insert-first-idempotency-and-phone-rate-limit.md`
- **Status:** Accepted (operator, 2026-10-31)
- **Summary:** The unique index on `IncomingMessage.messageId` is the single dedup mechanism: the row is inserted before classification or any side effect, and a duplicate-key error ends processing. The per-phone limit (20 per 10 minutes) is in memory, per instance, and resets on restart.
- **Affected files:** `services/whatsapp-inbound-service.ts`, `lib/whatsapp.ts`, `app/api/webhooks/whatsapp/route.ts`, `models/incoming-message-model.ts`.
- **Cross-references:** SRS REQ-WA-005, REQ-WA-009, REQ-WA-010; risks R-043, R-044.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [ ] The file at `docs/ADR/ADR-007-webhook-insert-first-idempotency-and-phone-rate-limit.md` is edited from stub to canonical prose and status is Accepted.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
