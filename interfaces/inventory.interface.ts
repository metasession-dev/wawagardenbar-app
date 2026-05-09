import { Types } from 'mongoose';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

/**
 * REQ-034: Inventory rows split by `kind`.
 *  - 'menu-item'         — sellable items shown on customer menus.
 *  - 'kitchen-ingredient' — raw ingredients consumed by recipes; never returned
 *                           by customer-menu queries.
 */
export type InventoryKind = 'menu-item' | 'kitchen-ingredient';

export const INVENTORY_KINDS: readonly InventoryKind[] = [
  'menu-item',
  'kitchen-ingredient',
] as const;

export type LocationType =
  | 'store'
  | 'chiller-1'
  | 'chiller-2'
  | 'chiller-3'
  | 'other';

export interface IInventoryLocation {
  location: LocationType | string;
  locationName?: string;
  currentStock: number;
  lastUpdated: Date;
  updatedBy?: Types.ObjectId;
  updatedByName?: string;
  notes?: string;
}

export interface IInventory {
  _id: Types.ObjectId;
  menuItemId: Types.ObjectId;
  /**
   * REQ-034: discriminates sellable items from kitchen ingredients.
   * Defaults to `'menu-item'` for legacy rows after the backfill script runs.
   */
  kind: InventoryKind;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  status: StockStatus;
  lastRestocked?: Date;
  autoReorderEnabled: boolean;
  reorderQuantity: number;
  supplier?: string;
  /** @deprecated Use MenuItemPriceHistory / InventoryItemCostHistory for canonical cost tracking. */
  costPerUnit: number;
  preventOrdersWhenOutOfStock: boolean;
  salesVelocity?: number;
  lastSaleDate?: Date;
  totalSales: number;
  totalWaste: number;
  totalRestocked: number;
  trackByLocation: boolean;
  locations: IInventoryLocation[];
  defaultReceivingLocation?: string;
  defaultSalesLocation?: string;
  crateSize?: number;
  packagingType?: string;
  createdAt: Date;
  updatedAt: Date;
}
