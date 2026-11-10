---
req: REQ-120
generated_by: adr-author
generated_at: 2026-11-10T22:10:00Z
---

# Architecture decision — REQ-120

## Outcome

**Produced ADR-010:** One customer order service as the only customer order-creation path (`docs/ADR/ADR-010-single-customer-order-service.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-010-single-customer-order-service.md`
- **Status:** Accepted (operator approved the plan, including this ADR, on 2026-11-10)
- **Summary:** every customer entry point calls `createCustomerOrder`; callers only translate input and map typed errors; customer API keys are bound to a user; staff creation paths stay separate and stamp `origin: staff`.
- **Affected files:** `services/customer-order-service.ts` (new), `services/order-service.ts`, `app/actions/payment/payment-actions.ts`, `app/api/public/orders/route.ts`, `models/api-key-model.ts`, `models/order-model.ts`, the tab actions and routes (pattern change across more than three files; HIGH risk).
- **Cross-references:** SRS REQ-CHECKOUT-012, REQ-CHECKOUT-013, REQ-TABMGT-011, REQ-ORDMGT-019, REQ-API-007; risks R-056 to R-059.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] If ADR: the file at `docs/ADR/ADR-010-single-customer-order-service.md` is edited from stub to canonical prose and status is Accepted.
- [~] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-10

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-10; recorded by the agent from the operator's explicit reply._
