# Implementation Plan — REQ-028

**Requirement:** REQ-028
**GitHub Issue:** #62
**Risk Level:** MEDIUM
**Date:** 2026-04-17

## Approach

Add an optional display-only grouping layer to expense categories within each type. Storage extends the existing `SystemSettings` `expense-categories` document (no schema migration — `value` is `Schema.Types.Mixed`). The Expense data model is untouched: each expense still stores only `expenseType` + `category` (string). Groups are rendered in the Add/Edit Expense Category dropdown as `SelectGroup`/`SelectLabel` with categories sorted alphabetically within each group; categories not in any group fall through to a final "Other" heading (or to a single alphabetical list when no groups exist).

Type dropdown behaviour is unchanged — groups live within each type's category list.

## Files to Create

- `lib/expense-categories-display.ts` — pure helpers used by both the server and the client:
  - `sortCategoriesAlpha(names: string[]): string[]` — locale-aware A→Z sort
  - `buildDropdownSections(categories: string[], groups: CategoryGroup[]): Array<{ heading: string | null, items: string[] }>` — returns ordered sections: one per admin-defined group (in saved order), then an "Other" section for ungrouped categories. If `groups` is empty, returns a single `{ heading: null, items: alphaSorted }` section.
  - `validateGroups(categories: string[], groups: CategoryGroup[]): { ok: true } | { ok: false, errors: string[] }` — checks: every `categoryNames[i]` exists in `categories`; no category appears in two groups; no duplicate group names (case-insensitive); no blank group names.
- `__tests__/lib/expense-categories-display.test.ts` — unit tests for the three helpers above.
- `e2e/features/expense-category-groups.feature` + step defs (or Playwright test) — E2E covering Settings CRUD and dropdown render.

## Files to Modify

- `interfaces/expense.interface.ts`
  - Add `export interface CategoryGroup { name: string; categoryNames: string[] }`
  - Add `export interface ExpenseCategoriesSettings { directCostCategories: string[]; operatingExpenseCategories: string[]; directCostGroups: CategoryGroup[]; operatingExpenseGroups: CategoryGroup[] }`

- `services/system-settings-service.ts`
  - `getExpenseCategories()` return type widened to `ExpenseCategoriesSettings`; defaults include `directCostGroups: []`, `operatingExpenseGroups: []`. Spread persisted value last, then normalise so groups are always arrays.
  - `updateExpenseCategories(categories: ExpenseCategoriesSettings, adminUserId)` — run `validateGroups` for each type; throw with a human-readable message on failure. Persist the full extended shape.

- `app/dashboard/settings/actions.ts`
  - `updateExpenseCategoriesAction` signature updated to the extended payload. No auth changes (still super-admin).

- `app/actions/finance/expense-categories-actions.ts`
  - Return the extended object (groups included). Fallback `categories` shape in the error branch updated to include empty group arrays.

- `components/features/admin/expense-categories-form.tsx`
  - Extend Zod schema with `directCostGroups`, `operatingExpenseGroups` (array of `{ name: min(1), categoryNames: array(string.min(1)) }`), plus a `.superRefine` calling `validateGroups` per type.
  - Under each existing category section, add a **Groups** block:
    - "Add group" input + button → appends an empty group
    - Per group row: editable name, remove button, and a category chip picker (shows all categories for that type; clicking a chip toggles membership in the group; chips already in _another_ group of the same type are disabled with a tooltip naming that group)
    - An "Ungrouped" readonly chip list at the bottom showing categories not in any group
  - Submitting calls the updated server action. Toast messages unchanged on success; surface validation errors inline.

- `components/features/finance/expense-form.tsx`
  - Replace the flat `SelectContent` body (lines 342–347) with sections rendered via `buildDropdownSections`. Sections with a heading render `<SelectGroup><SelectLabel>{heading}</SelectLabel>…items…</SelectGroup>`; a headingless section renders items directly. When multiple sections exist and a section has items, insert `<SelectSeparator />` between groups for visual clarity.
  - State: add `directCostGroups` / `operatingExpenseGroups` (default `[]`) populated by `fetchCategories()` from the extended payload. `getItemCategories` now returns `{ categories, groups }` for the selected type.

- `components/features/finance/edit-expense-dialog.tsx`
  - Same dropdown change. The dialog currently imports only the static fallback arrays (lines 50–52); add a `useEffect` + `fetchCategories()` mirroring `expense-form.tsx` so Edit respects the latest admin config (small scope creep — necessary for consistency and called out so it doesn't surprise reviewers).

- `components/ui/select.tsx` — no changes; `SelectGroup`, `SelectLabel`, `SelectSeparator` already exported.

## Architecture Decisions

- **Display-only grouping, not a data-model change.** `IExpense.category` remains a plain string. Groups are config, not a foreign-key relationship. This keeps reports, aggregates, and historic records untouched and avoids any migration.
- **Extend the existing SystemSettings value** rather than introducing a new `key`. Single source of truth per concern, one upsert per admin save, existing `changeHistory` still captures the full before/after shape.
- **Group order = admin save order** (array order), not alphabetical by group name. Drag-to-reorder deferred (noted in issue open questions). Admins who want a specific order can recreate groups in that order for now.
- **"Other" heading** at the end captures any category in the flat list not assigned to a group. Prevents data loss when an admin adds a category but forgets to put it in a group.
- **Case-insensitive duplicate group-name check** to match how restaurant staff will perceive duplicates ("Proteins" vs "proteins").
- **No Settings UI for toggling on/off.** The prior plan mentioned toggles; the user clarified they want grouping as a first-class config, not a feature flag. If no groups are defined for a type, the dropdown renders a single alphabetical list — this is the "off" state implicitly.
- **`edit-expense-dialog.tsx` starts fetching live categories.** Today it relies solely on the hardcoded interface fallbacks. This is a pre-existing bug (admin changes aren't reflected in Edit); fixing it here is cheap and required for the feature to behave consistently across create and edit.

## Dependencies

- Shadcn `SelectGroup`, `SelectLabel`, `SelectSeparator` — already available.
- No new npm packages.

## Risks / Considerations

- **Validation on the client must mirror the service-side check** to give users fast feedback. Both call the same `validateGroups` helper (single source of truth) — mitigates drift.
- **Large category lists** (Direct Cost has ~35 items in the screenshots). The chip picker in Settings must handle this gracefully — we'll use `flex flex-wrap gap-2` consistent with the existing Badge display; no virtualisation required at this size.
- **Stale data after save**: `updateExpenseCategoriesAction` already `revalidatePath('/dashboard/finance/expenses')` — the Add/Edit forms fetch categories on dialog open, so next open picks up fresh config.
- **Backward compat for existing saved docs**: docs written before this change won't have the group keys. `getExpenseCategories()` defaults them to `[]` so the UI renders the pre-existing alphabetical fallback. Verified by unit test.
- **No subcategory on Expense records** — confirmed by not touching `models/expense-model.ts`, DTOs, filters, or summary aggregations.

## Post-Deploy Actions

- None. No migration, no backfill. The first time an admin saves groups, the `changeHistory` entry captures the new shape.
