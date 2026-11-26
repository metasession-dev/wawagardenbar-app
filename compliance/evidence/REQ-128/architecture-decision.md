---
req: REQ-128
generated_by: adr-author
generated_at: 2026-11-26T07:20:33Z
---

# Architecture decision — REQ-128

## Outcome

**Produced ADR-015:** A refund ledger, with the order changing only when Paystack confirms (`docs/ADR/ADR-015-refund-ledger-and-idempotent-paystack-refunds.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-015-refund-ledger-and-idempotent-paystack-refunds.md`
- **Status:** Accepted (operator approved the REQ-128 plan on 2026-11-26)
- **Summary:** every refund is a `Refund` ledger row written before Paystack is called, the amount is reserved atomically on the order, and the order's `paymentStatus` changes only from the Paystack webhook.
- **Affected files:** `models/refund-model.ts`, `services/refund-service.ts`, `services/paystack-service.ts`, `app/api/webhooks/paystack/route.ts`, `services/whatsapp-inbound-service.ts`, the staff and customer cancel surfaces (signals: new collection, new external API call, HIGH risk, more than 3 files).
- **Cross-references:** SRS REQ-PAY-011 to REQ-PAY-014, REQ-WA-019, REQ-FIN-010; risk register R-81 to R-84; related ADR-012 and ADR-014.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [x] If ADR: the file at `docs/ADR/ADR-015-refund-ledger-and-idempotent-paystack-refunds.md` is edited from stub to canonical prose and status is Accepted.
- [~] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-26

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-26; recorded by the agent from the operator's explicit reply._
