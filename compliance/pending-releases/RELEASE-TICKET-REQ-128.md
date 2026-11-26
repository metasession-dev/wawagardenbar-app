# Release Ticket: REQ-128 — Customer cancellation and Paystack refunds (WA-11)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-11-26
**Requirement ID:** REQ-128
**Risk Level:** HIGH
**Issue:** [#973](https://github.com/metasession-dev/wawagardenbar-app/issues/973) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953)); also closes [#1071](https://github.com/metasession-dev/wawagardenbar-app/issues/1071) (delivery Ready wording, AC8)
**Implementation branch:** `feat/REQ-128-refunds`
**Absorbed predecessor releases:** None

## Summary

A customer can cancel a paid order before preparation (order page or WhatsApp "cancel") and get an automatic full Paystack refund; after preparation the cancel becomes a refund request a manager approves or rejects. Managers, admins and super-admins refund fully or partly from the order page. A refunds report, audit logging and the `order_cancelled` and `refund_processed` messages complete it. Details, acceptance criteria, decisions and deviations: `compliance/plans/REQ-128/implementation-plan.md`; ADR-015; risks R-81 to R-84.

Stage 3 evidence is in `compliance/evidence/REQ-128/`. Local gates: tsc, lint, 2443 unit tests and the production build pass; 14 new e2e tests and 49 related existing specs pass.

## Verification

CI runs on the integration PR. The release-PR E2E gate and an agent-executed UAT on UAT follow (`uat-test-procedure.md`).

## Sign-off (dual-actor)

To be completed at Phase 4 (UAT review).

## Operator tasks

- Confirm refunds are enabled on the UAT and production Paystack accounts before UAT (decision D3).
- Templates `order_cancelled` and `refund_processed`: UAT copies submitted 2026-11-26 (ids 1441641191342013 and 1521772439886567, PENDING at the last check). Production: the account refuses API creation (`SMB_ACCOUNT_NOT_ON_COEX`), so add both by hand in WhatsApp Manager with the same names and bodies (`compliance/evidence/REQ-128/template-submissions.md`).
- Sign off risks R-81 to R-84 in `compliance/risk-register.md`.

## Known limitations at release

- Real WhatsApp delivery is not exercised by CI; it is covered by the UAT live round-trip once the UAT templates are approved.
- A refund stuck `pending` (a missed Paystack webhook) is visible on the order and the report; there is no reconciliation job yet.
- Approving a refund request refunds the money only; staff update the order's status separately.
