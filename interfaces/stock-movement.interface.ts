import { Types } from 'mongoose';

/**
 * Stock movement type
 */
export type StockMovementType = 'addition' | 'deduction' | 'adjustment';

/**
 * Stock movement category
 */
export type StockMovementCategory =
  | 'sale'
  | 'restock'
  | 'waste'
  | 'damage'
  | 'adjustment'
  | 'transfer'
  | 'other';

/**
 * Stock Movement Interface
 * Normalized collection for tracking all inventory stock changes.
 * Replaces the embedded stockHistory array on Inventory documents.
 */
export interface IStockMovement {
  _id: Types.ObjectId;
  inventoryId: Types.ObjectId;
  quantity: number;
  type: StockMovementType;
  reason: string;
  performedBy: Types.ObjectId;
  timestamp: Date;
  category?: StockMovementCategory;
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
  createdAt: Date;
}
