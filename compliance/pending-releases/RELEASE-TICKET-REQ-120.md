# Release Ticket: REQ-120 — Single customer order service; tabs staff-only (WA-05)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-11-10
**Requirement ID:** REQ-120
**Risk Level:** HIGH
**Issue:** [#967](https://github.com/metasession-dev/wawagardenbar-app/issues/967) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953); Release 3, solo, no bundle)
**Implementation branch:** `feat/REQ-120-single-customer-order-service`
**Absorbed predecessor releases:** None

## Summary

Every customer order, from the web checkout or the public API (and later WhatsApp), is now created by one service that enforces the same rules on the server. Customers can no longer create, join or pay a tab. Staff order and tab creation is unchanged.

- **One service:** `createCustomerOrder` (`services/customer-order-service.ts`) validates order type, business hours (pickup and delivery), minimum order, an hourly cap, table, pickup time and delivery address and radius; rebuilds every price from the menu; computes fees and totals itself; returns typed errors (`OUT_OF_HOURS`, `BELOW_MINIMUM`, `ITEM_UNAVAILABLE`, `OUT_OF_RADIUS`, `ORDER_TYPE_DISABLED`, `RATE_LIMITED`); and requires an idempotency key.
- **Callers:** the web `createOrder` is a thin wrapper (channel `web`, customer sessions only); `POST /api/public/orders` uses it for customer keys (channel `public_api`) and keeps the staff path for staff keys.
- **Order data:** `origin` (`customer` or `staff`) and `channel` on every order; one order-number format (`WG` + 10 digits); idempotent migration `scripts/migrate-order-origin.ts`.
- **Tabs staff-only:** six tab server actions and `initializeTabPayment` refuse non-staff; public tab routes refuse customers; the checkout tab step, `/orders/tabs` pages and customer tab links are gone; checkout is four steps.
- **API keys:** a customer-role key is bound to a customer (`ApiKey.userId`); the order's user comes from the key.
- **Hourly cap setting:** the existing "Max orders per hour" setting now accepts 0 (no limit).
- **Ordering options:** read-only `getOrderingOptionsAction` for the checkout and WhatsApp.
- **Fixed on the way:** customization option prices were taken from the client; an unused third order-creation path (`createOrderAction`) was removed.

## Bundled Changes

- **Core tracked release:** `REQ-120`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** none declared.
- **Why bundled here:** not bundled. Solo release per the #953 plan.
- **Evidence impact:** evidence for REQ-120 only (`compliance/evidence/REQ-120/`).
- **Reviewer impact:** one HIGH-risk approval envelope for this REQ.
- **Security / risk impact:** R-056 to R-059; see `compliance/evidence/REQ-120/risk-assessment.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/REQ-120-single-customer-order-service`

## Absorbed Predecessor Releases

None.

## AI contributors

| Tool        | Version    | Commits                                                                     | Date       |
| ----------- | ---------- | --------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5.5 | plan, ADR, risk, implementation, test and compliance commits on this branch | 2026-11-10 |

## Implementation details

- **Core:** `services/customer-order-service.ts` (new), `services/order-service.ts` (public `generateOrderNumber`, `origin`/`channel`/idempotency pass-through), `models/order-model.ts`, `interfaces/order.interface.ts`.
- **Callers:** `app/actions/payment/payment-actions.ts`, `app/api/public/orders/route.ts`, `lib/api-key-validator.ts`, `lib/api-response.ts` (`rejectNonStaffTabAccess`), `models/api-key-model.ts`, `services/api-key-service.ts`, `components/features/admin/api-keys/create-api-key-dialog.tsx`.
- **Tabs removed from customers:** `app/actions/tabs/tab-actions.ts`, `app/api/public/tabs/**`, `components/features/checkout/{customer-checkout-form,order-details-step}.tsx`, deleted `tab-options-step.tsx`, `app/(customer)/orders/tabs/**`, `components/features/tabs/tabs-list-client.tsx`, `app/actions/tabs/tab-restriction-actions.ts`; `app/(customer)/orders/page.tsx`, navbar label.
- **New:** `app/actions/ordering/ordering-options-actions.ts`, `lib/order-origin-migration.ts`, `scripts/migrate-order-origin.ts`.
- **Tests:** eight new unit files; two new critical specs (11 tests) and two helpers; three existing specs updated.
- **Design:** ADR-010. **SRS:** REQ-CHECKOUT-012, REQ-CHECKOUT-013, REQ-TABMGT-011, REQ-ORDMGT-019, REQ-API-007 new; REQ-CHECKOUT-005, REQ-ORDER-003, REQ-ORDER-004 retired; REQ-CHECKOUT-007, REQ-CHECKOUT-008 updated. **Risk register:** R-056 to R-059.

## Operator tasks (not code)

1. **Before the release PR can pass Quality Gates:** decide the `mongoose` advisory (3 unresolved, newly disclosed, not caused by this REQ): a patch bump PR (8.24.7 or later) or an accepted-risk record. Land the bump first; it re-runs checks on the release PR.
2. Set production "Max orders per hour" in Dashboard → Settings → Order configuration (now enforced shop-wide on customer orders; 0 = no limit; an existing settings document keeps its stored value) and confirm the dine-in business-hours exemption (kept from REQ-061).
3. Before release: list open tabs created by customers (staff settle them from `/dashboard/orders/tabs`) and identify integrations that post orders with customer keys (they need a customer key bound to a user, or a staff key).
4. After the UAT deploy: run `npx tsx scripts/migrate-order-origin.ts` (dry run), then `--apply`; keep the output as evidence. Repeat on production after release.
5. Sign off the SRS alignment, architecture decision, risk assessment and e2e scope decision in `compliance/evidence/REQ-120/`.
6. Independent UAT reviewer (not the operator, `dual_actor`) executes the UAT pack (`uat-briefing.md`, `uat-test-procedure.md`, `uat-execution-record.md`), then records UAT and approves in the portal; a person approves Production.

## UAT pack

`compliance/evidence/REQ-120/uat-briefing.md`, `uat-test-procedure.md` and `uat-execution-record.md`.

## Verification

- TypeScript: 0 errors. ESLint: 0 errors (pre-existing warnings only). `npm run build`: green.
- Unit/integration: 1987 passed, 4 skipped (full suite).
- E2E: new critical specs 11/11; staff tab specs unchanged and passing; full `critical` tier 358 passed, 1 failed, 0 skipped, the one failure being a known REQ-095 flake that passes in isolation. Isolated server and disposable MongoDB.
- Dependency audit: FAIL, pre-existing `mongoose@8.24.1` advisories (see task 1).
- Full detail: `compliance/evidence/REQ-120/test-execution-summary.md` and `security-summary.md`.
- Not yet done (operator): the migration runs and the live UAT.

## Sign-off (dual-actor)

HIGH risk, `approval.mode: dual_actor`: the UAT reviewer must be a different person from the operator who triggered this work. The AI tooling that implemented the REQ and the human reviewers are distinct actors.

- **Submitter (implementation):** Claude Code (Sonnet 5.5)
- **Operator approvals on record:** plan approval (2026-11-10, `PROCEED`) with the recommended options for D1 to D4, ADR-010 Accepted and R-056 to R-059.
- **UAT reviewer / approver:** pending, on the DevAudit portal.
