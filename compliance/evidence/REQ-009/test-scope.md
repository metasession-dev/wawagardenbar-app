# Test Scope — REQ-009: Express Actions (Accelerated Admin Tab, Order & Close Flows)

**Requirement:** REQ-009
**GitHub Issue:** #2
**Risk Level:** HIGH (payments, RBAC, financial data + AI-generated code)
**Date:** 2026-03-21

---

## Acceptance Criteria

### Express Actions Section
- [ ] "Express Actions" section visible on `/dashboard/orders` above "Quick Actions"
- [ ] Three action buttons: Create a new Tab, Create a new Order, Close a Tab
- [ ] Section only visible to admin and super-admin roles

### Flow 1: Create a New Tab
- [ ] Shows existing open tabs so user can check for duplicates
- [ ] Allows continuing to create a new tab when no existing tab matches
- [ ] Collects only minimum required fields (customer name, table number)
- [ ] After creation, prompts: "Add an order to this tab?"
- [ ] "Yes" transitions to Create Order flow pre-linked to the new tab
- [ ] "No" returns to `/dashboard/orders`
- [ ] Entire flow uses minimum pages/steps

### Flow 2: Create a New Order
- [ ] Menu item selection with browse-all mode (flat list, no categories)
- [ ] Menu item selection with browse-by-category mode (category filter)
- [ ] Search box for keyword entry with instant filtering
- [ ] Select items with quantity (and portion size if applicable)
- [ ] Option to add order to an existing/just-created tab
- [ ] Option to checkout immediately with payment
- [ ] Payment methods: Cash, POS, Transfer
- [ ] Entire flow uses minimum pages/steps

### Flow 3: Close a Tab
- [ ] Shows list of open tabs
- [ ] Select tab shows summary (items, total)
- [ ] Confirm closure with payment method if balance outstanding
- [ ] Entire flow uses minimum pages/steps

### Security & Access Control
- [ ] All three flows require admin or super-admin authentication
- [ ] Unauthenticated users cannot access express action routes
- [ ] API endpoints enforce role-based access control server-side
- [ ] All tab/order/payment mutations are audit logged

### General
- [ ] All flows are completely new pages/components (not reusing customer-facing flows)
- [ ] All flows are optimised for speed (minimal clicks, minimal page transitions)

---

## Testing Approach (HIGH Risk)

### E2E Tests (Playwright)
- Route protection: unauthenticated users redirected from express action pages
- Express Actions section renders for admin/super-admin on `/dashboard/orders`
- Create Tab flow: end-to-end with existing tab check, creation, and order prompt
- Create Order flow: search, browse, item selection, add-to-tab and checkout paths
- Close Tab flow: select, summary, confirm, close
- Payment method selection for checkout and tab closure

### Access Control Verification
- Admin can access all three flows
- Super-admin can access all three flows
- Regular user (customer role) cannot access express action routes
- API endpoints reject unauthorised requests

### Audit Log Verification
- Tab creation logged
- Order creation logged
- Tab closure logged
- Payment transactions logged

### Security Testing
- SAST scan on all new files
- Input validation on all form fields (customer name, table number, quantities)
- No sensitive data exposed in client-side state
- Payment amounts validated server-side
