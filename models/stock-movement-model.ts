import mongoose, { Schema, Model } from 'mongoose';
import {
  IStockMovement,
  StockMovementType,
  StockMovementCategory,
} from '../interfaces/stock-movement.interface';

const stockMovementSchema = new Schema<IStockMovement>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    type: {
      type: String,
      enum: ['addition', 'deduction', 'adjustment'] as StockMovementType[],
      required: true,
    },
    reason: { type: String, required: true },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: { type: Date, default: Date.now, required: true },
    category: {
      type: String,
      enum: [
        'sale',
        'restock',
        'waste',
        'damage',
        'adjustment',
        'transfer',
        'other',
      ] as StockMovementCategory[],
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    invoiceNumber: { type: String },
    supplier: { type: String },
    costPerUnit: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    notes: { type: String },
    performedByName: { type: String },
    location: { type: String },
    fromLocation: { type: String },
    toLocation: { type: String },
    transferReference: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Primary query pattern: movements for an inventory item, sorted by time
stockMovementSchema.index({ inventoryId: 1, timestamp: -1 });
// Cross-inventory analytics by category
stockMovementSchema.index({ category: 1, timestamp: -1 });
// Order-based lookups (deductions/restorations for a specific order)
stockMovementSchema.index({ orderId: 1 });
// Location-based queries
stockMovementSchema.index({ inventoryId: 1, location: 1, timestamp: -1 });

const StockMovementModel: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);

export default StockMovementModel;
