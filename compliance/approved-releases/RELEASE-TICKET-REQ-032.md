# Release Ticket: REQ-032 — Create pending expense group from existing expenses

**Status:** APPROVED - DEPLOYED
**Date:** 2026-04-30
**Approved:** 2026-05-01 — META-COMPLY UAT release v2026.05.01
**Merged:** 2026-05-01 04:22:57 UTC — merge commit `609c963`
**Requirement ID:** REQ-032
**Risk Level:** MEDIUM (financial data, additive — no schema migration, source rows unchanged)
**Issue:** [#70](https://github.com/metasession-dev/wawagardenbar-app/issues/70)
**PR:** [#71](https://github.com/metasession-dev/wawagardenbar-app/pull/71) (merged)

---

## Summary

Add a multi-select / bulk-action flow on the Expenses page that lets an admin (or super-admin) duplicate one or more existing recorded `Expense` rows into a single new `PendingExpenseGroup` (status `pending`). The existing **Add Expense** dialog (`ExpenseForm`) is reused, opened pre-populated with one line item per selected expense. Source `Expense` rows are unchanged — the new group is a standalone copy with no back-link.

The driving use-case is recurring/regular bills (rent, utilities, fixed-supplier purchases): instead of retyping them, the admin selects last cycle's matching rows, confirms, and submits the new group for super-admin approval and transfer.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** Pure mapping helper + tests, two UI edits (expense list checkboxes, expenses-client bulk-action), one form-prop extension (ExpenseForm `prefill.items`), one E2E spec, all compliance artefacts
- **Human Reviewer of AI Code:** ostendo-io
- **Components Regenerated:** None — every change is a targeted edit
- **Prompt log:** `compliance/evidence/REQ-032/ai-prompts.md`

MEDIUM risk — single-reviewer policy (per Review Policy / Risk-Tiered).

---

## Implementation Details

**Files Created:**

- `lib/expense-to-line-item.ts` — `mapExpenseToLineItem(expense)` + `mapExpensesToLineItems(expenses[])` pure helpers
- `__tests__/lib/expense-to-line-item.test.ts` — unit tests for the mapping
- `e2e/finance/create-pending-from-expenses.spec.ts` — Playwright user journey

**Files Modified:**

- `components/features/finance/expense-form.tsx` — extend `prefill` interface to accept `items?: ExpenseFormValues['items']`; honour it in form `defaultValues` and in the open-effect reset
- `components/features/finance/expense-list.tsx` — add row checkboxes, controlled selection state via props, header "select all" checkbox
- `app/dashboard/finance/expenses/expenses-client.tsx` — track `selectedExpenseIds: Set<string>`, render bulk-action bar when non-empty, on click → map → open ExpenseForm with `prefill.items`, clear selection after dialog opens

**No new server action** — submission reuses `createPendingExpenseGroupAction`. Mapping happens client-side.

**No schema migration** — uses the existing `PendingExpenseGroup` shape introduced in REQ-026.

---

## Acceptance Criteria

(See `compliance/evidence/REQ-032/test-plan.md` for the canonical AC list and AC↔test mapping.)

---

## Test Plan

`compliance/evidence/REQ-032/test-plan.md`

---

## Quality Gates

- [ ] TypeScript: 0 errors (`tsc --noEmit`)
- [ ] Lint: 0 errors (`npm run lint`)
- [ ] Unit tests: new test file passes; existing suites still pass
- [ ] E2E: `e2e/finance/create-pending-from-expenses.spec.ts` passes
- [ ] Build: `npm run build` succeeds
- [ ] Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes for REQ-032

---

## Rollback Plan

Single-feature additive change. Rollback = revert the merge commit. No data migration; source expenses are unchanged so no recovery is needed for them. Pending groups created via the new flow are valid `PendingExpenseGroup` records and will continue to function under the existing approve/transfer flow if the rollback happens after some have been created.

---

## Post-Deploy Actions

- None. No environment variable changes, no migrations, no third-party config.

---

## Sign-off

- [ ] Implementation complete
- [ ] All quality gates pass on develop
- [ ] META-COMPLY UAT approval obtained
- [ ] PR merged to main
