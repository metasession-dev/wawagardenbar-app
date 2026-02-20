import { Types } from 'mongoose';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type StockHistoryCategory = 'sale' | 'restock' | 'waste' | 'damage' | 'adjustment' | 'transfer' | 'other';

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

export interface IStockHistory {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment';
  reason: string;
  performedBy: Types.ObjectId;
  timestamp: Date;
  category?: StockHistoryCategory;
  orderId?: Types.ObjectId;
  invoiceNumber?: string;
  supplier?: string;
  costPerUnit?: number;
  totalCost?: number;
  notes?: string;
  performedByName?: string;
  location?: string;
  fromLocation?: string;
  toLocation?: string;
  transferReference?: string;
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
  stockHistory: IStockHistory[];
  autoReorderEnabled: boolean;
  reorderQuantity: number;
  supplier?: string;
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
