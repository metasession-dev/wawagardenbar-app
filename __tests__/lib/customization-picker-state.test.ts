/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure-helper tests for the customization picker's state logic. The React
 * shell component delegates to these helpers, so behaviour can be verified
 * here without a DOM. Visible-UI rendering is verified in
 * e2e/menu-customization-picker.spec.ts.
 *
 * derivePickerState — gates the host's submit button (AC1, AC4, AC6).
 * toggleOption     — implements radio (replace) vs checkbox (add/remove)
 *                    semantics for required vs optional groups (D2).
 */
import { describe, it, expect } from 'vitest';
import {
  derivePickerState,
  toggleOption,
} from '@/lib/customization-picker-state';
import type { SelectedCustomization } from '@/lib/customization-validation';
import type { ICustomization } from '@/interfaces/menu-item.interface';

const SOUP_REQUIRED: ICustomization = {
  name: 'Soup',
  required: true,
  options: [
    { name: 'Ogbono', price: 0, available: true },
    { name: 'Egusi', price: 500, available: true },
  ],
};

const EXTRAS_OPTIONAL: ICustomization = {
  name: 'Extras',
  required: false,
  options: [
    { name: 'Plantain', price: 300, available: true },
    { name: 'Sauce', price: 100, available: true },
  ],
};

const DRINK_REQUIRED: ICustomization = {
  name: 'Drink',
  required: true,
  options: [
    { name: 'Coke', price: 200, available: true },
    { name: 'Fanta', price: 200, available: true },
  ],
};

describe('REQ-031: derivePickerState', () => {
  it('isValid=true when there are no groups (legacy menu item, AC8)', () => {
    expect(derivePickerState({ groups: [], selected: [] })).toEqual({
      isValid: true,
      missingRequiredGroups: [],
    });
  });

  it('isValid=false when a required group has no selection (AC1)', () => {
    expect(
      derivePickerState({ groups: [SOUP_REQUIRED], selected: [] })
    ).toEqual({
      isValid: false,
      missingRequiredGroups: ['Soup'],
    });
  });

  it('isValid=true when a required group has a selection (AC4)', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];
    expect(derivePickerState({ groups: [SOUP_REQUIRED], selected })).toEqual({
      isValid: true,
      missingRequiredGroups: [],
    });
  });

  it('lists only the missing required groups when partially covered', () => {
    const selected: SelectedCustomization[] = [
      { name: 'Soup', option: 'Egusi', price: 500 },
    ];
    expect(
      derivePickerState({
        groups: [SOUP_REQUIRED, DRINK_REQUIRED],
        selected,
      })
    ).toEqual({
      isValid: false,
      missingRequiredGroups: ['Drink'],
    });
  });

  it('isValid=true when an optional group has no selection (AC6)', () => {
    expect(
      derivePickerState({ groups: [EXTRAS_OPTIONAL], selected: [] })
    ).toEqual({
      isValid: true,
      missingRequiredGroups: [],
    });
  });
});

describe('REQ-031: toggleOption — required group (radio semantics)', () => {
  it('selecting an option in an empty required group adds the selection', () => {
    const result = toggleOption([], 'Soup', 'Ogbono', 0, true);
    expect(result).toEqual([{ name: 'Soup', option: 'Ogbono', price: 0 }]);
  });

  it('selecting a different option in a required group REPLACES the existing selection', () => {
    const before: SelectedCustomization[] = [
      { name: 'Soup', option: 'Ogbono', price: 0 },
    ];
    const after = toggleOption(before, 'Soup', 'Egusi', 500, true);
    expect(after).toEqual([{ name: 'Soup', option: 'Egusi', price: 500 }]);
    // Confirm only one Soup entry exists (no append duplicate)
    expect(after.filter((s) => s.name === 'Soup')).toHaveLength(1);
  });

  it('selecting in a required group does not affect other groups', () => {
    const before: SelectedCustomization[] = [
      { name: 'Drink', option: 'Coke', price: 200 },
    ];
    const after = toggleOption(before, 'Soup', 'Egusi', 500, true);
    expect(after).toEqual([
      { name: 'Drink', option: 'Coke', price: 200 },
      { name: 'Soup', option: 'Egusi', price: 500 },
    ]);
  });
});

describe('REQ-031: toggleOption — optional group (checkbox semantics)', () => {
  it('selecting an option in an optional group ADDS the selection', () => {
    const result = toggleOption([], 'Extras', 'Plantain', 300, false);
    expect(result).toEqual([
      { name: 'Extras', option: 'Plantain', price: 300 },
    ]);
  });

  it('selecting a second option in an optional group ADDS without replacing', () => {
    const before: SelectedCustomization[] = [
      { name: 'Extras', option: 'Plantain', price: 300 },
    ];
    const after = toggleOption(before, 'Extras', 'Sauce', 100, false);
    expect(after).toEqual([
      { name: 'Extras', option: 'Plantain', price: 300 },
      { name: 'Extras', option: 'Sauce', price: 100 },
    ]);
  });

  it('re-selecting an already-selected option in an optional group REMOVES it', () => {
    const before: SelectedCustomization[] = [
      { name: 'Extras', option: 'Plantain', price: 300 },
      { name: 'Extras', option: 'Sauce', price: 100 },
    ];
    const after = toggleOption(before, 'Extras', 'Plantain', 300, false);
    expect(after).toEqual([{ name: 'Extras', option: 'Sauce', price: 100 }]);
  });
});
