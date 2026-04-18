/**
 * @requirement REQ-028 - Group expense categories within each type for easier selection
 *
 * Display-only helpers that back:
 *   - the Add/Edit Expense category dropdown (grouped, alphabetical),
 *   - the Settings → Expense Categories groups editor validation.
 *
 * Groups are configuration, not an entity on the expense record — IExpense.category
 * remains a plain string. These helpers operate on the flat category list plus an
 * optional ordered list of groups.
 */

export interface CategoryGroup {
  name: string;
  categoryNames: string[];
}

export interface DropdownSection {
  heading: string | null;
  items: string[];
}

/**
 * Locale-aware A→Z sort, case-insensitive. Pure — does not mutate input.
 */
export function sortCategoriesAlpha(names: readonly string[]): string[] {
  return [...names].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

/**
 * Build the ordered sections rendered in the category dropdown.
 *
 * - One section per admin-defined group, in the saved order, with items sorted A→Z.
 * - Stale categoryNames (no longer in the flat list) are silently dropped.
 * - Categories in the flat list that are not assigned to any group appear under
 *   a trailing "Other" section (also A→Z). Omitted when every category is grouped.
 * - If `groups` is empty, returns a single `{ heading: null, items: alphaSorted }`.
 */
export function buildDropdownSections(
  categories: readonly string[],
  groups: readonly CategoryGroup[]
): DropdownSection[] {
  if (groups.length === 0) {
    return [{ heading: null, items: sortCategoriesAlpha(categories) }];
  }

  const categorySet = new Set(categories);
  const assigned = new Set<string>();
  const sections: DropdownSection[] = [];

  for (const group of groups) {
    const items = sortCategoriesAlpha(
      group.categoryNames.filter((name) => categorySet.has(name))
    );
    for (const name of items) assigned.add(name);
    sections.push({ heading: group.name, items });
  }

  const ungrouped = sortCategoriesAlpha(
    categories.filter((name) => !assigned.has(name))
  );
  if (ungrouped.length > 0) {
    sections.push({ heading: 'Other', items: ungrouped });
  }

  return sections;
}

export type GroupValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

/**
 * Validate group configuration for a single expense type.
 *
 * Enforces: no blank group names; no duplicate group names (case-insensitive);
 * no category assigned to more than one group; every categoryName exists in the
 * flat category list.
 */
export function validateGroups(
  categories: readonly string[],
  groups: readonly CategoryGroup[]
): GroupValidationResult {
  const errors: string[] = [];
  const categorySet = new Set(categories);
  const seenGroupNames = new Set<string>();
  const seenCategoryMembership = new Map<string, string>();

  for (const group of groups) {
    const trimmed = group.name.trim();
    if (trimmed.length === 0) {
      errors.push('Group name cannot be blank or empty.');
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seenGroupNames.has(key)) {
      errors.push(`Duplicate group name: "${trimmed}".`);
    } else {
      seenGroupNames.add(key);
    }

    for (const categoryName of group.categoryNames) {
      if (!categorySet.has(categoryName)) {
        errors.push(
          `Group "${trimmed}" references category "${categoryName}" which is not in the category list.`
        );
        continue;
      }

      const existingGroup = seenCategoryMembership.get(categoryName);
      if (existingGroup && existingGroup !== trimmed) {
        errors.push(
          `Category "${categoryName}" is assigned to two groups ("${existingGroup}" and "${trimmed}"). A category can only belong to one group.`
        );
      } else {
        seenCategoryMembership.set(categoryName, trimmed);
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
