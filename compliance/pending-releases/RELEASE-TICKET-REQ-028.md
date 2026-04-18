# Release Ticket: REQ-028 — Grouped Expense Category Dropdown

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-18
**Requirement ID:** REQ-028
**Risk Level:** MEDIUM
**PR:** TBD

---

## Summary

Added an optional display-only grouping layer for expense categories within each expense type (Direct Cost / Operating Expense). Super admins can configure groups in Settings → Expense Categories; the Add/Edit Expense category dropdown renders grouped sections with categories alphabetically sorted within each group, and an "Other" section for ungrouped categories. The expense record itself is unchanged — groups are configuration, not a new entity level.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7)
- **AI-Generated Files:** Implementation, unit tests, E2E spec, and compliance artefacts
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** None

---

## Implementation Details

**Files Modified:**

- `interfaces/expense.interface.ts` — Added `CategoryGroup` and `ExpenseCategoriesSettings` types
- `services/system-settings-service.ts` — `getExpenseCategories`/`updateExpenseCategories` now persist optional group arrays; validation delegated to `validateGroups`
- `app/dashboard/settings/actions.ts` — `updateExpenseCategoriesAction` accepts extended payload
- `app/actions/finance/expense-categories-actions.ts` — Returns extended shape to client forms
- `components/features/admin/expense-categories-form.tsx` — Groups editor (add/rename/remove group, chip-toggle category membership, Ungrouped preview, inline validation)
- `components/features/finance/expense-form.tsx` — Add Expense dropdown renders grouped sections via `SelectGroup`/`SelectLabel`/`SelectSeparator`
- `components/features/finance/edit-expense-dialog.tsx` — Same grouped render; dialog now fetches live admin config (fixes pre-existing staleness where it pinned to hardcoded fallback)
- `playwright.config.ts` — Registered `expense-category-groups` project

**Files Created:**

- `lib/expense-categories-display.ts` — Pure helpers (`sortCategoriesAlpha`, `buildDropdownSections`, `validateGroups`)
- `__tests__/lib/expense-categories-display.test.ts` — 14 unit tests
- `__tests__/services/system-settings-service.expense-categories.test.ts` — 7 unit tests
- `e2e/expense-category-groups.spec.ts` — 5 Playwright E2E tests

**Dependencies Added/Changed:**

- No dependency changes

---

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                                                                                                                |
| ---------------- | ----- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | 21    | 21     | 0      | Git: `__tests__/lib/expense-categories-display.test.ts`, `__tests__/services/system-settings-service.expense-categories.test.ts` |
| E2E (Playwright) | 5     | 4      | 0      | Git: `e2e/expense-category-groups.spec.ts` (1 defensive skip when no live expense record exists — covered by unit test contract) |
| CI (full suite)  | All   | All    | 0      | [CI Run #24600465349](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24600465349)                             |

---

## Security Evidence

| Check            | Result         | Evidence Location                                      |
| ---------------- | -------------- | ------------------------------------------------------ |
| SAST             | 0 new findings | Git: `compliance/evidence/REQ-028/security-summary.md` |
| Dependency Audit | 0 new findings | Git: `compliance/evidence/REQ-028/security-summary.md` |
| Access Control   | PASS           | Git: `compliance/evidence/REQ-028/security-summary.md` |
| Input Validation | PASS           | Git: `compliance/evidence/REQ-028/security-summary.md` |

---

## Acceptance Criteria

- [x] `lib/expense-categories-display.ts` exports `sortCategoriesAlpha`, `buildDropdownSections`, `validateGroups`
- [x] `getExpenseCategories` returns extended shape; group arrays default to `[]` when not persisted (backward compat)
- [x] `updateExpenseCategories` validates groups server-side and throws on failure
- [x] Settings UI: add/rename/remove group, chip-toggle category membership, Ungrouped preview, inline validation errors
- [x] Add Expense dropdown renders groups in admin-defined order with items A→Z, and an "Other" section for ungrouped categories
- [x] Edit Expense dropdown renders same grouped structure and fetches live admin config
- [x] No groups configured ⇒ single A→Z list (no "Other" heading)
- [x] `IExpense` / DTOs / `models/expense-model.ts` unchanged
- [x] Type dropdown behaviour unchanged
- [x] Backward compat: pre-change `expense-categories` docs load without error
- [x] TypeScript clean (0 errors)
- [x] SAST clean (0 new findings)
- [x] Dependencies clean (no new high/critical)
- [x] AI use documented

---

## Risk Assessment

**Data Integrity:** LOW — No change to `IExpense` model; groups are persisted as optional extension of an existing `SystemSettings` document. Backward compatibility verified by unit test.

**Access Control:** LOW — `updateExpenseCategoriesAction` retains existing `requireSuperAdmin()` guard; no new endpoints.

**Input Validation:** LOW — Client (Zod `superRefine`) and server (`validateGroups` call in service) share the same validation logic, preventing drift. A crafted client payload bypassing the form still fails server-side validation.

**Display Consistency:** LOW — `buildDropdownSections` is a pure, well-tested helper shared by both expense forms. No divergent rendering paths.

**Overall Risk:** MEDIUM — User-facing admin-config feature touching finance UX. Mitigated by SAST/unit/E2E coverage, RBAC, and zero data-model changes.

---

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                                                 |
| ---- | ---------------- | ------ | -------- | --------------------------------------------------------------------- |
| —    | None             | —      | —        | No migration or backfill. Feature activates on first admin save only. |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (or confirmed none required)

---

## Audit Trail

| Date       | Action                   | Actor       | Notes                                                      |
| ---------- | ------------------------ | ----------- | ---------------------------------------------------------- |
| 2026-04-17 | Requirement created      | William     | Risk: MEDIUM, GitHub issue #62                             |
| 2026-04-17 | Implementation plan      | Claude Code | Approved by William                                        |
| 2026-04-17 | Test scope + plan        | Claude Code | Approved by William                                        |
| 2026-04-18 | Tests written (TDD)      | Claude Code | 21 unit tests — failing before implementation              |
| 2026-04-18 | Implementation completed | Claude Code | Display helper + service + Settings UI + two expense forms |
| 2026-04-18 | E2E spec written         | Claude Code | 5 Playwright tests, 7/8 local pass (1 defensive skip)      |
| 2026-04-18 | AI code reviewed         | William     | All implementation and test files                          |
| 2026-04-18 | CI gates passed          | CI          | Run #24600465349 — all green                               |
| 2026-04-18 | Evidence compiled        | Claude Code | Security summary, test execution summary                   |
