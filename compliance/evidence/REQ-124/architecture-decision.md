---
req: REQ-124
generated_by: adr-author
generated_at: 2026-11-22T00:00:00Z
---

# Architecture decision — REQ-124

## Outcome

**Produced ADR-013:** Signed order-tracking token with owner-or-token access across the page, the socket and message links (`docs/ADR/ADR-013-signed-order-tracking-token-owner-or-token-access.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-013-signed-order-tracking-token-owner-or-token-access.md`
- **Status:** Accepted (operator-confirmed at plan approval, 2026-11-21)
- **Summary:** an order page and its socket room are opened only by the signed-in owner or the holder of an unexpired HMAC-SHA256 token bound to that order (`ORDER_TRACKING_SECRET`, 30 days); everyone else gets 404 or is not joined; every customer message carries the token.
- **Affected files:** `lib/order-tracking-token.ts`, `lib/order-access.ts`, `app/(customer)/orders/[orderId]/page.tsx`, `lib/socket-server.ts`, `hooks/use-order-socket.ts`, `services/order-service.ts`, `services/order-status-notifier.ts`, `app/actions/payment/payment-actions.ts`.
- **Cross-references:** SRS REQ-ORDER-008, REQ-ORDER-001; risks R-73, R-74.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] If ADR: the file at `docs/ADR/ADR-013-signed-order-tracking-token-owner-or-token-access.md` is edited from stub to canonical prose and status is Accepted.
- [~] If no-ADR: not applicable.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-22

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-22; recorded by the agent from the operator's explicit reply._
