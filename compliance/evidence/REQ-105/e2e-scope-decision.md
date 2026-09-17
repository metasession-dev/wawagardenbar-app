---
req: REQ-105
generated_by: e2e-test-engineer
generated_at: 2026-09-14T19:30:00Z
e2e_required: true
spec_path: e2e/finance/cash-tags-and-edit.spec.ts
---

# E2E scope decision — REQ-105

## Outcome

**E2E required — covered.** A regression-tier spec was written and the gate passed, run locally against a dev server backed by the tunneled UAT database.

## Detail

- **`e2e_required`:** `true` — this REQ surfaces previously-hidden form fields in an existing dialog; a UI-level assertion is the most direct proof they actually render and persist.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, bundled REQ-104/105/106; REQ-105's block is `describe('REQ-105: Expense edit dialog — full field visibility')`).
- **ACs covered:** AC1 (transactionFee/receiptReference/referenceNumber editable and saved), AC3 (read-only audit block visible). AC2 (REQ-034 inventory-link reversal/reapply firing correctly through this dialog) is covered by the pre-existing `expense-inventory-link.*.test.ts` unit suite, which this REQ's diff does not touch — not re-verified at the e2e level since no backend logic changed. AC4 (non-super-admin has no edit access) is pre-existing, unchanged behaviour, already implicitly covered by the dialog's gate never being reachable in the admin-role test paths elsewhere in this suite.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
