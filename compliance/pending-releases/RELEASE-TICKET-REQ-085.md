---
req: REQ-085
risk_class: HIGH
issue: '#410'
created_at: 2026-06-25T17:10:00Z
---

# Release ticket — REQ-085

## Requirement

**Issue:** [#410](https://github.com/metasession-dev/wawagardenbar-app/issues/410)
**Risk class:** HIGH
**Change type:** Bug fix

## Summary

Tab payment processing incorrectly resets the `status` of all associated orders to `'confirmed'`, causing orders that have already been processed by the kitchen to reappear on the kitchen display and potentially leading to double inventory deductions.

## Changes

### Backend

- `services/tab-service.ts` — Removed `status: 'confirmed'` from `markTabPaid` and `completeTabPaymentManually` `updateMany` `$set` calls. Tab payment now only updates payment-related fields (`paymentStatus`, `paidAt`, `paymentMethod`, `businessDate`).

### UI

- `components/features/admin/order-details-header.tsx` — Added labeled "Kitchen:" and "Payment:" badges
- `components/features/admin/order-card.tsx` — Added payment status badge next to kitchen status badge
- `components/features/kitchen/kitchen-order-card.tsx` — Added CheckCircle payment indicator for kitchen staff
- `app/(customer)/orders/page.tsx` — Added "Kitchen:" and "Payment:" labels to customer-facing badges

### Tests

- `__tests__/services/tab-service.payment-status-preservation.test.ts` — 6 unit tests
- `e2e/critical/tab-payment-no-status-reset.spec.ts` — 4 E2E tests (critical tier)

### Compliance

- SRS items: REQ-TABMGT-006, REQ-KITCHEN-007, REQ-ORDER-005, REQ-KITCHEN-008
- Risk register: R-008 (MITIGATED)
- ADR: No ADR needed
- Implementation plan: `compliance/plans/REQ-085/implementation-plan.md`

## Quality gates

| Gate                                       | Result                          |
| ------------------------------------------ | ------------------------------- |
| tsc --noEmit                               | 0 errors                        |
| semgrep                                    | 6 findings (at baseline, 0 new) |
| npm audit --audit-level=high               | 0 high/critical                 |
| vitest                                     | 1248 passed, 4 skipped          |
| playwright (REQ-085 spec)                  | 11 passed                       |
| playwright (regression: tab payment specs) | 13 passed, 20 skipped           |

## UAT verification

- [ ] Health check on UAT: https://wawagardenbar-app-uat.up.railway.app
- [ ] Smoke test: open tab, add orders, advance some to completed, close tab with payment
- [ ] Verify completed orders do not reappear on kitchen display
- [ ] Verify labeled "Kitchen:" and "Payment:" badges on order details page
- [ ] Verify payment badge on order queue
- [ ] Verify payment indicator on kitchen display
- [ ] Verify labeled badges on customer orders page

## Review policy

**HIGH risk** — A second human reviewer MUST approve before merge to main. Self-merge is NOT permitted.

## Sign-off

- **Developer:** Cascade (Windsurf) via sdlc-implementer
- **Reviewer (eng):** REPLACE — name + date
- **Reviewer (security):** N/A — no personal data or new security surfaces
- **Approved:** ☐
