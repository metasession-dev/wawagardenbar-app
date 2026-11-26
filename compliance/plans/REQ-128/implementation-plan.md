---
title: 'Implementation plan — REQ-128'
requirement_id: 'REQ-128'
risk_class: 'HIGH'
change_type: 'feature'
authored_by: 'sdlc-implementer (Claude Sonnet 5.5)'
authored_at: '2026-11-26'
---

# Implementation plan — REQ-128

Issue: [#973](https://github.com/metasession-dev/wawagardenbar-app/issues/973) — WA-11 Customer cancellation and Paystack refunds (tracker #953). Also closes [#1071](https://github.com/metasession-dev/wawagardenbar-app/issues/1071) (delivery "ready" wording), added as AC8 by operator decision on 2026-11-26 (scope amendment, not a declared bundle: the bundle rules reject a LOW member next to a HIGH one).

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** A customer can cancel a paid order before preparation and get an automatic full Paystack refund; after preparation the cancel becomes a refund request a manager decides; staff with the right role can refund fully or partially; every step is recorded, reported and messaged.

### What the code does today (verified)

- `services/paystack-service.ts` has no refund method (`initializeTransaction`, `verifyTransaction`, `validateWebhookSignature` only).
- `app/api/webhooks/paystack/route.ts` returns early for every event except `charge.success`.
- `app/actions/communication/communication-actions.ts` `cancelOrderWithRefundAction` cancels via `OrderService.cancelOrder`, then only sets `paymentStatus: 'refunded'` (a TODO says "when the refund API is available"): **no money moves**. Its 50 % "preparing" branch is unreachable because `OrderService.cancelOrder` throws unless status is `pending` or `confirmed`.
- `app/actions/admin/order-management-actions.ts` `cancelOrderAction` refuses paid orders with "Please process a refund instead", and no refund exists.
- `OrderService.cancelOrder` already reverses inventory and reward points for `pending`/`confirmed` orders.
- `order.paymentStatus` has `refunded` but not `partially_refunded` (`models/order-model.ts`, `interfaces/order.interface.ts`).
- `SupportTicketCategory` has no `refund`.
- `orderStatusPhrase` (`services/order-status-notifier.ts`) returns "ready for pickup" for every non-dine-in order, including delivery (#1071).

### Decisions for approval

| #   | Decision                                                                                                                                                                                                                                                      | Recommendation                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **Who may cancel by WhatsApp.** The programme says an inbound message never skips the PIN, but also allows cancelling "by chat".                                                                                                                              | Cancel by chat is allowed only when the sender's number equals the order's verified customer phone, and the refund can only go back to the original payment. No money can reach a different party, so the PIN is not needed for this one action. |
| D2  | **Refund target.** Always the original Paystack transaction; no payout to a new account.                                                                                                                                                                      | Yes.                                                                                                                                                                                                                                             |
| D3  | **Precondition.** WA-07 asked to confirm the refund capability on the Paystack account. I cannot verify this from the repo.                                                                                                                                   | Operator confirms refunds are enabled on the UAT and production Paystack accounts before UAT. Until then `createRefund` failures leave the `Refund` row `failed` and raise a staff alert; the customer is told "we are processing your refund".  |
| D4  | **Refund scope.** Customer-origin orders paid through Paystack only. Staff-created, tab, cash and manual-payment orders keep today's behaviour (the Refund action is not offered; the dead-end message changes to say refunds apply to Paystack orders only). | Yes (matches the issue's out-of-scope line).                                                                                                                                                                                                     |
| D5  | **Templates.** Submit `order_cancelled` and `refund_processed` to UAT and production now (stage 1 approved, as the issue directs); features stay held per environment until that environment's copy is APPROVED.                                              | Yes.                                                                                                                                                                                                                                             |
| D6  | **Legacy path.** `cancelOrderWithRefundAction` and its 50 % branch are replaced by the new refund service.                                                                                                                                                    | Yes.                                                                                                                                                                                                                                             |

### Acceptance criteria

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                                    | SRS-ID        | Verification         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------------- |
| AC1 | **Given** a Paystack-paid order, **When** a refund is requested, **Then** `PaystackService.createRefund` calls Paystack `POST /refund` with the order's transaction reference (amount omitted for a full refund), a `Refund` row is stored (`pending`), and `refund.processed` / `refund.failed` webhooks (signature-checked, de-duplicated) move it to `processed` / `failed` and set the order `refunded` or `partially_refunded`. | REQ-PAY-011   | unit + e2e           |
| AC2 | **Given** a paid order in `pending` or `confirmed`, **When** the customer cancels (order-page button, or WhatsApp "cancel" from the order's own phone), **Then** the order is cancelled with inventory and points reversed and an automatic full refund is requested, atomically and only once.                                                                                                                                      | REQ-PAY-012   | unit + e2e           |
| AC3 | **Given** a paid order past `confirmed`, **When** the customer cancels, **Then** no money moves, a refund-request ticket (`category='refund'`, linked order) is created, the customer is told it went to the manager, and a `manager`/`admin`/`super-admin` can approve (full or partial) or reject it.                                                                                                                              | REQ-PAY-013   | unit + e2e           |
| AC4 | **Given** a staff user without `manager`/`admin`/`super-admin` (for example `csr`), **Then** the Refund and Approve actions are not offered and the server actions refuse; a customer session can never reach a partial refund.                                                                                                                                                                                                      | REQ-PAY-014   | unit + e2e           |
| AC5 | **Given** a cancellation, a processed refund or a rejection, **Then** the customer receives `order_cancelled`, `refund_processed` or a rejection message (free-form inside the 24 h window, `support_reply` outside), logged in `NotificationLog`; a template not yet approved is logged `held_template_pending`.                                                                                                                    | REQ-WA-019    | unit + e2e           |
| AC6 | **Given** refunds in a date range, **Then** `/dashboard/finance/refunds` shows totals, by type and by approver, matching the `Refund` rows; every refund action (request, approve, reject, process, fail) writes an audit-log entry.                                                                                                                                                                                                 | REQ-FIN-010   | unit + e2e           |
| AC7 | **Given** the two templates, **Then** `docs/whatsapp-templates/order_cancelled.json`, `refund_processed.json` and the catalogue entries exist and both are submitted to the UAT and production accounts with the status recorded in evidence.                                                                                                                                                                                        | REQ-WA-019    | unit + evidence file |
| AC8 | **Given** a delivery order set to Ready (#1071), **Then** the message phrase does not say "pickup" (for example "ready and waiting for a rider"); pickup keeps "ready for pickup" and dine-in keeps "ready and on its way to your table".                                                                                                                                                                                            | REQ-ORDER-007 | unit                 |

### SRS items proposed/touched

| AC  | SRS item                 | Status  | Notes                                                                  |
| --- | ------------------------ | ------- | ---------------------------------------------------------------------- |
| AC1 | REQ-PAY-011 (new)        | written | refund client, ledger, webhooks                                        |
| AC2 | REQ-PAY-012 (new)        | written | cancel before preparation, automatic full refund                       |
| AC3 | REQ-PAY-013 (new)        | written | refund request after preparation                                       |
| AC4 | REQ-PAY-014 (new)        | written | role gate                                                              |
| AC5 | REQ-WA-019 (new)         | written | cancel by chat; customer messages                                      |
| AC6 | REQ-FIN-010 (new)        | written | refunds report, audit                                                  |
| AC7 | REQ-WA-019 (new)         | written | templates (also listed in REQ-WA-002 catalogue by name in the release) |
| AC8 | REQ-ORDER-007 (existing) | updated | delivery phrase and one Given added                                    |

Table/heading drift check: PAY (010), WA (018), FIN (009), ORDER (008): table and heading maxima agree before this REQ.

Stories → tests (Paystack mocked): `e2e/critical/refund-flow.spec.ts` (US-A4.9 AC2/AC5, US-A4.10 AC1/AC5, US-A4.11 AC3, US-B3.1 AC3/AC4, US-B3.2 AC4), `e2e/critical/refund-report.spec.ts` (US-B3.3 AC6); vitest under `__tests__/` for the refund service, webhook, cancel actions, role gates, report query and the phrase (AC8).

## 2. Scope

- **In scope:** `services/paystack-service.ts` (`createRefund`); `models/refund-model.ts` + `interfaces/refund.interface.ts` (new); `services/refund-service.ts` (new: request, approve, reject, apply webhook result, caps and idempotency); `app/api/webhooks/paystack/route.ts` (refund events, dedup via `lib/webhook-idempotency.ts`); `models/order-model.ts` + `interfaces/order.interface.ts` (`partially_refunded`); `services/order-service.ts` (use the existing reversal); `app/actions/communication/communication-actions.ts` (replace the legacy refund branch); customer order page cancel button; `services/whatsapp-inbound-service.ts` (`cancel` intent with order selection); `models/support-ticket-model.ts` (`refund` category) and the support queue Approve/Reject buttons; `app/actions/admin/` refund actions + `/dashboard/orders/[orderId]` Refund action; `app/dashboard/finance/refunds`; `lib/notification-templates.ts` (category, held-until-approved set), `lib/whatsapp-notification-catalogue.ts` (admin switches, ADR-014), `docs/whatsapp-templates*`; `services/order-status-notifier.ts` (AC8); audit logging.
- **Out of scope:** cancelling staff-created or tab orders; payouts to a different account; non-Paystack refunds; changes to the sign-in flow.

### Surface inventory

| Surface                               | Process      | Role gate                       |
| ------------------------------------- | ------------ | ------------------------------- |
| Order page "Cancel order"             | A (customer) | signed-in owner                 |
| WhatsApp "cancel"                     | A (customer) | sender phone = order phone (D1) |
| Support refund-request Approve/Reject | B (staff)    | manager, admin, super-admin     |
| Order detail "Refund" (full/partial)  | B (staff)    | manager, admin, super-admin     |
| `/dashboard/finance/refunds`          | B (staff)    | manager, admin, super-admin     |
| Paystack refund webhook               | system       | HMAC signature                  |

## 3. Architecture decisions

- **ADR-015 — A refund ledger, with the order changing only when Paystack confirms** — Accepted (operator, 2026-11-26); drafted by `adr-author`. Draft at `docs/ADR/ADR-015-refund-ledger-and-idempotent-paystack-refunds.md`. Signals: new collection, new external API integration, HIGH risk, more than 3 files. The operator flips it to _Accepted_ with the plan approval.

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2 (`e2e/critical/refund-flow.spec.ts`, `e2e/critical/refund-report.spec.ts`), Paystack mocked, `ENABLE_WHATSAPP_NOTIFICATIONS=false` with `NotificationLog` assertions. UI regression sweep over `e2e/` for the order page, order detail and support queue strings.

## 5. Threat model + security considerations

| STRIDE                 | Threat                                                                                  | Mitigation                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | Someone texts "cancel" for another person's order to cause a refund/cancel              | D1: sender number must equal the order's phone; refund only to the original payment; order lookup is by the sender's own number, never a supplied id |
| Tampering              | Forged refund webhook marks orders refunded                                             | Raw-body HMAC check (existing) before any state change; dedup row; unknown reference returns 404 without side effects                                |
| Repudiation            | Staff refund with no trail                                                              | Audit-log every request/approve/reject/process/fail with actor and reason                                                                            |
| Information disclosure | Customer sees staff options or another customer's refund                                | Process A and B actions are separate; staff actions role-gated server-side; owner-scoped queries                                                     |
| Denial of service      | Repeated cancel taps create duplicate refunds                                           | Atomic conditional status change + unique active full-refund per order; partial refunds capped at paid minus already refunded                        |
| Elevation              | `csr` or customer approves/refunds                                                      | `hasAnyRole` checks in every action; AC4 negative tests                                                                                              |
| Financial integrity    | Double refund, over-refund, refund of unpaid order, order refunded while Paystack fails | Refund row is the ledger; order moves to `refunded` only from the webhook; failed refunds alert staff; amount in kobo validated against the order    |

No new dependency or secret (Paystack secret key already configured).

### Risk register entries

Entries in `compliance/risk-register.md` (the project register uses `R-NNN` ids). The operator signs off each residual rating at the Phase 3 sign-off exchange.

- **R-81 — A refund is issued twice or for more than was paid** — OPEN, residual low × medium. Ledger row first, unique active full refund, capped partials, atomic cancel, webhook de-duplication.
- **R-82 — Someone cancels another customer's paid order by WhatsApp** — OPEN, residual low × medium. Lookup from the sender's own number only, phone must match the order, refund to original payment only.
- **R-83 — Paystack refunds are unavailable or fail, so a cancelled customer is not repaid** — OPEN, residual medium × medium. Order stays `paid` until the webhook, staff alert on failure, operator confirms refunds are enabled (D3), customer wording.
- **R-84 — Unapproved or staff-misused refunds, or refund actions with no trail** — OPEN, residual low × medium. Role checks, mandatory reason, audit log, report by approver.

## 6. Data protection (GDPR Art. 25)

Refund rows hold order id, amounts, actor ids and a free-text reason (staff-entered; guidance not to include personal data). Customer phone is used only to match the sender to the order. Retention follows the order and finance records (WA-14 will set the schedule). Lawful basis: contract and legal obligation (financial records). Messages go only to customers with consent for transactional messages, as today.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. AI assistance in authoring is disclosed in `ai-use-note.md`.

## 8. Rollback plan

Revert the PR. `Refund` rows and the `partially_refunded` value are additive and ignored by older code; refunds already sent to Paystack cannot be recalled and are reconciled from the `Refund` collection and the Paystack dashboard. If only the customer path misbehaves, `ENABLE`-style switch is not provided; revert is the control.

## 9. Verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, the new critical specs, the UI regression sweep; UAT on `https://wawagardenbar-uat.ostendo.io` (agent-executed per `uat.mode: auto`) including a live UAT refund round-trip once the UAT template copies are APPROVED and D3 is confirmed. Production smoke after release.

## 10. Sign-off

Plan approved by: operator, 2026-11-26, at the Phase 1 checkpoint (HIGH risk); decisions D1–D6 approved as written.
