---
adr_id: 'ADR-012'
status: 'Proposed'
date: '2026-11-19'
authored_by: 'adr-author (Claude) for operator'
related_reqs: ['REQ-123']
supersedes: []
superseded_by: null
---

# ADR-012: Customer orders pay through Paystack first: one `markOrderPaid` path and a paid-only kitchen gate

## Status

**Proposed** (DRAFT: operator flips to _Accepted_ at plan approval)

## Context

Today a customer order is created `pending` and is visible to the kitchen before payment. Four code paths mark an order paid with different side effects (the Paystack webhook, `verifyPayment` on the redirect, `OrderService.updatePaymentStatus`, and the Monnify webhook), and none of them emits the kitchen event, sends the customer a message, or checks the amount. The Paystack webhook verifies a re-serialised body, writes its dedup row before it finds the order (so a retry after a 404 is swallowed), and `initializePayment` rotates the payment reference on every call. Programme decision (#953): every customer order is paid at checkout, an order reaches the kitchen only after Paystack confirms payment, unpaid customer orders expire, and staff-created and tab orders are exempt. REQ-123 (WA-07; SRS REQ-PAY-005 to REQ-PAY-010, REQ-KITCHEN-009) must change all of these together, because a gate without a single, trusted paid transition would let one path bypass it.

## Decision

1. Customer orders (`origin='customer'`) always use Paystack, whatever `activeProvider` says; the order stores `paymentProvider`, `paymentReference`, `checkoutUrl` and the Paystack access code, created once per order.
2. `OrderService.markOrderPaid(orderId, source)` is the only transition to `paid` for customer orders. It is a single atomic conditional update (`paymentStatus != 'paid'`); only the call that wins emits the kitchen event, awards rewards, raises the staff alert and sends `order_confirmation` then `receipt`. The Paystack webhook, `verifyPayment` and `updatePaymentStatus('paid')` all call it.
3. The Paystack webhook verifies HMAC-SHA512 over the raw body, finds the order by reference before writing the dedup row (unknown reference: 404, no row), and rejects an amount that differs from `round(total*100)` as `payment_mismatch` with an Incident.
4. One shared predicate, `origin='staff' OR paymentStatus='paid'`, filters every live queue (kitchen, kitchen display, dashboard live orders); unpaid customer orders appear only under an "Awaiting payment" filter.
5. A scheduled job in `lib/scheduled-jobs.ts` cancels customer orders unpaid after 30 minutes (`cancelReason='payment_timeout'`), asking Paystack first so a lost webhook never cancels a paid order, and sends one `payment_link` at 5 minutes. A kill-switch `ENABLE_UNPAID_ORDER_EXPIRY=false` turns the job off.

## Consequences

- **Good:** one place enforces idempotency and side effects; an unpaid order cannot reach the kitchen by any path that uses the predicate; under-payment and forged webhooks are rejected; a retry after a 404 is processed.
- **Bad:** customers who pay late (after the 30 minutes and after cancellation) need staff recovery (the Paystack reference is kept, WA-11 adds refunds); a missed query that does not use the predicate would show unpaid orders, so the predicate is covered by a test per queue; the job adds one more per-minute task on the single Railway replica (idempotent, so duplicates are harmless).
- **Neutral / tradeoffs:** the Monnify path stays for staff flows and its webhook is not changed here; tab payments keep their current webhook handling without an amount check.

## Alternatives considered

- **Keep payment-method choice per `activeProvider` and add a kitchen gate only:** ruled out, because the programme decision is Paystack only for customers and the provider switch would still let a customer order be paid by a provider whose webhook has no amount check.
- **Hide unpaid orders with a new order status (`awaiting_payment`) instead of a predicate:** ruled out, because every status consumer (kitchen, reports, notifications, REQ-066 inventory) would need to learn it; `paymentStatus` already carries the fact.
- **Cancel unpaid orders without asking Paystack:** ruled out, because a lost or delayed webhook would cancel an order the customer has paid for.
- **Event-queue (external) for payment confirmation:** ruled out, no new infrastructure is justified at this volume; the in-process scheduler already hosts the other jobs.

## Cross-references

- Implementation plan: `compliance/plans/REQ-123/implementation-plan.md`
- SRS items: REQ-PAY-005 to REQ-PAY-010, REQ-KITCHEN-009, REQ-CHECKOUT-010, REQ-ORDMGT-001, REQ-PAY-003, REQ-WA-002
- Risk register: entries opened by `risk-register-keeper` for REQ-123 (see the plan)
- Builds on: ADR-010 (single customer order service), ADR-011 (staff notifications raised on paid orders)
- Supersedes / superseded-by: none
