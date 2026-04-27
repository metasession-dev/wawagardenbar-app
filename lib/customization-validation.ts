/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Pure helpers for validating a customer- or staff-submitted customization
 * selection against a menu item's configured groups + options, and for
 * formatting selections into a human-readable summary string.
 *
 * Single source of truth: shared between the client-side picker (for the
 * disable-submit gate) and the three server-side actions that create or edit
 * orders (express, edit-order, public POST).
 */

export type SelectedCustomization = {
  name: string;
  option: string;
  price: number;
};

type OptionLike = {
  name: string;
};

type CustomizationLike = {
  name: string;
  options?: OptionLike[];
};

type MenuItemLike = {
  customizations?: CustomizationLike[];
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateSelectedCustomizations(
  menuItem: MenuItemLike,
  selected: SelectedCustomization[]
): ValidationResult {
  if (!selected || selected.length === 0) return { valid: true };

  const groups = menuItem.customizations ?? [];

  for (let i = 0; i < selected.length; i++) {
    const sel = selected[i];
    const group = groups.find((g) => g.name === sel.name);
    if (!group) {
      return {
        valid: false,
        error: `customizations[${i}]: unknown group "${sel.name}"`,
      };
    }
    const opts = group.options ?? [];
    const option = opts.find((o) => o.name === sel.option);
    if (!option) {
      return {
        valid: false,
        error: `customizations[${i}]: unknown option "${sel.option}" in group "${sel.name}"`,
      };
    }
  }

  return { valid: true };
}

export function summariseSelected(selected: SelectedCustomization[]): string {
  if (!selected || selected.length === 0) return '';
  return selected.map((s) => `${s.name}: ${s.option}`).join(' · ');
}
