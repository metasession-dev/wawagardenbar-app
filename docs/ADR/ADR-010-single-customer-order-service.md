---
adr_id: 'ADR-010'
status: 'Proposed'
date: '2026-11-10'
authored_by: 'adr-author (Claude) for operator'
related_reqs: ['REQ-120']
supersedes: []
superseded_by: null
---

# ADR-010: One customer order service as the only customer order-creation path

## Status

**Proposed** (DRAFT — operator to flip to _Accepted_ on plan approval)

## Context

Customer orders are created by two code paths with different rules: the web checkout `createOrder` (server totals, idempotency, `WGB` order numbers) and `POST /api/public/orders` (trusts client totals, no hours, minimum, radius or idempotency checks, `WG` order numbers). Customers can also create and join tabs, which the programme (#953) makes staff-only. WhatsApp ordering (WA-09) would add a third path. REQ-120 (WA-05) traces to REQ-CHECKOUT-012, REQ-TABMGT-011, REQ-API-007.

## Decision

All customer entry points call `createCustomerOrder(input, ctx)` in `services/customer-order-service.ts`, with `ctx = { userId, channel }`. The service alone validates, reconciles lines, computes totals and writes the order with `origin: 'customer'`; callers only translate input and map typed errors. The public orders endpoint accepts customer-role API keys only when bound to a user (`ApiKey.userId`), and takes the order's user from the key, never the body. Staff creation paths (Express, tabs, staff-role API keys) are not routed through it and stamp `origin: 'staff'`. One `generateOrderNumber()` (`WG` + 10 digits, atomic counter) serves every path.

## Consequences

- **Good:** one place for rules; client totals can never reach storage; WA-06, WA-07 and WA-09 build on a single contract; `origin` makes customer and staff orders separable in reports and audits.
- **Bad:** integrations that post orders with customer keys must be re-keyed to a bound user; legacy open customer tabs lose their customer-side page.
- **Neutral / tradeoffs:** staff and customer creation stay two code paths by design (the separation is the point); `origin` defaults to `staff` so old writers stay valid.

## Alternatives considered

- **Alternative 1:** Fix each path in place — ruled out: the rules would drift again and WA-09 adds a third copy.
- **Alternative 2:** Route staff creation through the same service with a flag — ruled out: it would put staff capabilities (tabs, `pay-now`, price overrides) behind a flag on the customer path, against the two-processes rule.

## Cross-references

- Implementation plan: `compliance/plans/REQ-120/implementation-plan.md`
- SRS items: REQ-CHECKOUT-012, REQ-CHECKOUT-013, REQ-TABMGT-011, REQ-ORDMGT-019, REQ-API-007
- Risk register: to be added by `risk-register-keeper` (R-056 onward)
- Related: ADR-008 (customer sign-in gives every customer order a verified `userId`)
