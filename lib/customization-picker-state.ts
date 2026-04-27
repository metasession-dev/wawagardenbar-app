/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure helpers for the customization picker's state. The React shell component
 * (components/features/menu/customization-picker.tsx) holds no logic of its
 * own; it delegates to these helpers and renders the result.
 *
 * derivePickerState — computes whether the picker is valid (every required
 *                     group has a selection) and which required groups are
 *                     still missing. Hosts use isValid to gate their submit
 *                     button (AC1).
 *
 * toggleOption       — radio (replace) or checkbox (add/remove) semantics
 *                     based on group.required (D2).
 */

import type { ICustomization } from '@/interfaces/menu-item.interface';
import type { SelectedCustomization } from './customization-validation';

export type PickerState = {
  isValid: boolean;
  missingRequiredGroups: string[];
};

export function derivePickerState({
  groups,
  selected,
}: {
  groups: ICustomization[];
  selected: SelectedCustomization[];
}): PickerState {
  const missing: string[] = [];
  for (const group of groups) {
    if (!group.required) continue;
    const hasSelection = selected.some((s) => s.name === group.name);
    if (!hasSelection) missing.push(group.name);
  }
  return {
    isValid: missing.length === 0,
    missingRequiredGroups: missing,
  };
}

export function toggleOption(
  selected: SelectedCustomization[],
  groupName: string,
  optionName: string,
  optionPrice: number,
  groupRequired: boolean
): SelectedCustomization[] {
  if (groupRequired) {
    // Radio semantics: replace any existing selection in this group.
    const withoutGroup = selected.filter((s) => s.name !== groupName);
    return [
      ...withoutGroup,
      { name: groupName, option: optionName, price: optionPrice },
    ];
  }

  // Checkbox semantics: toggle this specific (group, option) pair.
  const existingIndex = selected.findIndex(
    (s) => s.name === groupName && s.option === optionName
  );
  if (existingIndex >= 0) {
    return selected.filter((_, i) => i !== existingIndex);
  }
  return [
    ...selected,
    { name: groupName, option: optionName, price: optionPrice },
  ];
}
