# Release Ticket: REQ-124 — Order status notifications, tracking link and serving check (WA-08)

**Status:** PENDING UAT
**Date:** 2026-11-22
**Requirement ID:** REQ-124
**Risk Level:** HIGH
**Issue:** [#970](https://github.com/metasession-dev/wawagardenbar-app/issues/970) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/REQ-124-order-status-notifications`
**Absorbed predecessor releases:** None

## Summary

Customers who order through the customer process now get one WhatsApp message per status change (preparing, ready, out for delivery, delivered; none for completed or for staff-created orders), each with a signed "Track order" link. The order page and its socket room open only for the signed-in owner or the holder of that link (HMAC-SHA256, 30 days); anyone else gets 404. Delivery orders can be taken from ready through out-for-delivery and delivered to completed from the dashboard. Order cards, the queue and the kitchen display show `Table N · FirstName` / `Pickup · …` / `Delivery · …`; the kitchen shows a first name only, plus the delivery address and instructions for delivery orders. Details, acceptance criteria (AC1 to AC7, AC7 added by amendment) and risks R-73 to R-76: `compliance/plans/REQ-124/implementation-plan.md`; ADR-013.

Stage 3 evidence is in `compliance/evidence/REQ-124/`. Local gates: tsc, lint, 2,247 unit tests, the production build and 26 e2e tests pass; CI Quality Gates and in-scope E2E passed on PR #1068.

## Verification

CI ran on the integration PR (#1068). The release-PR E2E gate and a UAT live round-trip follow (`uat-test-procedure.md`).

## Sign-off (dual-actor)

To be completed at Phase 4 (UAT review).

## Operator tasks

- `ORDER_TRACKING_SECRET` (32+ characters): reported set on UAT and production on 2026-11-22. Rotating it revokes every outstanding link.
- Template `order_status_update_v2`: UAT copy submitted 2026-11-21 (id 2960653154320082, PENDING at the last check). Production: the account refuses API creation (`SMB_ACCOUNT_NOT_ON_COEX`), so the operator creates it in WhatsApp Manager (body `Your Wawa Garden Bar order #{{1}} is {{2}}. Tap below to track it.`, URL button "Track order" to `https://app.wawagardenbar.com/orders/{{1}}`). Until a copy is APPROVED its environment holds the message (`held_template_pending`). See `template-submissions.md`.
- Sign off risks R-73 to R-76 in `compliance/risk-register.md`.

## Known limitations at release

- Real WhatsApp delivery is not exercised by CI (WhatsApp is off in the e2e stack); it is covered by the UAT live round-trip once the UAT template is approved.
- The `CI Pipeline` run on the integration merge failed in `Register Release` only because this release ticket did not exist yet.
