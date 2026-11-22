---
adr_id: 'ADR-013'
status: 'Accepted'
date: '2026-11-21'
authored_by: 'adr-author (Claude) for operator'
related_reqs: ['REQ-124']
supersedes: []
superseded_by: null
---

# ADR-013: Customer order access by signed-in owner or signed tracking token

## Status

**Accepted** (2026-11-21, operator approved the plan that references it)

## Context

`/orders/[orderId]` and the Socket.IO `join-order` event are open to anyone who has an order id. Order ids are Mongo ObjectIds, so they are guessable in practice and appear in URLs, logs and shared screenshots; the page shows items, totals, delivery details and live status. WA-08 (REQ-124) starts sending customers a link to their order in WhatsApp, including guests who have no session. The access model must let those customers in without a login and keep everyone else out. Related: REQ-ORDER-001, REQ-ORDER-008; risk class HIGH (access control, customer data).

## Decision

Access to a customer order (page, its sub-routes and the socket `join-order` room) requires either (a) a signed-in session whose user owns the order, or (b) a valid tracking token. The token is `base64url(orderId.expiryEpoch)` plus an HMAC-SHA256 signature keyed with a new `ORDER_TRACKING_SECRET` (at least 32 bytes), valid for 30 days and bound to one order id; verification uses `timingSafeEqual`. It travels as `?t=`. Anything else gets 404 on the page (so existence is not revealed) and is not joined on the socket. With no secret configured the system fails closed: tokens are not created or accepted. Every customer-facing link to an order (WhatsApp messages, receipt button, checkout redirects) is built by one helper, `buildTrackingUrl`.

## Consequences

- **Good:** closes enumeration of orders by id; guests keep working through the link; no new dependency or storage (stateless token); one helper keeps link construction consistent.
- **Bad:** a token is a bearer credential — anyone holding the link can view that order for 30 days; rotating the secret invalidates all outstanding links; every producer of an order link must be updated or legitimate users get 404.
- **Neutral / tradeoffs:** no per-token revocation (rotate the secret in an incident); page is read-only for token holders, so cancel/review actions on sub-routes still need the owner session or the same token (proposed: same gate).

## Alternatives considered

- **Alternative 1: Order-id plus phone-number challenge** — ruled out: adds a form step to every WhatsApp tap and exposes a phone-guessing surface.
- **Alternative 2: Random per-order token stored on the order** — ruled out: needs a field and lookup, and gives no expiry without more state; the stateless HMAC achieves the same with expiry built in.
- **Alternative 3: Sign-in required for all tracking** — ruled out: guest orders and WhatsApp-only customers have no account.

## Cross-references

- Implementation plan: `compliance/plans/REQ-124/implementation-plan.md`
- SRS items: REQ-ORDER-008 (new), REQ-ORDER-001 (updated), REQ-ORDER-007 (new)
- Risk register: see `compliance/evidence/REQ-124/risk-assessment.md` (risk-register-keeper)
- Supersedes / superseded-by: none
