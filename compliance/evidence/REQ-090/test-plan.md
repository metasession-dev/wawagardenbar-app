# Test plan — REQ-090

**Requirement:** REQ-090 — Fix E2E critical-tier regression blockers on develop
**Risk class:** LOW

## Test file listing with AC coverage

| Test file | ACs covered | Test type |
| --- | --- | --- |
| `__tests__/actions/admin/order-management-actions.test.ts` (existing) | AC1 | Unit |
| `e2e/critical/admin-order-inventory-delta.*.spec.ts` (existing) | AC1 | E2E |
| `e2e/critical/partial-payments.spec.ts` (existing) | AC2 | E2E |
| `e2e/critical/business-day-cutoff.spec.ts` (existing) | AC2 | E2E |

## Coverage summary

| AC | Unit test | E2E test | Status |
| --- | --- | --- | --- |
| AC1 | order-management-actions unit tests | admin-order-inventory-delta specs | TBD |
| AC2 | N/A | partial-payments, business-day-cutoff, and other orders-page specs | TBD |
