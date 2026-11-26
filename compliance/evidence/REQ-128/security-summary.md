# Security Evidence Summary — REQ-128

**Date:** 2026-11-26
**Risk class:** HIGH

| Control                           | Result            | Evidence                                                                                                                                                                                                                |
| --------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                  | PASS              | `npm audit --audit-level=high` exits 0; no dependency was added or changed                                                                                                                                              |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                          |
| Money path                        | PASS              | One ledger row per refund written before Paystack is called; amount reserved atomically on the order; one active full refund per order; the order changes only from the signed Paystack webhook (ADR-015, unit and e2e) |
| Role gate                         | PASS              | Refund, approve and reject are refused on the server for csr, kitchen and customer sessions (unit `refund-actions.test.ts`, e2e US-B3.2); access is the union of roles                                                  |
| Order ownership                   | PASS              | The customer cancel checks the signed-in owner; cancel by WhatsApp looks orders up from the sender's own number only and replies neutrally to any other order number (unit, e2e)                                        |
| Webhook authenticity              | PASS              | Refund events use the existing raw-body HMAC check; a bad signature answers 401; an unknown refund answers 404 so Paystack retries; replays are de-duplicated (unit, e2e)                                               |
| Audit trail                       | PASS              | `refund.requested`, `refund.approved`, `refund.rejected`, `refund.processed`, `refund.failed` are written with the actor; the e2e spec asserts the manager's rows                                                       |
| New dependencies / external calls | PASS              | None new; the existing Paystack API gains a refund call. An e2e-only seam returns a simulated response only for a secret that starts `sk_test_e2e_` (never a real key)                                                  |

## Data handling

Refund rows hold order id, amounts, actor ids and a staff-entered reason (guidance: no personal details). The customer's phone is used only to match a WhatsApp sender to their own orders. Retention follows the order and finance records; WA-14 sets the schedule.

## Post-deploy controls

- Revert the merge to roll back; the `Refund` collection, the `partially_refunded` value and the `refundReservedKobo` field are additive. Refunds already sent to Paystack cannot be recalled and are reconciled from the `Refund` collection and the Paystack dashboard.
- Operator: confirm refunds are enabled on the UAT and production Paystack accounts; add `refund_processed` and `order_cancelled` to the production WhatsApp account by hand in WhatsApp Manager (the API refuses that account); sign off R-81 to R-84.
