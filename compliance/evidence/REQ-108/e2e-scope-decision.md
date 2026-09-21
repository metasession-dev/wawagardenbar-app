---
req: REQ-108
generated_by: e2e-test-engineer
generated_at: 2026-09-21T20:19:00Z
e2e_required: true
spec_path: e2e/critical/tab-order-no-false-cash-mark-req108.spec.ts
---

# E2E scope decision — REQ-108

## Outcome

**E2E required — covered.** New spec written and verified locally against the disposable-Mongo-container setup: fails against the pre-fix code (reproduces the exact historical bug — `tabId` unset after attach), passes with the fix in place.

## Detail

- **`e2e_required`:** `true`.
- **Rationale:** N/A — covered below. Although the diff itself touches no `.tsx` files, the bug is exercised through a real, user-facing kitchen-display/express-order workflow, and AC1 explicitly requires end-to-end verification through the real attach path (`expressCreateOrderAction`), not just a unit-level mock.
- **Spec path(s):** `e2e/critical/tab-order-no-false-cash-mark-req108.spec.ts`.
- **ACs covered:** AC1 (tab order stays unpaid through kitchen completion via the real attach flow). AC2 and AC3 are covered at the unit level (`__tests__/actions/admin/order-management-actions.test.ts`, `__tests__/services/tab-service.add-order-tabid.test.ts`) — AC2 is a regression guard on existing non-tab behavior with no new UI surface, and AC3 is an internal data-integrity property (`Order.tabId` correctness) that AC1's e2e path already exercises implicitly (the spec asserts `tabId` is set correctly before driving completion).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** pending
**Date:** pending
