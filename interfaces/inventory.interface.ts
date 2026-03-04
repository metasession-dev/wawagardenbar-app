import { Types } from 'mongoose';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type LocationType = 'store' | 'chiller-1' | 'chiller-2' | 'chiller-3' | 'other';

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
  createdAt: Date;
  updatedAt: Date;
}
