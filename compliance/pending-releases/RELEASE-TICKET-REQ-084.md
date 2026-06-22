# Release Ticket: REQ-084 — Separate customer and admin checkout paths; extend Express Create Order

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-22
**Requirement ID:** REQ-084
**Risk Level:** MEDIUM
**PR:** N/A — direct push to develop (05b7404)
---

## Summary

Separates customer and admin checkout paths. Strips admin logic from customer checkout (renamed to `customer-checkout-form.tsx`), extends Express Create Order with order type selector (dine-in, pickup, delivery, pay-now), creates `AdminTabCheckoutForm` for manual tab payment, and removes admin price override logic from `createOrder` server action.

## AI Involvement

- **AI Tool Used:** Cascade (Windsurf)
- **AI-Generated Files:** `components/features/checkout/customer-checkout-form.tsx` (refactored), `app/dashboard/orders/express/create-order/page.tsx` (extended), `components/features/tabs/admin-tab-checkout-form.tsx` (new), `app/actions/admin/express-actions.ts` (modified)
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** none

## Implementation Details

**Files Modified:**

- `components/features/checkout/checkout-form.tsx` → `customer-checkout-form.tsx` — stripped admin logic (AdminCheckoutIndicator, AdminPaymentOption, price overrides, useAdminFullCheckout)
- `app/actions/payment/payment-actions.ts` — removed admin price override validation from `createOrder`
- `app/dashboard/orders/express/create-order/page.tsx` — added order type selector with conditional fields (pickup time, delivery address, customer info)
- `app/actions/admin/express-actions.ts` — extended `expressCreateOrderAction` with orderType, customerInfo, deliveryInfo, pickupTime + SettingsService.calculateOrderTotals
- `components/features/tabs/admin-tab-checkout-form.tsx` — new component for manual tab payment (no Monnify redirect)
- `app/dashboard/orders/tabs/[tabId]/checkout/page.tsx` — renders AdminTabCheckoutForm instead of redirecting

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                  |
| ---------------- | ----- | ------ | ------ | ---------------------------------- |
| Unit             | 7     | 7      | 0      | CI: npm test                       |
| E2E (Playwright) | TBD   | TBD    | TBD    | DevAudit portal: wawagardenbar-app/REQ-084 |

## Security Evidence

| Check            | Result          | Evidence Location                          |
| ---------------- | --------------- | ------------------------------------------ |
| SAST             | 0 high/critical | DevAudit portal: wawagardenbar-app/REQ-084 |
| Dependency Audit | 0 high/critical | DevAudit portal: wawagardenbar-app/REQ-084 |
| Access Control   | N/A             | Git: `compliance/evidence/REQ-084/security-summary.md` |
| Audit Log        | PASS            | Git: `compliance/evidence/REQ-084/security-summary.md` |

## Acceptance Criteria

- [x] AC1 — "Continue as Guest" banner visible for unauthenticated users on `/checkout`
- [ ] AC2 — Guest checkout submission creates order without auth
- [ ] AC3 — Only Monnify gateway options shown on customer checkout (no manual cash/transfer/card)
- [ ] AC4 — Express create order: pickup time field appears and required when Pickup selected
- [ ] AC5 — Express create order: delivery address fields appear and required when Delivery selected
- [x] AC6 — `SettingsService.calculateOrderTotals` called with correct orderType for delivery
- [ ] AC7 — Admin tab checkout renders AdminTabCheckoutForm with manual payment — no redirect
- [x] AC8 — No admin price override logic in `createOrder`
- [x] AC9 — No `isAdmin` branching in customer checkout component
- [ ] AC10 — Express create order: customer info fields appear and required for pickup/delivery
- [ ] AC11 — Admin tab checkout: no Monnify URL returned; tab closed successfully
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- MEDIUM risk — user-facing checkout flow separation, touches payment-adjacent logic
- No DB schema changes, no migration required
- No new dependencies

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes |
| ---- | ---------------- | ------ | -------- | ----- |
| —    | None             | —      | —        | No post-deploy actions required |

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (none required)

---

## Audit Trail

| Date       | Action                   | Actor   | Notes                                    |
| ---------- | ------------------------ | ------- | ---------------------------------------- |
| 2026-06-22 | Requirement created      | William | Risk: MEDIUM                             |
| 2026-06-22 | Implementation completed | Cascade | Direct push to develop (05b7404)         |
| 2026-06-22 | AI code reviewed         | William | checkout-form, express-actions, tab-form |
| 2026-06-22 | Unit tests passed        | CI      | 7/7                                      |
| 2026-06-22 | UAT verification passed  | William | Health check 200, checkout 200, express 307 |
| TBD        | E2E tests passed         | CI      | Pending                                  |
| TBD        | Submitted for review     | William | PR to main pending UAT                   |
