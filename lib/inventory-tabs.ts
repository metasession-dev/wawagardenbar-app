/**
 * REQ-034 AC3 — Inventory dashboard tab helpers.
 *
 * Pure functions for splitting inventory rows by their `kind`
 * discriminator (added in AC1) into the two dashboard tabs.
 *
 * The route itself is gated by `requirePermission('inventoryManagement')`
 * via `app/dashboard/inventory/layout.tsx`, so only admin-side users
 * with that permission see either tab. There is no per-role visibility
 * branch — Kitchen access is granted through the separate
 * `kitchenManagement` permission on the kitchen sub-routes.
 */
import type { InventoryKind } from '@/interfaces/inventory.interface';

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
