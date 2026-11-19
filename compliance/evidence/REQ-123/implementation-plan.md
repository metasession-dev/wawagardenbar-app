---
title: 'Implementation plan — REQ-123'
requirement_id: 'REQ-123'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-19'
---

# Implementation plan — REQ-123

Issue: #969 (WA-07, tracker #953). Risk class HIGH: this REQ moves money (Paystack initialisation, webhook confirmation, amount check), decides what reaches the kitchen, and adds a scheduled job that cancels orders. Single REQ, one branch `feat/REQ-123-paystack-payment-paid-only-kitchen-gate`, one PR, one portal release. Depends on WA-05 (REQ-120, `origin`, `createCustomerOrder`) and WA-06 (REQ-121, Pay button), both released.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Every customer order is paid through Paystack before it reaches the kitchen. One idempotent `markOrderPaid` is the only way a customer order becomes paid, a verified and amount-checked webhook drives it, and unpaid customer orders expire. Staff-created and tab orders keep today's flow.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                | Verification                                                                                             | SRS-ID                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| AC1 | **Given** a customer order (`origin='customer'`), **When** payment is initialised, **Then** Paystack is used whatever `activeProvider` says, and the order stores `paymentProvider='paystack'`; **Given** a staff or tab order, **Then** the provider routing is unchanged.                                                                                                                      | unit (`payment-service`) + e2e (US-A2.13)                                                                | REQ-PAY-005 (new), REQ-CHECKOUT-010 (updated)                                                            |
| AC2 | **Given** an unpaid customer order, **When** `initializePayment` is called twice, **Then** the same `paymentReference` and `checkoutUrl` come back and Paystack is called once; it re-initialises only when Paystack reports the transaction expired or abandoned; an account with no email sends `<phone>@customers.wawagardenbar.com`.                                                         | unit + `e2e/critical/paystack-payment-lifecycle.spec.ts` (US-A2.13)                                      | REQ-PAY-006 (new)                                                                                        |
| AC3 | **Given** a Paystack webhook, **Then** the signature is HMAC-SHA512 over the raw body; the order (or tab) is found by reference **before** the dedup row is written, an unknown reference returns 404 with no dedup row; `amount` (kobo) must equal the order total, else the order becomes `payment_mismatch`, an Incident is created and the order is not confirmed; a replay changes nothing. | unit (route) + `paystack-payment-lifecycle.spec.ts` (US-A2.14 to US-A2.17)                               | REQ-PAY-007 (new), REQ-PAY-003 (updated)                                                                 |
| AC4 | **Given** a verified payment, **When** the webhook or the redirect `verifyPayment` marks it paid, **Then** one `markOrderPaid(orderId, source)` sets `paymentStatus='paid'`, `status='confirmed'`, `paidAt`, awards rewards, raises the staff alert, emits the kitchen event once, and logs `order_confirmation` then `receipt` through `NotificationService.send`; a second call is a no-op.    | unit + `paystack-payment-lifecycle.spec.ts` (US-A2.14, US-A2.15)                                         | REQ-PAY-008 (new)                                                                                        |
| AC5 | **Given** the kitchen, kitchen display and dashboard live queues, **Then** they list orders with `origin='staff'` or `paymentStatus='paid'`; unpaid customer orders appear only under an "Awaiting payment" filter on `/dashboard/orders`; a csr tab order shows in the kitchen at once.                                                                                                         | unit (queries) + `e2e/critical/kitchen-paid-gate.spec.ts` (US-B1.3, US-B1.4)                             | REQ-KITCHEN-009 (new), REQ-ORDMGT-001 (updated)                                                          |
| AC6 | **Given** a customer order unpaid 30 minutes after creation, **When** the scheduled job runs, **Then** it asks Paystack first; if paid it runs `markOrderPaid`, otherwise sets `status='cancelled'`, `cancelReason='payment_timeout'`, with no kitchen emit and no customer message; staff and paid orders are never touched.                                                                    | `__tests__/jobs/expire-unpaid-orders.test.ts` (US-A2.18)                                                 | REQ-PAY-009 (new)                                                                                        |
| AC7 | **Given** a customer order still unpaid 5 minutes after creation, **When** the job runs, **Then** exactly one `payment_link` is logged with the stable checkout access code and the minutes left; a second run sends nothing; no link is sent for a paid, cancelled or expired order.                                                                                                            | unit + `e2e/critical/whatsapp-payment-link.spec.ts` (US-A2.19)                                           | REQ-PAY-010 (new)                                                                                        |
| AC8 | **Given** the templates `order_confirmation`, `receipt` and `payment_link`, **Then** their JSON, `TEMPLATE_CATEGORIES` entry and param builder match the issue text and pass the contract test, and each is submitted to the UAT and the production WhatsApp account with its status recorded in evidence; until a copy is APPROVED the message is held as `held_template_pending`.              | `__tests__/lib/whatsapp-template-contract.test.ts` + MCP `whatsapp_biz_list_templates` output (evidence) | REQ-WA-002 (updated)                                                                                     |
| AC9 | **Given** the Paystack account, **Then** evidence records whether the refunds API and refund webhooks are available (prerequisite for WA-11).                                                                                                                                                                                                                                                    | `compliance/evidence/REQ-123/paystack-refund-capability.md` (operator confirms)                          | @srs-deferred: evidence record of a Paystack account capability, no product behaviour; consumed by WA-11 |

