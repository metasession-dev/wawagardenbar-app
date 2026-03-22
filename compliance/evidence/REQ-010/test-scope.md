# Test Scope — REQ-010: Daily Report Payment Type Breakdown

**Requirement:** REQ-010
**GitHub Issue:** #4
**Risk Level:** MEDIUM (financial data display + AI-generated code)
**Date:** 2026-03-22

---

## Acceptance Criteria

### Payment Type Breakdown
- [ ] Daily report page shows payment type breakdown section
- [ ] Cash total displayed
- [ ] POS/Card total displayed
- [ ] Transfer total displayed
- [ ] Any other payment methods in use displayed
- [ ] Breakdown totals sum to the overall daily revenue total

### Data Accuracy
- [ ] Payment breakdown aggregates from orders with paymentStatus 'paid' only
- [ ] Breakdown respects the selected date filter
- [ ] Orders without a payment method are handled gracefully (e.g. shown as "unspecified")

### Access Control
- [ ] Payment breakdown only visible to admin/super-admin (existing page protection)

---

## Testing Approach (MEDIUM Risk)

### E2E Tests
- Daily report page route protection (existing — verify still passes)
- Payment breakdown section renders for authenticated admin

### Manual Verification
- Verify breakdown totals match individual order payment methods in database
- Verify date filter correctly scopes the aggregation
