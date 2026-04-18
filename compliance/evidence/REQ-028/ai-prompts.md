# AI Prompts Log — REQ-028

**Requirement:** REQ-028
**Risk Level:** MEDIUM
**Date:** 2026-04-18

---

## Phase 1 — Planning

### Prompt 1: Issue creation

**Context:** User screenshots of Add Expense Type/Category dropdowns and Settings page. Request: group categories with a heading, alphabetised within each group, configurable from Settings, no subcategory field added to the expense record. Type dropdown behaviour must remain unchanged.
**Task:** Review codebase, propose a solution, and create a GitHub issue with implementation details.
**Output:** Issue #62 on metasession-dev/wawagardenbar-app

### Prompt 2: Implementation plan

**Context:** Issue #62 approved; proceed per the SDLC Stage 1 workflow for MEDIUM risk work.
**Task:** Produce `implementation-plan.md`, `test-scope.md`, `test-plan.md`, and `ai-use-note.md` under `compliance/evidence/REQ-028/`. Update `compliance/RTM.md` with a DRAFT row for REQ-028.
**Output:** Stage 1 artefacts committed in `07d1aef`.

---

## Phase 2 — Unit Tests (TDD)

### Prompt 3: Unit test authoring

**Context:** Red phase — tests written before implementation. Must fail against missing `lib/expense-categories-display.ts`.
**Task:** Write 14 unit tests for `sortCategoriesAlpha`, `buildDropdownSections`, `validateGroups`. Write 7 unit tests for `SystemSettingsService.getExpenseCategories` / `updateExpenseCategories` covering persistence round-trip, backward compat for docs missing the new group arrays, and validation failure paths.
**Output:** `__tests__/lib/expense-categories-display.test.ts`, `__tests__/services/system-settings-service.expense-categories.test.ts`

---

## Phase 3 — Implementation

### Prompt 4: Display helper

**Task:** Implement the three pure helpers with the contracts defined in the unit tests. Use locale-aware case-insensitive compare. Silently drop stale categoryNames in `buildDropdownSections` to avoid rendering broken items after an admin removes a category from the flat list.
**Output:** `lib/expense-categories-display.ts`

### Prompt 5: Interface + service

**Task:** Extend `ExpenseCategoriesSettings` type with `directCostGroups` and `operatingExpenseGroups`. In `SystemSettingsService.updateExpenseCategories`, validate via `validateGroups` before DB write and throw a descriptive error on failure. `getExpenseCategories` defaults missing group arrays to `[]` for backward compatibility.
**Output:** `interfaces/expense.interface.ts`, `services/system-settings-service.ts`

### Prompt 6: Settings editor

**Task:** Build the Groups UI inside `ExpenseCategoriesForm`: per-type "Add group" input, per-group rename + remove + chip-toggle assignment, "Ungrouped" preview. Use Zod `superRefine` to delegate validation to the shared `validateGroups` helper (client/server parity). Removing a category cascades — it must be stripped from any group it was in.
**Output:** `components/features/admin/expense-categories-form.tsx`

### Prompt 7: Grouped dropdown in expense forms

**Task:** Replace the flat `SelectContent` body in both `expense-form.tsx` (Add Expense) and `edit-expense-dialog.tsx` (Edit Expense) with sections rendered via `buildDropdownSections`. Use `SelectGroup` + `SelectLabel` for each section, `SelectSeparator` between adjacent sections. Edit dialog must now fetch live admin config (previously pinned to hardcoded fallback — pre-existing staleness bug).
**Output:** `components/features/finance/expense-form.tsx`, `components/features/finance/edit-expense-dialog.tsx`

---

## Phase 4 — E2E Tests

### Prompt 8: Playwright spec

**Task:** Cover Settings groups CRUD (create + assign, duplicate rejection) and Add/Edit Expense dropdown behaviour (Type switching, alphabetical items, preselection). Register as `expense-category-groups` project in `playwright.config.ts`. Tests must be defensive — skip gracefully when auth or live expense records aren't available.
**Output:** `e2e/expense-category-groups.spec.ts`, `playwright.config.ts`

---

## Phase 5 — Evidence Compilation

### Prompt 9: Stage 3 evidence

**Task:** Produce `test-execution-summary.md`, `security-summary.md`, update `RTM.md` status to TESTED - PENDING SIGN-OFF, create `compliance/pending-releases/RELEASE-TICKET-REQ-028.md`. Record UAT health-check results in `security-summary.md` after the develop push.
**Output:** Stage 3 artefacts committed in `27b5ad0` and `cc40142`.

---

## Notes

- All prompts followed the same working pattern: user review-checkpoint at each WAIT gate (implementation plan, test scope, test plan), TDD for unit tests (failing first), implementation proving tests green, E2E last.
- Prettier reformatted committed markdown on pre-commit. Commit messages use conventional-commit subject-case per `commitlint.config.mjs`.