The return page (issue task 8) is covered under AC4: after the Paystack redirect the customer lands on `/orders/[orderId]?payment=success` and sees one live confirmation view, with no redirect chain.

### Requirements gap check (devaudit-installer#212)

No gap found at Phase 1. Two reconciliations are not gaps: (1) the existing `docs/whatsapp-templates/{order_confirmation,receipt,payment_link}.json` differ from the issue's template text (receipt has four body parameters and a "View Full Receipt" button, `payment_link` says hours and a full URL button); the issue is the source and the JSON is rewritten to match it. (2) REQ-121's gap G1 (Pay calls the existing `initializePayment` with all methods) is closed here by forcing Paystack for customer orders.

## SRS items proposed/touched

| AC  | SRS item                    | Status          | Notes                                                                       |
| --- | --------------------------- | --------------- | --------------------------------------------------------------------------- |
| AC1 | REQ-PAY-005 (new)           | prose drafted   | customer orders always Paystack, `paymentProvider` stored                   |
| AC1 | REQ-CHECKOUT-010 (existing) | updated         | was "Monnify-only"; now Paystack-only                                       |
| AC2 | REQ-PAY-006 (new)           | prose drafted   | stable reference and URL, placeholder email                                 |
| AC3 | REQ-PAY-007 (new)           | prose drafted   | raw-body signature, lookup before dedup, amount check                       |
| AC3 | REQ-PAY-003 (existing)      | updated         | note that Paystack verifies the raw body                                    |
| AC4 | REQ-PAY-008 (new)           | prose drafted   | `markOrderPaid`, single emit, confirmation and receipt, return page         |
| AC5 | REQ-KITCHEN-009 (new)       | prose drafted   | paid-only gate, staff and tab orders exempt                                 |
| AC5 | REQ-ORDMGT-001 (existing)   | updated         | "Awaiting payment" filter                                                   |
| AC6 | REQ-PAY-009 (new)           | prose drafted   | 30-minute expiry, Paystack check first, kill-switch                         |
| AC7 | REQ-PAY-010 (new)           | prose drafted   | one `payment_link`                                                          |
| AC8 | REQ-WA-002 (existing)       | updated         | the three templates, held until approved                                    |
| AC9 | n/a                         | `@srs-deferred` | evidence of a Paystack account capability, no product behaviour (for WA-11) |

Index-table and heading maxima agree for PAY (004 before this REQ), KITCHEN (008) and WA (015); no table/heading drift found. REQ-CHECKOUT-010, REQ-ORDMGT-001, REQ-PAY-003 and REQ-WA-002 were edited in `docs/SRS.md` in this cycle; the new items carry Given/When/Then prose written by the aligner, which the operator reviews at plan approval. Alignment status for Stage 1: CLEAN.

## 2. Scope

In scope: customer-order Paystack routing; stable reference and checkout URL stored on the order; raw-body webhook with lookup-first, amount check and mismatch incident; `markOrderPaid` as the single paid path (used by the webhook, `verifyPayment` and `OrderService.updatePaymentStatus('paid')`); kitchen paid gate on every live queue plus the "Awaiting payment" filter; 30-minute expiry job; 5-minute `payment_link` job; return-page confirmation; three templates; Paystack refund capability record. Out of scope: refunds (WA-11), status notifications after confirmation (WA-08), starting an order from WhatsApp (WA-09), the Monnify webhook and tab webhook behaviour (unchanged), an amount check on tab payments.

### Surface inventory

