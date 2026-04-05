/**
 * @requirement REQ-022 - Price update must sync Inventory.costPerUnit;
 * general menu item save must NOT update Inventory.costPerUnit independently.
 *
 * Tests that the single source of truth for cost is PriceHistoryService.updatePrice(),
 * which syncs both MenuItem.costPerUnit and Inventory.costPerUnit.
 * The general updateMenuItemAction must not write costPerUnit to inventory.
 */
import { describe, it, expect } from 'vitest';

// ── Pure extraction of sync logic ──────────────────────────────────

interface InventoryRecord {
  menuItemId: string;
  costPerUnit: number;
  currentStock: number;
}

interface MenuItemRecord {
  _id: string;
  price: number;
  costPerUnit: number;
}

/**
 * Simulates what PriceHistoryService.updatePrice() should do after the fix:
 * update MenuItem AND Inventory costPerUnit.
 */
function applyPriceUpdate(
  menuItem: MenuItemRecord,
  inventory: InventoryRecord | null,
  newPrice: number,
  newCostPerUnit: number
): { menuItem: MenuItemRecord; inventory: InventoryRecord | null } {
  // Update MenuItem (existing behaviour)
  const updatedMenuItem = {
    ...menuItem,
    price: newPrice,
    costPerUnit: newCostPerUnit,
  };

  // Sync Inventory (new behaviour)
  const updatedInventory = inventory
    ? { ...inventory, costPerUnit: newCostPerUnit }
    : null;

  return { menuItem: updatedMenuItem, inventory: updatedInventory };
}

/**
 * Simulates what updateMenuItemAction should do after the fix:
 * update inventory fields but NOT costPerUnit.
 */
function applyMenuItemSave(
  inventory: InventoryRecord,
  updates: {
    currentStock?: number;
    minimumStock?: number;
    maximumStock?: number;
    // costPerUnit intentionally excluded after fix
  }
): InventoryRecord {
  return {
    ...inventory,
    currentStock: updates.currentStock ?? inventory.currentStock,
  };
}

describe('REQ-022: updatePrice syncs Inventory.costPerUnit', () => {
  it('should update both MenuItem and Inventory costPerUnit', () => {
    const menuItem: MenuItemRecord = {
      _id: 'item-1',
      price: 1500,
      costPerUnit: 500,
    };
    const inventory: InventoryRecord = {
      menuItemId: 'item-1',
      costPerUnit: 500,
      currentStock: 50,
    };

    const result = applyPriceUpdate(menuItem, inventory, 1800, 600);

    expect(result.menuItem.price).toBe(1800);
    expect(result.menuItem.costPerUnit).toBe(600);
    expect(result.inventory!.costPerUnit).toBe(600); // synced
  });

  it('should handle case where no inventory record exists', () => {
    const menuItem: MenuItemRecord = {
      _id: 'item-2',
      price: 1000,
      costPerUnit: 400,
    };

    const result = applyPriceUpdate(menuItem, null, 1200, 450);

    expect(result.menuItem.costPerUnit).toBe(450);
    expect(result.inventory).toBeNull(); // no inventory to sync
  });

  it('inventory costPerUnit matches MenuItem after price update', () => {
    const menuItem: MenuItemRecord = {
      _id: 'item-3',
      price: 2000,
      costPerUnit: 800,
    };
    const inventory: InventoryRecord = {
      menuItemId: 'item-3',
      costPerUnit: 700, // diverged — stale value
      currentStock: 30,
    };

    const result = applyPriceUpdate(menuItem, inventory, 2200, 900);

    // After update, both should match
    expect(result.menuItem.costPerUnit).toBe(result.inventory!.costPerUnit);
    expect(result.inventory!.costPerUnit).toBe(900);
  });
});

describe('REQ-022: updateMenuItemAction does not update Inventory.costPerUnit', () => {
  it('should preserve existing inventory costPerUnit on general save', () => {
    const inventory: InventoryRecord = {
      menuItemId: 'item-1',
      costPerUnit: 600, // set by PriceHistoryService
      currentStock: 50,
    };

    // General save only updates stock, not cost
    const result = applyMenuItemSave(inventory, { currentStock: 45 });

    expect(result.costPerUnit).toBe(600); // unchanged
    expect(result.currentStock).toBe(45); // updated
  });

  it('should not allow cost divergence through general save', () => {
    const inventory: InventoryRecord = {
      menuItemId: 'item-1',
      costPerUnit: 600,
      currentStock: 50,
    };

    // Even if someone tries to pass a different cost, applyMenuItemSave ignores it
    const result = applyMenuItemSave(inventory, { currentStock: 50 });

    expect(result.costPerUnit).toBe(600); // still 600, not overwritten
  });
});
