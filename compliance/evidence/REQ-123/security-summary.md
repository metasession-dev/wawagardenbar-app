# Security Evidence Summary — REQ-123

**Date:** 2026-11-19
**Risk class:** HIGH

| Control                                 | Result            | Evidence                                                                                                                                                                      |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                        | CI                | No dependency was added or changed by this REQ; the CI Quality Gates dependency audit is the record                                                                           |
| SAST                                    | PASS (local) / CI | `npx tsc --noEmit`: 0 errors in this REQ's files. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                            |
| Forged webhook rejected                 | PASS              | HMAC-SHA512 over the raw body, constant-time compare; unit `paystack-service` (re-serialised body, wrong secret, empty and wrong-length signature) and e2e bad-signature test |
| Under-payment not confirmed             | PASS              | Kobo amount must equal the order total; mismatch becomes `payment_mismatch` with an Incident, in the webhook and in the redirect verification (unit + e2e US-A2.16)           |
| Replay / double confirmation            | PASS              | Order looked up before the dedup row; atomic conditional `markOrderPaid`; replay and webhook-versus-redirect race tests (unit + e2e US-A2.15)                                 |
| Client cannot choose provider or amount | PASS              | Provider forced server-side for customer orders; the charge is `order.total` (unit)                                                                                           |
| Unpaid order cannot reach kitchen       | PASS              | One shared predicate on every live queue, a unit test per case; the kitchen event is emitted only from `markOrderPaid` (e2e kitchen gate; the creation-time emit was removed) |
| Expiry never cancels paid money         | PASS              | The job asks Paystack first, skips on an unreachable Paystack, leaves a wrong-amount payment for staff; kill-switch `ENABLE_UNPAID_ORDER_EXPIRY=false` (unit)                 |
| Secrets                                 | PASS              | No new secret; the Paystack key stays in SystemSettings; no signature or body is logged                                                                                       |
| New dependencies / external calls       | PASS              | None (Paystack and WhatsApp are existing)                                                                                                                                     |

## Data handling

A customer with no email is represented to Paystack by `<digits of phone>@customers.wawagardenbar.com` (a domain that receives no mail) so a transaction can open; this is recorded as R-72 and in the plan's GDPR section. No card data is stored (hosted checkout). Payment references and the Paystack transaction id are stored on the order under the existing order retention.

## Post-deploy controls

- Revert the merge to roll back; the new order fields are optional and ignored by old code. `ENABLE_UNPAID_ORDER_EXPIRY=false` switches off the two jobs without a revert.
- Operator: confirm the Paystack webhook URL and keys per environment; wait for each environment's template approval before expecting WhatsApp messages.
