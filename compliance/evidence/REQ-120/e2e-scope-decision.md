---
req: REQ-120
generated_by: e2e-test-engineer
generated_at: 2026-11-10T21:55:00Z
e2e_required: true
spec_path: e2e/critical/customer-order-validation.spec.ts, e2e/critical/customer-cannot-use-tabs.spec.ts
---

# E2E scope decision — REQ-120

## Outcome

**E2E required — covered.** Two new merge-gating specs were written and the critical tier passed locally against a disposable database.

## Detail

- **`e2e_required`:** true (UI-facing files changed: checkout form, order details step, customer orders page, navbar).
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/customer-order-validation.spec.ts` (transport layer, no `page`: evidence is the per-spec entry in `test-execution-summary.md`), `e2e/critical/customer-cannot-use-tabs.spec.ts` (UI, with evidence screenshots).
- **ACs covered:** AC1 (pay-now and tab refused), AC2 (OUT_OF_HOURS, BELOW_MINIMUM, OUT_OF_RADIUS, RATE_LIMITED, client totals ignored), AC3 (idempotency), AC4 (single `WG` + 10 digit order number), AC6 (tabs staff-only: pages gone, no tab step, API and tab routes refuse customers). AC5, AC7, AC8 are covered by unit tests (migration, ordering options, API-key binding).
- **Existing specs updated** because the customer tab path was removed: `e2e/smoke/req-084-checkout-separation.spec.ts` (AC2 now submits through Tip and Payment and asserts the customer-origin order; the item clears the new server-side minimum), `e2e/critical/daily-report-payments.spec.ts` (orders are added to the tab through staff Express), `e2e/requirements-verification.spec.ts` (`/orders/tabs` now returns 404). No spec was deleted.
- **Added at the operator's request on 2026-11-11 (additive, no AC change):** `e2e/critical/customer-order-journey.spec.ts` (home page, menu, cart, WhatsApp sign-in, checkout for dine-in, pickup and delivery, order created, paid by a signed Paystack `charge.success` webhook) and `e2e/critical/customer-tab-refusal-ui.spec.ts` (staff pages refused to a customer; an order at a table with an open staff tab is standalone). Staff admin-order-management journeys were considered and not added to this REQ (operator decision).
- **Staff regression:** `e2e/critical/csr-order-tab-parity-req109.spec.ts` (US-B2.1) and the other staff tab specs pass unchanged.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [x] The verdict matches the actual scope of this REQ.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-10

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-10; recorded by the agent from the operator's explicit reply._
