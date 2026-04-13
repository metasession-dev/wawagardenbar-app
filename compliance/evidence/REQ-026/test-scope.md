# Test Scope — REQ-026

**Requirement:** REQ-026
**Issue:** #57
**Risk Level:** HIGH
**Date:** 2026-04-12

---

## Risk Classifications

HIGH — affects financial data integrity (expense ledger), enforces RBAC (super-admin-only approval and transfer), and introduces a multi-step workflow where bypassing a step would corrupt the ledger.

---

## Test Approach

- **Unit tests:** Service layer logic (status transitions, totalAmount calculation, fan-out to Expense on transfer, batch ID assignment)
- **E2E tests:** Full workflow through the UI (submit → pending page → approve → batch → transfer → ledger)
- **RBAC tests:** Verify admin cannot approve or transfer; super-admin can do all actions

---

## Acceptance Criteria

### AC-1: Multi-line item form

- [ ] Form shows date, expense type, category as a header section
- [ ] Below header: a table of line items each with description, quantity, unit, unit cost, total cost
- [ ] Total cost auto-calculates as quantity × unit cost; user can override manually
- [ ] User can add and remove line items; at least one line item is required
- [ ] "Save Expense" submits the group to pending queue and closes the form
- [ ] "Save & Add Another" submits to pending, then reopens the form with date/type/category pre-filled

### AC-2: Pending goes to pending queue, not live ledger

- [ ] After saving, the group does NOT appear in the live expenses list or financial reports
- [ ] The group appears on the pending expenses page with status `pending`

### AC-3: Pending expenses page

- [ ] Page is accessible to both admin and super-admin roles
- [ ] Shows all pending groups grouped as submitted (date, type, category, line items, total)
- [ ] Shows `pending`, `approved` status badges
- [ ] Transferred groups are NOT shown on the active view

### AC-4: Edit pending group (admin + super-admin)

- [ ] Admin can edit group header (date, type, category) and any line item
- [ ] Super-admin can edit group header and any line item
- [ ] Customer role cannot access the pending expenses page (redirected)

### AC-5: Approve (super-admin only)

- [ ] Super-admin can approve a `pending` group → status becomes `approved`
- [ ] Admin cannot approve (action returns 403 / button not visible)
- [ ] Approving a group that is already `approved` or `transferred` returns an error

### AC-6: Payment batching / regrouping

- [ ] Super-admin can select multiple approved groups and assign them to a payment batch
- [ ] Groups in a batch are visually grouped together on the pending page
- [ ] Each group retains its own `expenseType` and `category` after batching
- [ ] Groups can be removed from a batch (unassigned)

### AC-7: Transfer confirmation (super-admin only)

- [ ] Transfer Reference field is mandatory — form cannot submit without it
- [ ] Admin cannot confirm transfer (action returns 403 / button not visible)
- [ ] Confirming transfer on a batch: all groups in the batch are committed
- [ ] Each line item in each group becomes one `Expense` record in the live ledger with the group's date/type/category and the transfer reference as `receiptReference`
- [ ] After transfer: groups are removed from the active pending view
- [ ] After transfer: expenses appear in the live expense list and financial reports

### AC-8: Audit trail

- [ ] `submittedBy` + `submittedAt` set on creation
- [ ] `approvedBy` + `approvedAt` set on approval
- [ ] `transferredBy` + `transferredAt` + `transferReference` set on transfer
- [ ] `pendingGroupId` set on each `Expense` record created from the group (for traceability)

### AC-9: No regression

- [ ] Existing expenses in the live ledger are unaffected
- [ ] CSV import approval flow (`UploadedExpense`) is unaffected
- [ ] Financial reports still show correct totals from live expenses