| Surface                              | URL / file                                                                                                                                                                               | Status                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Paystack client and webhook          | `services/paystack-service.ts`, `app/api/webhooks/paystack/route.ts`, `lib/webhook-idempotency.ts`                                                                                       | In scope                         |
| Payment facade and actions           | `services/payment-service.ts`, `app/actions/payment/payment-actions.ts` (`initializePayment`, `verifyPayment`)                                                                           | In scope                         |
| Order model and service              | `models/order-model.ts` (`paymentProvider`, `checkoutUrl`, `paystackAccessCode`, `paymentLinkSentAt`, `cancelReason`, `payment_mismatch`), `services/order-service.ts` (`markOrderPaid`) | In scope                         |
| Kitchen and dashboard queues         | `app/dashboard/kitchen/page.tsx`, `app/dashboard/kitchen-display/page.tsx`, `getOrdersAction`, `OrderService.getActiveOrders`, `/dashboard/orders`                                       | In scope                         |
| Scheduler                            | `lib/scheduled-jobs.ts` (unpaid-expiry and payment-link jobs)                                                                                                                            | In scope                         |
| Templates                            | `docs/whatsapp-templates/*.json`, `docs/whatsapp-templates.md`, `lib/notification-templates.ts`, `lib/whatsapp-template-params.ts`                                                       | In scope                         |
| Customer return page                 | `app/(customer)/orders/[orderId]`                                                                                                                                                        | In scope                         |
| E2E mocks                            | `e2e/helpers/payment-provider-mock.ts`, `e2e/helpers/webhook-mock.ts`                                                                                                                    | In scope (extended)              |
| Staff payment paths, Monnify webhook | `completeOrderPaymentManually`, `app/api/webhooks/monnify`                                                                                                                               | Not touched (regression-checked) |

## 3. Architecture decisions

- **ADR-012 — Customer orders pay through Paystack first: one `markOrderPaid` path and a paid-only kitchen gate** — Proposed by `adr-author`. Draft at `docs/ADR/ADR-012-paid-only-kitchen-gate-and-single-mark-paid.md`. Signals: risk class HIGH; pattern change spanning more than three files (four mark-paid paths collapse into one, every live queue shares one predicate); a new scheduled job. Operator edits and flips the status to _Accepted_ at plan approval.

## 4. E2E test coverage

New critical specs `e2e/critical/paystack-payment-lifecycle.spec.ts` (US-A2.13 to US-A2.17), `e2e/critical/kitchen-paid-gate.spec.ts` (US-B1.3, US-B1.4) and `e2e/critical/whatsapp-payment-link.spec.ts` (US-A2.19); US-A2.18 is a unit test (`__tests__/jobs/expire-unpaid-orders.test.ts`). Each e2e test calls `tagTest('REQ-123', n)` with `[US-…]` in its title. Webhooks are posted signed with the test secret; Paystack is mocked (`ENABLE_TEST_PAYMENTS` path plus a mock for init and verify); WhatsApp is off in CI, so `NotificationLog` rows are asserted. Existing specs that assume an unpaid customer order is visible in the kitchen, or that use Monnify for customers, are updated through `e2e-test-engineer`. Evidence wiring validated by that skill; decision recorded in `compliance/evidence/REQ-123/e2e-scope-decision.md`.

### Test data requirements

A signed-in customer with a phone and no email, one with a name, a customer order in `pending`/unpaid state created through the customer-order helper, a staff express order, a csr tab with orders, and a settings row with a test Paystack secret. Created inside each spec through the existing customer-auth and db-assertion helpers; no shared rows mutated. Seed and reset stay with the `e2e-test-data` skill; no new seed script is expected.

## 5. Threat model + security considerations

| Threat (STRIDE)                                                                         | Surface           | Mitigation                                                                                                                                                    |
| --------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing: forged webhook marks an order paid                                            | webhook           | HMAC-SHA512 over the **raw** body (constant-time compare); no `JSON.parse` before verification; unsigned or bad signature returns 401                         |
| Tampering: under-payment (paid amount below the order total)                            | webhook, verify   | kobo amount must equal `round(total*100)`; mismatch → `payment_mismatch`, Incident, no confirmation; `verifyPayment` applies the same check                   |
| Tampering: client chooses provider or amount                                            | init              | provider forced server-side for customer orders; charge is `order.total` (REQ-121)                                                                            |
| Repudiation / double effects: replayed or concurrent webhook and redirect               | `markOrderPaid`   | atomic conditional update (`paymentStatus != 'paid'`) so only the winner emits the kitchen event and sends messages; dedup row written after lookup (REQ-049) |
| Information disclosure: another customer pays or reads an order                         | init, return page | order owner check on `initializePayment`; return page shows the signed-in owner's order only                                                                  |
| Denial of service: lost webhook leaves a paid order unconfirmed, then expiry cancels it | expiry job        | job verifies with Paystack before cancelling; a paid transaction runs `markOrderPaid` instead                                                                 |
| Elevation: unpaid order reaches the kitchen                                             | queues            | one shared query predicate (`origin='staff'` or `paymentStatus='paid'`) used by every live queue and covered by a test per queue                              |
| Information disclosure: secrets and card data                                           | all               | no card data stored (hosted checkout); Paystack secret only in `SystemSettings`/env, never logged; webhook log lines omit the signature and body              |

