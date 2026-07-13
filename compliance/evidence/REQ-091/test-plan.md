# Test Plan — REQ-091

## Requirement

REQ-091: Stabilize REQ-084 AC12 E2E smoke test against nondeterministic menu seed data.

## Risk Class

LOW — test-only change. No application production code, API, schema, auth, payment, or PII changes.

## Acceptance Criteria Coverage

| AC | Description | Test File | Test Type | Covered |
|----|-------------|-----------|-----------|---------|
| AC1 | AC12 targets a seeded, deterministic in-stock menu item via `data-testid` | `e2e/smoke/req-084-checkout-separation.spec.ts` | E2E (smoke) | ✓ |
| AC2 | Seeded item has `kind: 'menu-item'` and `mainCategory: 'food'` to match customer-menu query filters | `e2e/smoke/req-084-checkout-separation.spec.ts` | E2E (smoke) | ✓ |
| AC3 | Seeded item is cleaned up after test via `finally` block | `e2e/smoke/req-084-checkout-separation.spec.ts` | E2E (smoke) | ✓ |
| AC4 | CI Quality Gates E2E step passes reliably on PR | CI run 29235251080 | CI gate | ✓ |

## Test Files

| File | ACs Covered | Notes |
|------|-------------|-------|
| `e2e/smoke/req-084-checkout-separation.spec.ts` | AC1, AC2, AC3 | Modified `seedMenuItem()` helper and AC12 test |

## Out of Scope

Unit tests — no application production code was changed.
