---
adr_id: 'ADR-007'
status: 'Proposed'
date: '2026-10-29'
authored_by: 'sdlc-implementer (AI-assisted)'
related_reqs: ['REQ-116']
supersedes: []
superseded_by: null
---

# ADR-007: Insert-first idempotency on `wamid` and an in-memory per-phone rate limit for the WhatsApp webhook

## Status

**Proposed** (DRAFT — operator to flip to _Accepted_ on plan approval)

## Context

REQ-116 (#964, SRS REQ-WA-005, REQ-WA-009, REQ-WA-010). Meta retries webhook deliveries, and today the inbound service runs side effects (welcome template, ticket creation) before it records the message, so a retry can send a second welcome or open a second ticket. `IncomingMessage.messageId` already has a unique index. The webhook is also unauthenticated beyond the signature, so a single phone can flood it. The change touches the route, `WhatsAppService.handleWebhook`, the inbound service and the limiter, and the plan is HIGH risk, which is why a decision is recorded.

## Decision

1. **Idempotency:** the first action for each inbound message is to insert its `IncomingMessage` row keyed by `wamid`. A duplicate-key error stops processing for that message. The unique index is the single de-duplication mechanism; there is no separate "seen" cache.
2. **Rate limit:** reuse the existing in-memory `lib/rate-limiter.ts` with a phone key, 20 messages per 10 minutes. Messages over the limit are still stored (so the audit trail is complete) but trigger no side effects.

## Consequences

- **Good:** retries are safe regardless of instance count, because the database enforces uniqueness; no new infrastructure; the audit record exists for every message.
- **Bad:** the limiter is per instance and resets on restart, so a determined sender can exceed 20 messages by hitting different instances or waiting for a restart. If the insert succeeds but a later side effect fails, Meta's retry sees a duplicate and the side effect is not retried (the AC8 retry and incident cover outbound failures only).
- **Neutral / tradeoffs:** a persisted counter would be stricter but adds a write per message and a TTL index; deferred until abuse is observed.

## Alternatives considered

- **Alternative 1:** check for an existing row, then run side effects, then insert — ruled out because two concurrent deliveries can both pass the check.
- **Alternative 2:** persisted rate-limit counter in MongoDB (TTL collection) — ruled out for now: extra write per message for a risk that is bounded by Meta's own sender limits; revisit if abuse appears.
- **Alternative 3:** Redis-backed limiter — ruled out: a new infrastructure dependency for this scale.

## Cross-references

- Implementation plan: `compliance/plans/REQ-116/implementation-plan.md`
- SRS items: REQ-WA-005, REQ-WA-009, REQ-WA-010
- Risk register: R-043, R-044, R-045, R-046
- Supersedes / superseded-by: none
