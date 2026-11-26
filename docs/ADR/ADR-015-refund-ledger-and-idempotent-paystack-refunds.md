---
adr_id: 'ADR-015'
status: 'Accepted'
date: '2026-11-26'
authored_by: 'adr-author (Claude) for operator'
related_reqs: ['REQ-128']
supersedes: []
superseded_by: null
---

# ADR-015: A refund ledger, with the order changing only when Paystack confirms

## Status

**Accepted** (2026-11-26, operator approved the REQ-128 plan that references it)

## Context

Customer orders are paid through Paystack (REQ-PAY-005) and reach the kitchen only after payment (ADR-012). There is no refund: the legacy cancel path marks an order `refunded` without moving money, and staff cannot cancel a paid order. WA-11 (REQ-128) adds automatic refunds before preparation, manager-approved refunds after it, and staff partial refunds. Refunds move real money, are asynchronous at Paystack (accepted, then processed or failed), can be requested twice by a double tap or a retry, and the webhook can arrive twice or out of order.

## Decision

- Add a `Refund` collection as the ledger: one row per refund request (order, amount in kobo, `full|partial`, `pending|processed|failed`, requester, approver, Paystack refund id, reason). The row is written **before** calling Paystack, and the Paystack call uses the row id as an idempotency guard.
- `RefundService` is the only code that creates refunds. It enforces: order is a customer-origin Paystack-paid order; amount ≤ paid − (processed + pending refunds); at most one active full refund per order (unique partial index); atomic conditional updates for the double-tap case.
- The **order's `paymentStatus` changes only from the webhook** (`refund.processed` → `refunded` or the new `partially_refunded`). A `pending` refund leaves the order `paid`; a `failed` one leaves it `paid` and alerts staff. Cancelling the order (status, stock, points) happens at request time because the customer-visible cancel is immediate; the money state follows Paystack.
- Webhook events reuse the existing raw-body signature check and the `lib/webhook-idempotency.ts` de-duplication used for `charge.success` (REQ-PAY-007).
- Authority is by role, server-side: `manager`, `admin`, `super-admin` for staff refunds and approvals; customers can only trigger the automatic full refund of their own order before preparation. Every action is audit-logged.
- The two customer templates join the admin-switch catalogue (ADR-014) and the held-until-approved set (REQ-123).

## Consequences

- **Good:** no money moves without a ledger row; double taps and webhook replays are harmless; the order never claims `refunded` before Paystack says so; reports read one collection.
- **Bad:** a short window where the order is cancelled but still `paid` until the webhook arrives; a missed webhook leaves a `pending` row (staff see it; a reconciliation job is not in this REQ); a new collection and an additional enum value to migrate in reports.
- **Neutral / tradeoffs:** refunds apply to Paystack orders only; cash, tab and manual payments stay on today's behaviour.

## Alternatives considered

- **Alternative 1: Flip `paymentStatus` to `refunded` when the refund is requested** — ruled out: this is the current bug (the order says refunded while no money has moved) and a failed refund would need a rollback of customer-visible state.
- **Alternative 2: Store refund fields on the order document** — ruled out: partial refunds are many per order, need per-refund actor and status, and the report and caps need a queryable ledger.
- **Alternative 3: Poll Paystack for refund status instead of relying on webhooks** — ruled out for this REQ: the webhook path already exists and is signed; polling is a possible later reconciliation job.

## Cross-references

- Implementation plan: `compliance/plans/REQ-128/implementation-plan.md`
- SRS items: REQ-PAY-011, REQ-PAY-012, REQ-PAY-013, REQ-PAY-014, REQ-WA-019, REQ-FIN-010
- Related ADRs: ADR-012 (paid-only kitchen gate), ADR-014 (WhatsApp send gate)
- Risk register: entries allocated by `risk-register-keeper` for REQ-128
