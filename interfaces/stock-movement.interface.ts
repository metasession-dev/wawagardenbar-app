import { Types } from 'mongoose';

/**
 * Stock movement type
 */
export type StockMovementType = 'addition' | 'deduction' | 'adjustment';

/**
 * Stock movement category
 * REQ-034: 'production' is the category written when a kitchen
 * production batch deducts ingredients or adds yield to the target
 * menu item's inventory.
 */
export type StockMovementCategory =
  | 'sale'
  | 'restock'
  | 'waste'
  | 'damage'
  | 'adjustment'
  | 'transfer'
  | 'production'
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
  /** REQ-034: production batch this movement belongs to. */
  productionId?: Types.ObjectId;
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
