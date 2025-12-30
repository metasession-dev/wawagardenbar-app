import { Types } from 'mongoose';

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export type StockHistoryCategory = 'sale' | 'restock' | 'waste' | 'damage' | 'adjustment' | 'other';

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
  createdAt: Date;
  updatedAt: Date;
}
