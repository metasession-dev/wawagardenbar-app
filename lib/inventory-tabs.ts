/**
 * REQ-034 AC3 — Inventory dashboard tab helpers.
 *
 * Pure functions for splitting inventory rows by their `kind` discriminator
 * (added in AC1) into the two dashboard tabs, and gating tab visibility for
 * the new `kitchen` role.
 *
 * Lives in `lib/` so it can be shared between the server page (`getInventory`
 * kind filter) and the client component (`InventoryItemsClient` tab content)
 * without dragging React imports into a node-environment test file.
 */
import type { InventoryKind } from '@/interfaces/inventory.interface';
import type { UserRole } from '@/interfaces/user.interface';

export const INVENTORY_TABS = ['sellable', 'kitchen'] as const;
export type InventoryTab = (typeof INVENTORY_TABS)[number];

export const INVENTORY_TAB_TO_KIND: Record<InventoryTab, InventoryKind> = {
  sellable: 'menu-item',
  kitchen: 'kitchen-ingredient',
};

export function filterInventoryByTab<T extends { kind?: InventoryKind | null }>(
  items: readonly T[],
  tab: InventoryTab
): T[] {
  const targetKind = INVENTORY_TAB_TO_KIND[tab];
  return items.filter((item) => {
    // Treat a missing kind as 'menu-item' so legacy rows mid-backfill still
    // render under the Sellable tab rather than disappearing entirely.
    const effective: InventoryKind =
      item.kind === undefined || item.kind === null ? 'menu-item' : item.kind;
    return effective === targetKind;
  });
}

export function isInventoryTabVisibleForRole(
  tab: InventoryTab,
  role: UserRole | undefined
): boolean {
  if (tab === 'sellable') return true;
  // tab === 'kitchen'
  if (!role) return false;
  return role !== 'kitchen';
}
