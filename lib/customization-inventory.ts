/**
 * @requirement REQ-030 - Multi-component inventory deduction via customization option links
 *
 * Pure resolver that maps an order item's selected customizations back to the
 * menu item's configured inventory links. Used by the stock deduction / restore
 * paths in `services/inventory-service.ts` and kept framework-free so it can be
 * unit-tested without a Mongo connection.
 */

type OptionLike = {
  name: string;
  inventoryId?: unknown;
  inventoryDeduction?: unknown;
};

type CustomizationLike = {
  name: string;
  options?: OptionLike[];
};

type MenuItemLike = {
  customizations?: CustomizationLike[];
};

type SelectedCustomization = {
  name: string;
  option: string;
};

export type LinkedInventoryDeduction = {
  inventoryId: string;
  deductionPerUnit: number;
};

function coerceInventoryId(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw;
  if (
    raw &&
    typeof (raw as { toString?: () => string }).toString === 'function'
  ) {
    const s = (raw as { toString: () => string }).toString();
    if (s && s !== '[object Object]') return s;
  }
  return null;
}

export function resolveLinkedInventoryFor(
  menuItem: MenuItemLike,
  selected: SelectedCustomization[]
): LinkedInventoryDeduction[] {
  if (!menuItem?.customizations?.length) return [];
  if (!selected?.length) return [];

  const out: LinkedInventoryDeduction[] = [];

  for (const sel of selected) {
    const group = menuItem.customizations.find((c) => c.name === sel.name);
    if (!group?.options?.length) continue;

    const option = group.options.find((o) => o.name === sel.option);
    if (!option) continue;

    const inventoryId = coerceInventoryId(option.inventoryId);
    if (!inventoryId) continue;

    const rawDeduction = option.inventoryDeduction;
    const deductionPerUnit =
      typeof rawDeduction === 'number' &&
      Number.isFinite(rawDeduction) &&
      rawDeduction > 0
        ? rawDeduction
        : 1;

    out.push({ inventoryId, deductionPerUnit });
  }

  return out;
}