**Secrets / credentials:** none added (existing Paystack keys). **Dependencies introduced:** none.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (operator edits the rows and signs off the residual ratings at plan approval):

- **R-67 — Money path: order confirmed for the wrong amount or by a forged webhook** — OPEN, residual low × high.
- **R-68 — Webhook idempotency and lost-webhook recovery** — OPEN, residual low × high.
- **R-69 — Paid-only kitchen gate hides a real order, or lets an unpaid one through** — OPEN, residual low × high.
- **R-70 — Expiry job cancels an order the customer has paid for** — OPEN, residual low × high.
- **R-71 — Payment messages held or wrong when templates are not approved** — OPEN, residual medium × low.
- **R-72 — Placeholder email derived from the phone number sent to Paystack** — OPEN, residual low × low.

Approval mode is `dual_actor`, so no `solo_with_gap` control-gap entry is needed.

## 6. Data protection (GDPR Art. 25)

**Personal data processed:** yes. Data subjects: customers. Categories: phone (also used as the placeholder Paystack email `<phone>@customers.wawagardenbar.com` when no email exists), first name (WhatsApp `payment_link` greeting), order contents and total, payment reference, Paystack transaction id, delivery or table details already held. Special categories: none. Lawful basis: Art. 6(1)(b), performance of the order contract; the WhatsApp messages are transactional and gated by `whatsappTransactional` consent through `NotificationService.send`. Purpose limitation: the placeholder email goes to Paystack only to open the transaction. Data minimisation: this REQ stops requiring a customer email. Retention: payment records follow existing order retention (WA-14 owns the rules). ROPA: add Paystack as the sole processor for customer payments and the payment-link message. DPIA: not required. Cross-border transfers: Paystack as already declared.

## 7. AI / model considerations (EU AI Act Art. 11)

N/A: this REQ does not introduce or change AI behaviour. Implementation is drafted with Claude Code (disclosed on every commit).

## 8. Rollback plan

Revert the merge. The new order fields are optional and ignored by older code. Orders already confirmed stay confirmed. Cancelled-by-expiry orders stay cancelled with their `cancelReason`. Switching the job off without a revert: an env kill-switch `ENABLE_UNPAID_ORDER_EXPIRY=false` (read by the job, as REQ-078 does for inventory) stops cancellations and payment links. If production payments misbehave after release, the operator sets the kill-switch, reverts, and recovers affected orders by re-verifying the references with `verifyPayment`. Notification path: the operator, immediately, through the existing release-incident route.

## 9. Verification

Unit tests per AC (provider routing, stable reference, raw-body signature, lookup-before-dedup, amount mismatch, `markOrderPaid` idempotency and single emit, queue predicate, expiry and payment-link jobs, param builders); the three critical e2e specs; the template contract test; a regression run of staff express, tab and manual-payment paths; UAT on the UAT environment with a Paystack test transaction; production smoke after release.

## 10. Operator tasks (non-code)

1. ~~Approve the plan (HIGH checkpoint) and the ADR verdict~~ done 2026-11-19.
2. Confirm the Paystack **test** secret and webhook URL on the UAT environment, and the live ones on production (the signature is verified with the same secret as initialisation).
3. After plan approval the agent submits `order_confirmation`, `receipt` and `payment_link` to the UAT and production WhatsApp accounts (WhatsApp MCP); the operator confirms Meta approval before each environment switches the messages on.
4. Confirm refunds-API and refund-webhook availability in the Paystack dashboard (AC9).
5. Independent UAT review and portal approval.

## 11. Sign-off

- **Plan approved by operator:** William (william@ostendo.io, via the shared GitHub login metasession-dev), 2026-11-19, in the Claude Code session (HIGH-risk checkpoint). Decisions: ADR-012 accepted as drafted; risks R-67 to R-72 and the SRS prose accepted as drafted; AC9 stays an operator-confirmed evidence record.
