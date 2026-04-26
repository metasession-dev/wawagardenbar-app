/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Unit tests for the pure customization-validation helpers. Single source of
 * truth for the (groupName, optionName) pair check used by the customer-side
 * picker and by all three server-creating actions (express, edit, public POST).
 *
 * Mirrors REQ-029's lib/expense-search.ts pattern: one pure module shared
 * between client + server so behaviour cannot drift.
 */
import { describe, it, expect } from 'vitest';
import {
  validateSelectedCustomizations,
  summariseSelected,
  type SelectedCustomization,
} from '@/lib/customization-validation';

const POUNDO = {
  customizations: [
    {
      name: 'Soup',
      required: true,
      options: [
        { name: 'Ogbono', price: 0, available: true },
        { name: 'Egusi', price: 500, available: true },
      ],
    },
    {
      name: 'Extras',
      required: false,
      options: [
        { name: 'Plantain', price: 300, available: true },
        { name: 'Sauce', price: 100, available: true },
      ],
    },
  ],
};

const PLAIN_ITEM = {
  // legacy menu item with no customization groups
};

describe('REQ-031: validateSelectedCustomizations — happy paths', () => {
  it('accepts a single valid (group, option) pair (AC7 inverse, AC4)', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];
    expect(validateSelectedCustomizations(POUNDO, selected)).toEqual({
      valid: true,
    });
  });

  it('accepts multiple valid pairs across groups (AC6)', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
      { name: 'Extras', option: 'Plantain', price: 300 },
      { name: 'Extras', option: 'Sauce', price: 100 },
    ];
    expect(validateSelectedCustomizations(POUNDO, selected)).toEqual({
      valid: true,
    });
  });

  it('accepts empty selection on a menu item with only optional groups missing required ones', () => {
    // Note: required-group enforcement is the picker's job (AC1, isValid), not the
    // server validator's. The server only validates that what was submitted exists
    // on the menu item — it does not enforce that required groups have a selection.
    // This separation matches REQ-030's policy of silent skip at fulfilment.
    expect(validateSelectedCustomizations(POUNDO, [])).toEqual({
      valid: true,
    });
  });

  it('accepts selection on a menu item with no customization groups (legacy-safe, AC8)', () => {
    expect(validateSelectedCustomizations(PLAIN_ITEM, [])).toEqual({
      valid: true,
    });
  });
});

describe('REQ-031: validateSelectedCustomizations — rejects bad pairs (AC7)', () => {
  it('rejects an unknown group with a path-qualified error', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Sauce', option: 'Mayo', price: 0 },
    ];
    const result = validateSelectedCustomizations(POUNDO, selected);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/customizations\[0\]/);
    expect(result.error).toMatch(/Sauce/);
  });

  it('rejects an unknown option in a known group', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Pepper', price: 0 },
    ];
    const result = validateSelectedCustomizations(POUNDO, selected);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/customizations\[0\]/);
    expect(result.error).toMatch(/Pepper/);
  });

  it('rejects when the first pair is valid but a later pair is not (path index identifies offender)', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
      { name: 'Extras', option: 'Cheese', price: 0 },
    ];
    const result = validateSelectedCustomizations(POUNDO, selected);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/customizations\[1\]/);
    expect(result.error).toMatch(/Cheese/);
  });

  it('rejects any selection on a menu item that has no customization groups at all', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];
    const result = validateSelectedCustomizations(PLAIN_ITEM, selected);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/customizations\[0\]/);
  });

  it('does not leak unrelated menu-item internals in the error message', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Sauce', option: 'Mayo', price: 0 },
    ];
    const result = validateSelectedCustomizations(POUNDO, selected);
    // Error should name the offending group/option, not the valid ones
    expect(result.error).not.toMatch(/Egusi/);
    expect(result.error).not.toMatch(/Plantain/);
  });
});

describe('REQ-031: summariseSelected — human-readable cart/order labels', () => {
  it('formats a single selection as "Group: Option"', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    expect(summariseSelected(selected)).toBe('Soup: Egusi');
  });

  it('joins multiple selections with " · "', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
      { name: 'Drink', option: 'Coke', price: 200 },
    ];
    expect(summariseSelected(selected)).toBe('Soup: Egusi · Drink: Coke');
  });

  it('returns empty string when no selections', () => {
    expect(summariseSelected([])).toBe('');
  });

  it('preserves selection order so multi-extras render predictably', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Extras', option: 'Plantain', price: 300 },
      { name: 'Extras', option: 'Sauce', price: 100 },
    ];
    expect(summariseSelected(selected)).toBe(
      'Extras: Plantain · Extras: Sauce'
    );
  });
});
