# Test Scope — REQ-028

**Risk Level:** MEDIUM
**Requirement:** Group expense categories within each type for easier selection (configurable)
**GitHub Issue:** #62
**Date:** 2026-04-17

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass (full suite local, unauthenticated subset in CI)
- Human code review via PR

**Additional testing required by risk level:**

- [x] Pure-function unit tests for group validation and dropdown section building (edge cases: empty groups, ungrouped items, duplicate names, cross-group membership)
- [x] Persistence: extended `SystemSettings.value` round-trips groups and tolerates pre-existing documents without the new keys (backward compat)
- [x] Access control: only super-admin can modify group config (existing `requireSuperAdmin` on the server action — assert unchanged)
- [x] E2E: Settings CRUD flow for groups, then Add Expense dropdown renders grouped sections

## Validation Approach

How we confirm this meets the business requirement:

- Super-admin opens Settings → Expense Categories, creates a group "Proteins" under Direct Cost, assigns {Meat/Protein, Beef, Catfish, Cow Leg, Cow tail}, saves — toast success, no page reload needed.
- Super-admin opens Add Expense, selects Type = Direct Cost, opens Category dropdown → sees "Proteins" heading with Beef/Catfish/Cow Leg/Cow tail/Meat/Protein sorted A→Z, then "Other" heading with remaining unassigned categories also sorted A→Z.
- Super-admin opens Edit Expense on an existing record with `category = "Beef"` → dropdown preselects Beef, shows the same grouped structure.
- Switching Type to Operating Expense in Add Expense shows that type's groups (or its single A→Z list if none configured).
- Admin attempts to assign the same category to two groups within the same type → save rejected with a clear validation message; no DB write.
- Admin deletes a category that is currently in a group → category and its membership are removed atomically on save; dropdown reflects this on next open.
- An `expense-categories` document saved before this change (no `*Groups` keys) loads with empty group arrays and renders a single A→Z dropdown — no errors, no console warnings.
- Submitting an Add Expense with a category selected from a group persists `expenseType` + `category` exactly as before (no new fields on the expense record).

## Acceptance Criteria

- [ ] `lib/expense-categories-display.ts` exports `sortCategoriesAlpha`, `buildDropdownSections`, `validateGroups` with the contracts described in the implementation plan
- [ ] `SystemSettingsService.getExpenseCategories` returns `{ directCostCategories, operatingExpenseCategories, directCostGroups, operatingExpenseGroups }` with both group arrays defaulting to `[]` when not persisted
- [ ] `SystemSettingsService.updateExpenseCategories` validates groups (no duplicate category membership per type, no duplicate group names case-insensitive, no blank names, every categoryName in `categories` flat list) and throws on failure
- [ ] Settings → Expense Categories UI: add/rename/remove group, toggle category membership via chip picker, show "Ungrouped" readonly list, persist via server action
- [ ] Settings form surfaces validation errors inline (no silent failures)
- [ ] Add Expense dropdown renders `SelectGroup` per saved group in admin-defined order, items A→Z within each group, "Other" section at the end for ungrouped categories
- [ ] Edit Expense dropdown renders the same grouped structure and fetches live admin config (no longer pinned to static fallback)
- [ ] If no groups are defined for the selected type, dropdown renders a single A→Z list (no "Other" heading)
- [ ] `IExpense` / DTOs / `models/expense-model.ts` are unchanged (no subcategory field)
- [ ] Type dropdown behaviour (Direct Cost vs Operating Expense) unchanged
- [ ] Backward compat: `expense-categories` docs written before this change load without error
- [ ] All existing unit and E2E tests continue to pass (no regressions in expense creation, editing, reports, summaries)
