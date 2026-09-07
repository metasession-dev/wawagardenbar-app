---
req: REQ-102
generated_by: e2e-test-engineer
generated_at: 2026-09-04T21:30:00Z
e2e_required: true
spec_path: e2e/settings/pricing-windows.spec.ts, e2e/admin/price-management-triple-price.spec.ts, e2e/customer/menu-price-window-display.spec.ts, e2e/admin/menu-edit-all.spec.ts
---

# E2E scope decision — REQ-102

## Outcome

**E2E required — covered.** Four specs were written covering the five UI-facing acceptance criteria (AC1, AC2, AC6, AC7, AC8). AC3-AC5 (order-time price precedence) and AC9 (migration backfill) are non-UI and are covered by unit tests only (`__tests__/lib/order-line-totals.price-windows.test.ts`, `__tests__/services/settings-service.price-windows.test.ts`) — no e2e surface exists for them.

## Detail

- **`e2e_required`:** `true`
- **Rationale:** N/A — covered below.
- **Spec path(s):**
  - `e2e/settings/pricing-windows.spec.ts` (AC2)
  - `e2e/admin/price-management-triple-price.spec.ts` (AC1)
  - `e2e/customer/menu-price-window-display.spec.ts` (AC6)
  - `e2e/admin/menu-edit-all.spec.ts` (AC7, AC8)
- **ACs covered:** AC1, AC2, AC6, AC7, AC8. AC3, AC4, AC5, AC9 are covered by unit tests only (no UI surface for precedence resolution or the migration script).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
