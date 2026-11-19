---
req: REQ-123
generated_by: adr-author
generated_at: 2026-11-19T00:00:00Z
---

# Architecture decision — REQ-123

## Outcome

**Produced ADR-012:** Customer orders pay through Paystack first: one `markOrderPaid` path and a paid-only kitchen gate (`docs/ADR/ADR-012-paid-only-kitchen-gate-and-single-mark-paid.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-012-paid-only-kitchen-gate-and-single-mark-paid.md`
- **Status:** Accepted (operator-confirmed at plan approval, 2026-11-19)
- **Summary:** customer orders always use Paystack; one atomic `markOrderPaid` is the only paid transition; one shared predicate gates every live queue; a Paystack-first expiry job cancels unpaid orders.
- **Affected files:** `services/order-service.ts`, `services/payment-service.ts`, `app/actions/payment/payment-actions.ts`, `app/api/webhooks/paystack/route.ts`, `lib/order-queue-gate.ts`, `lib/scheduled-jobs.ts`.
- **Cross-references:** SRS REQ-PAY-005 to REQ-PAY-010, REQ-KITCHEN-009; risks R-67 to R-72.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] If ADR: the file at `docs/ADR/ADR-012-paid-only-kitchen-gate-and-single-mark-paid.md` is edited from stub to canonical prose and status is Accepted.
- [~] If no-ADR: not applicable.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-19

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-19; recorded by the agent from the operator's explicit reply._
