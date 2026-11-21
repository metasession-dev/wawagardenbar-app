# Release Ticket: REQ-123 — Paystack payment at checkout and the paid-only kitchen gate (WA-07)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-11-19
**Requirement ID:** REQ-123
**Risk Level:** HIGH
**Issue:** [#969](https://github.com/metasession-dev/wawagardenbar-app/issues/969) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/REQ-123-paystack-payment-paid-only-kitchen-gate`
**Absorbed predecessor releases:** None

## Summary

Customer orders are paid through Paystack only, with a stable reference and checkout URL. A raw-body-verified, amount-checked webhook drives one idempotent `markOrderPaid`, which emits to the kitchen once and sends the customer `order_confirmation` and `receipt`. Kitchen and live queues show staff orders always and customer orders only when paid; unpaid customer orders appear under an Awaiting-payment view, get one `payment_link` at 5 minutes and are cancelled at 30. Details, acceptance criteria and risks: `compliance/plans/REQ-123/implementation-plan.md`; ADR-012.

Stage 3 evidence is in `compliance/evidence/REQ-123/`. Local gates: tsc, lint, 2182 unit tests and the production build pass; the 10 new critical e2e tests pass; the full local `critical` tier had 9 failures triaged as unrelated and unproven until CI (see `test-execution-summary.md`).

## Verification

CI runs on the integration PR; the full regression tier and the UAT live round-trip follow.

## Sign-off (dual-actor)

To be completed at Stage 3 and Phase 4.

## Operator tasks

- Templates `order_confirmation`, `receipt` and `payment_link` were submitted on 2026-11-19 (operator confirmed): UAT (+44 7363 078509) ids 996406356861368, 1129844363244578, 1512870187356343; production (+234 814 825 3342) ids 1865474801173632, 1463445971891321, 1590861492794635; all PENDING at submission. Re-check with the WhatsApp tools before the UAT live round-trip and before production switch-on.
- Confirm Paystack refund capability and the webhook URL per environment (`paystack-refund-capability.md`).
- Sign off risks R-67 to R-72 in `compliance/risk-register.md`.

## Known limitations at release

- The first-time creation of a real Paystack transaction is not exercised by CI (no Paystack network); it is covered by unit tests and the UAT live round-trip.
