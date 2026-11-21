---
title: "Implementation plan — REQ-124"
requirement_id: "REQ-124"
risk_class: "HIGH"
change_type: "feat"
authored_by: "sdlc-implementer (Claude Sonnet 5.5), operator-confirmed classification"
authored_at: "2026-11-21"
---

# Implementation plan — REQ-124

Issue: [#970](https://github.com/metasession-dev/wawagardenbar-app/issues/970) — WA-08 Order status notifications, tracking link, serving check. Parent tracker: #953. Depends on REQ-123 (WA-07, `markOrderPaid`) — released.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Customers who order through the customer process hear about each status change on WhatsApp, can only open their order through a signed link (or while signed in as the owner), and service staff see `Table N · FirstName` at a glance without the kitchen seeing a customer's phone, email or full name.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                             | SRS item it traces to                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| AC1 | **Given** a paid customer-origin order, **When** staff set its status to confirmed / preparing / ready / out-for-delivery / delivered in the dashboard, **Then** the customer is sent `order_status_update` with the status phrase (free-form text inside the 24-hour window, template outside it), each status at most once per order, completed sends nothing, and a staff-origin order never produces a customer message. | REQ-ORDER-007 (new — stub)             |
| AC2 | **Given** staff change one order or many at once, **When** the status is saved, **Then** `notifyOrderStatus` is called from exactly one place per action (`updateOrderStatusAction`; `batchUpdateOrdersAction` reaches it only through that action) and not from any UI component.                                                                                                                                              | REQ-ORDER-007 (new — stub, same item) |
| AC3 | **Given** an order id, **When** `/orders/[orderId]` is opened or a socket sends `join-order`, **Then** it works only for the signed-in owner or a holder of a valid, unexpired `?t=` token (HMAC with `ORDER_TRACKING_SECRET`, 30 days); anyone else gets 404 (page) or is not joined (socket). Every customer message links with the token.                                                                                     | REQ-ORDER-008 (new — stub); REQ-ORDER-001 (updated) |
| AC4 | **Given** an order with a table, pickup or delivery type, **When** it appears on the kitchen card, dashboard order card or order-queue row, **Then** a large header reads `Table N · First` / `Pickup · First` / `Delivery · First` (`No name` when unknown); kitchen cards show first name only — no phone, email or full name.                                                                                               | REQ-KITCHEN-010 (new — stub) |
| AC5 | **Given** a delivery order, **When** the kitchen card is shown, **Then** it shows the delivery address and instructions.                                                                                                                                                                                                                                                                                                      | REQ-KITCHEN-011 (new — stub) |
| AC6 | **Given** the `order_status_update_v2` template (body `Your Wawa Garden Bar order #{{1}} is {{2}}. Tap below to track it.` + URL button "Track order"), **Then** it is submitted to both WhatsApp accounts (UAT, production) with the same name and body and each copy's status is recorded in evidence.                                                                                                                                                 | REQ-WA-002 (updated) |
| AC7 | **Given** a delivery order that is ready, **When** staff use the dashboard order card or order page, **Then** they can set it to out-for-delivery, then delivered, then completed (each step offered only to delivery orders, in that order), the Active tab keeps showing it until it is completed, and each step sends its customer message through AC1. *(Added by requirements gap amendment, 2026-11-21: the dashboard had no way to reach these statuses.)* | REQ-ORDMGT-020 (new) |

Stories → tests: US-A4.1–A4.4 → `e2e/critical/whatsapp-order-tracking.spec.ts` (AC1, AC3, AC7: US-A4.2 now runs end to end); US-B1.5–B1.7 → `e2e/critical/kitchen-serving-check.spec.ts` (AC4, AC5).

### SRS items proposed/touched

| AC  | SRS item                          | Status                  | Notes                                                       |
| --- | --------------------------------- | ----------------------- | ----------------------------------------------------------- |
| AC1 | REQ-ORDER-007 (new)               | stub — operator to edit | status notifications, once per status, customer-origin only |
| AC2 | REQ-ORDER-007 (new)               | stub                    | single call site is part of the same item                   |
| AC3 | REQ-ORDER-008 (new)               | stub — operator to edit | owner-or-token gate (page + socket)                         |
| AC3 | REQ-ORDER-001 (existing)          | updated                 | tracking page now gated; Given added                        |
| AC4 | REQ-KITCHEN-010 (new)             | stub — operator to edit | serving header, kitchen first-name only                     |
| AC5 | REQ-KITCHEN-011 (new)             | stub — operator to edit | delivery address on kitchen card                            |
| AC6 | REQ-WA-002 (existing)             | updated                 | `order_status_update` now sent + button                     |
| AC7 | REQ-ORDMGT-020 (new)              | written                 | delivery steps out-for-delivery and delivered               |

Table/heading drift check: none found for REQ-ORDER / REQ-KITCHEN / REQ-WA (table and heading maxima agree).

## 2. Scope

- **In scope:**
  - `lib/order-tracking-token.ts` (new): `createTrackingToken`, `verifyTrackingToken`, `buildTrackingUrl`.
  - `services/notification-service.ts` (or a sibling `services/order-status-notifier.ts`): `notifyOrderStatus(orderId, newStatus)`; status-phrase map; once-per-status claim.
  - `models/order-model.ts` + `interfaces/order.interface.ts`: `notifiedStatuses: string[]` for the atomic once-per-status claim.
  - `app/actions/admin/order-management-actions.ts`: one call after save in `updateOrderStatusAction`.
  - `lib/whatsapp-template-params.ts`, `lib/notification-templates.ts` (`HELD_UNTIL_APPROVED_TEMPLATES`), `docs/whatsapp-templates.md`, `docs/whatsapp-templates/order_status_update_v2.json` (new; the existing `order_status_update` JSON and key stay for the old copy until retired): body/button change. The code key switches to `order_status_update_v2` (`TEMPLATE_CATEGORIES`, `HELD_UNTIL_APPROVED_TEMPLATES`, param builder).
  - `app/(customer)/orders/[orderId]/page.tsx` and its child routes; `lib/socket-server.ts` + `hooks/use-order-socket.ts`: token / owner check.
  - Every producer of a customer `/orders/<id>` link (receipt button in REQ-123, checkout redirects, order history) so legitimate owners and guests are not locked out.
  - `components/features/kitchen/kitchen-order-card.tsx`, `components/features/admin/order-card.tsx`, `components/features/admin/order-queue.tsx`; shared `lib/serving-label.ts` for the header text.
  - `.env.example`, deployment docs: `ORDER_TRACKING_SECRET`.
- **Out of scope:** customer "status" text intent (WA-09); cancellation messages (WA-11); status changes other than the delivery-order additions in AC7; the existing unused `sendOrderStatusNotificationAction` (left in place, not wired).

### Surface inventory

| Surface                       | URL / file                                              | Status                                                                                      |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Customer tracking page        | `/orders/[orderId]` (`app/(customer)/orders/[orderId]`) | In scope — owner-or-token gate                                                              |
| Order sub-routes              | `/orders/[orderId]/cancel`, `/review`                   | In scope — same gate (checked; do not leave an open side door)                              |
| Customer order history        | `/orders`, `/orders/history`                            | In scope — links carry token / owner already signed in                                      |
| Socket room join              | `lib/socket-server.ts` `join-order`                     | In scope — token or owner session                                                           |
| Staff status change           | `updateOrderStatusAction`, `batchUpdateOrdersAction`    | In scope — one call site                                                                    |
| Kitchen display card          | `components/features/kitchen/kitchen-order-card.tsx`    | In scope — header, PII removal, delivery address                                            |
| Dashboard order card / queue  | `order-card.tsx`, `order-queue.tsx`                     | In scope — header line                                                                      |
| Order detail (staff)          | `/dashboard/orders/[orderId]`                           | Already works — keeps full details                                                          |
| WhatsApp receipt button       | REQ-123 `receipt` template URL button                   | In scope — button parameter becomes `id?t=token`                                            |
| Cancellation messaging        | WA-11                                                   | Out of scope (waived) — #973                                                                |

## 3. Architecture decisions

- **ADR-013 — Customer order access by signed-in owner or signed tracking token** — Proposed by `adr-author` (HIGH risk; new access-control pattern across page, sub-routes, socket and message links; new secret). Draft at `docs/ADR/ADR-013-signed-order-tracking-token-owner-or-token-access.md`. Operator edits and flips status to _Accepted_ before plan approval.

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2. Specs: `e2e/critical/whatsapp-order-tracking.spec.ts` (AC1, AC3), `e2e/critical/kitchen-serving-check.spec.ts` (AC4, AC5). AC2 and AC6 are covered by unit tests and evidence respectively. CI runs with `ENABLE_WHATSAPP_NOTIFICATIONS=false`, so specs assert the `NotificationLog` row (template, params, status), not delivery.

## 5. Threat model + security considerations

| Threat                                                    | Likelihood | Impact | Mitigation                                                                                                                                                         |
| --------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Order enumeration / IDOR on `/orders/[id]` (today open)   | High       | High   | Owner session or valid token else `notFound()`; 404 (not 403) so existence is not revealed; applied to sub-routes too.                                            |
| Forged or tampered token                                  | Low        | High   | HMAC-SHA256 over `orderId.expiry`; constant-time compare (`timingSafeEqual`); token bound to one order id; expiry inside the signed payload.                       |
| Missing/weak `ORDER_TRACKING_SECRET`                      | Medium     | High   | Fail closed: no secret → tokens cannot be created or verified (page 404s for non-owners, startup/ops log error); minimum length enforced; documented in env docs.   |
| Token leakage via URL (logs, referrer, forwarded link)    | Medium     | Medium | 30-day expiry, single-order scope, `Referrer-Policy: no-referrer` on the page; token never logged; read-only page.                                                  |
| Socket room join without auth (live status of any order)  | High       | Medium | `join-order` requires valid token or owner session cookie; payload without either is ignored; unit-tested.                                                         |
| Duplicate / mistaken customer messages                    | Medium     | Medium | Atomic `findOneAndUpdate` claim on `notifiedStatuses` before send; staff-origin orders skipped; consent gate and `NotificationLog` unchanged.                      |
| Staff action fails because messaging fails                | Medium     | Medium | `notifyOrderStatus` runs after save in try/catch; never throws into the status action.                                                                             |
| PII shown on kitchen display                              | Medium     | Medium | Kitchen card receives first name only; full detail stays on role-gated dashboard order page.                                                                       |
| Legit owners/guests locked out by the new gate            | Medium     | Medium | Surface inventory above; every link producer updated; e2e covers guest-with-token and owner-signed-in paths.                                                       |

**Secrets / credentials:** new `ORDER_TRACKING_SECRET` (random ≥32 bytes), set per environment (UAT, production) by the operator; rotating it invalidates outstanding links (acceptable; documented). Never committed.

**Dependencies introduced:** none (Node `crypto`).

### Risk register entries

- **R-73 — Order tracking page and socket open to anyone with an order id** — Status: OPEN. Residual low × medium.
- **R-74 — Tracking token forged, leaked or secret misconfigured** — Status: OPEN. Residual low × medium.
- **R-75 — Customer status messages duplicated, mistargeted or held** — Status: OPEN. Residual medium × low.
- **R-76 — Kitchen display exposes customer personal data / serving check wrong** — Status: OPEN. Residual low × low.

Opened by `risk-register-keeper` in `compliance/risk-register.md` (this project numbers risks `R-NNN`). Operator edits canonical rows and signs off residual ratings before plan approval. Per-REQ summary: `compliance/evidence/REQ-124/risk-assessment.md` (Stage 3).

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** yes.

- **Categories of data subjects:** customers (account holders and guests).
- **Categories of personal data:** phone number (message destination), order number, order status, first name (staff display), delivery address (kitchen card).
- **Special categories (Art. 9):** none.
- **Lawful basis:** Art. 6(1)(b) performance of the ordering contract for status messages; consent gate `whatsappTransactional` already enforced by `NotificationService`.
- **Purpose limitation:** messages carry only order number and status phrase; the token authorises one order only.
- **Data minimisation:** this REQ reduces exposure — the kitchen display drops phone, email and full name; staff see first name only.
- **Retention:** `notifiedStatuses` lives and dies with the order; `NotificationLog` retention unchanged (WA-14 owns retention policy).
- **Cross-references:** ROPA update — no new processing purpose or recipient (existing order-notification entry covers it); DPIA — not required.
- **Cross-border transfers:** unchanged (Meta WhatsApp Cloud API already in the ROPA).

## 7. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour. Status phrases are fixed strings.

## 8. Rollback plan

- **Reversible via:** git revert of the merge commit. The notification and the tracking gate can also be disabled independently: unset `ENABLE_WHATSAPP_NOTIFICATIONS` stops messages; reverting the page gate alone restores open tracking.
- **Data implications of rollback:** `notifiedStatuses` is an additive field an older version ignores. Links already sent contain `?t=` which older code ignores, so they keep working.
- **Notification path if rollback during a release:** operator (project owner) via the issue #970 sticky and the programme tracker #953.

## 9. Verification

- **Unit + integration tests (vitest, `__tests__/` mirroring paths):** token create/verify (valid, tampered, expired, wrong order, secret missing); status-phrase mapping per type and order type; once-per-status claim (including concurrent calls); origin gating; in/out of 24-hour window; `updateOrderStatusAction` calls notifier once and batch does not double-call; socket join authorisation; serving label (`Table 7 · Ada`, `No name`, `Pickup`, `Delivery`); kitchen card renders no phone/email/full name.
- **E2E coverage:** see §4.
- **Manual smoke after deploy:** after the UAT template copy is APPROVED, a live round-trip on UAT (status → message → tap link → tracking page); production smoke after release and production approval.
- **Monitoring / alerting:** `NotificationLog` rows for `order_status_update` including `held_template_pending`.

## 10. Sign-off

- **Plan reviewer (eng):** pending.
- **Plan reviewer (security / DPO):** pending — HIGH risk, access-control change.
- **Plan approved by operator:** approved 2026-11-21 by the operator (william@ostendo.io) in the Claude Code session ("approve the plan, write the SRS stubs as canonical, use order_status_update_v2"); recorded by the agent. Applies to ADR-013 and risks R-73 to R-76 as drafted.

## Decisions recorded at the Phase 1 checkpoint (2026-11-21)

1. **Template:** submit as `order_status_update_v2` (new name; body `Your Wawa Garden Bar order #{{1}} is {{2}}. Tap below to track it.` — Meta's template API rejects a body that ends in a placeholder, so closing wording was added to the issue's text; operator chose this on 2026-11-21, UTILITY, URL button "Track order"); the existing `order_status_update` is left untouched. Operator decision.
2. **Sub-routes** `/cancel` and `/review` get the same owner-or-token gate.
3. **Once-per-status** is claim-before-send: a failed send is logged, not retried automatically.

## Upload path

This file lives at `compliance/plans/REQ-124/implementation-plan.md`; Phase 3 copies it to `compliance/evidence/REQ-124/implementation-plan.md`.

## Requirements gap accepted / amended

**Gap (found by e2e-test-engineer, Phase 2):** the issue assumed staff could already set `out-for-delivery` and `delivered`, but `updateOrderStatusAction`'s transition table and the dashboard buttons stop at `ready → completed`. US-A4.2 could not run end to end.
**Decision:** option (b) amend, by the operator, 2026-11-21 ("b amend"). New AC7 and SRS item REQ-ORDMGT-020 above; the status state machine gains delivery-only steps. `confirmed` stays a payment-driven status (set by `markOrderPaid`); staff do not set it.
**Evidence impact:** Phase 3 had not started, so no compiled evidence is invalidated; the e2e run is repeated with US-A4.2 added.
