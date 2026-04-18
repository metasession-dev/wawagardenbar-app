/**
 * @requirement REQ-028 - Group expense categories within each type for easier selection
 *
 * Pure unit tests for the display helpers that back the Add/Edit Expense
 * category dropdown and the Settings groups editor. No DB, no IO.
 */
import { describe, it, expect } from 'vitest';
import {
  sortCategoriesAlpha,
  buildDropdownSections,
  validateGroups,
  type CategoryGroup,
} from '@/lib/expense-categories-display';

describe('sortCategoriesAlpha', () => {
  it('sorts A→Z case-insensitively', () => {
    const input = ['beef', 'Apple', 'catfish', 'banana'];
    expect(sortCategoriesAlpha(input)).toEqual([
      'Apple',
      'banana',
      'beef',
      'catfish',
    ]);
  });

  it('is a pure function and does not mutate input', () => {
    const input = ['b', 'a'];
    const frozen = Object.freeze([...input]);
    expect(() => sortCategoriesAlpha(frozen as string[])).not.toThrow();
    expect(input).toEqual(['b', 'a']);
  });

  it('returns an empty array unchanged', () => {
    expect(sortCategoriesAlpha([])).toEqual([]);
  });
});

describe('buildDropdownSections', () => {
  const directCostCategories = [
    'Meat/Protein',
    'Beef',
    'Catfish',
    'Vegetables',
    'Cooking Oil',
    'Palm Oil',
    'Tomato',
  ];

  it('renders groups in saved order with items sorted alphabetically', () => {
    const groups: CategoryGroup[] = [
      { name: 'Proteins', categoryNames: ['Meat/Protein', 'Beef', 'Catfish'] },
      { name: 'Oils', categoryNames: ['Palm Oil', 'Cooking Oil'] },
    ];
    const sections = buildDropdownSections(directCostCategories, groups);
    expect(sections[0]).toEqual({
      heading: 'Proteins',
      items: ['Beef', 'Catfish', 'Meat/Protein'],
    });
    expect(sections[1]).toEqual({
      heading: 'Oils',
      items: ['Cooking Oil', 'Palm Oil'],
    });
  });

  it('adds Other section for ungrouped categories', () => {
    const groups: CategoryGroup[] = [
      { name: 'Proteins', categoryNames: ['Beef', 'Catfish'] },
    ];
    const sections = buildDropdownSections(directCostCategories, groups);
    const other = sections[sections.length - 1];
    expect(other.heading).toBe('Other');
    expect(other.items).toEqual([
      'Cooking Oil',
      'Meat/Protein',
      'Palm Oil',
      'Tomato',
      'Vegetables',
    ]);
  });

  it('omits Other when all categories are assigned', () => {
    const groups: CategoryGroup[] = [
      {
        name: 'All',
        categoryNames: [
          'Meat/Protein',
          'Beef',
          'Catfish',
          'Vegetables',
          'Cooking Oil',
          'Palm Oil',
          'Tomato',
        ],
      },
    ];
    const sections = buildDropdownSections(directCostCategories, groups);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('All');
    expect(sections.some((s) => s.heading === 'Other')).toBe(false);
  });

  it('returns single ungrouped A→Z section when no groups', () => {
    const sections = buildDropdownSections(directCostCategories, []);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBeNull();
    expect(sections[0].items).toEqual([
      'Beef',
      'Catfish',
      'Cooking Oil',
      'Meat/Protein',
      'Palm Oil',
      'Tomato',
      'Vegetables',
    ]);
  });

  it('silently drops stale categoryNames that are no longer in the flat list', () => {
    const groups: CategoryGroup[] = [
      {
        name: 'Proteins',
        categoryNames: ['Beef', 'Goat (removed)', 'Catfish'],
      },
    ];
    const sections = buildDropdownSections(directCostCategories, groups);
    expect(sections[0].items).toEqual(['Beef', 'Catfish']);
    // Stale name must not appear anywhere
    const allItems = sections.flatMap((s) => s.items);
    expect(allItems).not.toContain('Goat (removed)');
  });
});

describe('validateGroups', () => {
  const cats = ['A', 'B', 'C', 'D'];

  it('accepts empty groups array', () => {
    expect(validateGroups(cats, [])).toEqual({ ok: true });
  });

  it('accepts a valid configuration', () => {
    const groups: CategoryGroup[] = [
      { name: 'G1', categoryNames: ['A', 'B'] },
      { name: 'G2', categoryNames: ['C'] },
    ];
    expect(validateGroups(cats, groups)).toEqual({ ok: true });
  });

  it('rejects cross-group category membership', () => {
    const groups: CategoryGroup[] = [
      { name: 'G1', categoryNames: ['A', 'B'] },
      { name: 'G2', categoryNames: ['B', 'C'] },
    ];
    const result = validateGroups(cats, groups);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => /B.*two groups|duplicate/i.test(e))
      ).toBe(true);
    }
  });

  it('rejects duplicate group names case-insensitively', () => {
    const groups: CategoryGroup[] = [
      { name: 'Proteins', categoryNames: ['A'] },
      { name: 'proteins', categoryNames: ['B'] },
    ];
    const result = validateGroups(cats, groups);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /duplicate group name/i.test(e))).toBe(
        true
      );
    }
  });

  it('rejects blank group name', () => {
    const groups: CategoryGroup[] = [{ name: '   ', categoryNames: ['A'] }];
    const result = validateGroups(cats, groups);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /blank|empty/i.test(e))).toBe(true);
    }
  });

  it('rejects group member missing from category list', () => {
    const groups: CategoryGroup[] = [{ name: 'G1', categoryNames: ['A', 'Z'] }];
    const result = validateGroups(cats, groups);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /Z/.test(e))).toBe(true);
    }
  });
});
