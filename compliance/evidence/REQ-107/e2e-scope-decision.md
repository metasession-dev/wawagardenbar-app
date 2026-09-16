---
req: REQ-107
generated_by: e2e-test-engineer
generated_at: 2026-09-16T15:00:00Z
e2e_required: true
spec_path: e2e/finance/cash-tags-and-edit.spec.ts
---

# E2E scope decision — REQ-107

## Outcome

**E2E required — covered.** This REQ fixes a UI-only bug (summary cards not recomputing from the filtered list) — the only way to actually prove the fix is a UI-level assertion that the displayed card value changes when a filter is applied. A unit test would only prove the arithmetic in isolation, not that the wiring between `ExpenseList`'s filter state and `expenses-client.tsx`'s summary cards is actually connected.

## Detail

- **`e2e_required`:** `true`.
- **Rationale:** N/A — covered above.
- **Spec path(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, same functional area as REQ-104/105/106).
- **ACs covered:** AC1 (filtering by expense type recomputes the Total Direct Costs / Total Expenses summary cards, not just the table). Verified by seeding one direct-cost and one operating-expense fixture record (`scripts/seed-e2e-fixtures.ts`), filtering to Operating Expense only, and asserting the Total Direct Costs card drops to ₦0.00 and the Total Expenses card's value changes.

## Local run

Ran against a local disposable `mongo:7` Docker container (matching CI's `e2e-regression.yml` setup exactly — not the UAT tunnel; no k8s secrets or port-forwards). Seeded via `scripts/seed-e2e-admins.ts`, `seed-food-menu.ts`, `seed-drinks-menu.ts`, `seed-inventory.ts`, `seed-e2e-fixtures.ts` (extended in this REQ to seed both expense types). 15/15 specs in the shared file pass with `--workers=1`.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
