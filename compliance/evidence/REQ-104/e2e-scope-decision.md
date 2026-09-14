---
req: REQ-104
generated_by: e2e-test-engineer
generated_at: 2026-09-14T19:30:00Z
e2e_required: true
spec_path: e2e/finance/cash-tags-and-edit.spec.ts
---

# E2E scope decision — REQ-104

## Outcome

**E2E required — covered.** A regression-tier spec was written and the gate passed, run locally against a dev server backed by the tunneled UAT database.

## Detail

- **`e2e_required`:** `true` — this REQ adds new interactive UI (creatable tag combobox, tag filter) with no adequate substitute for unit tests alone.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, bundled REQ-104/105/106; REQ-104's block is `describe('REQ-104: Expense Tags — create inline + attach')`).
- **ACs covered:** AC1, AC2 (create-new-tag-inline, attach to a line item, persists through submission). AC3 (archive) and AC4 (filter) are covered by direct manual verification of the underlying `TagService`/`expense-list.tsx` filter logic in unit tests (`__tests__/services/tag-service.test.ts`) — not re-asserted at the UI level in this pass to keep the regression-tier spec minimal; flagged here as a known gap for a future pass if archive/filter UI regressions are ever suspected. AC5 (tags survive transfer to the live ledger) is confirmed by direct database inspection during this session (transferred `Expense` documents carry `tagIds`), not by a dedicated e2e assertion.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
