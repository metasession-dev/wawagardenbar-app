import { Schema, model, models } from 'mongoose';
import { IInventoryItemCostHistory } from '../interfaces/inventory-item-cost-history.interface';

const inventoryItemCostHistorySchema = new Schema<IInventoryItemCostHistory>(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
      index: true,
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      index: true,
    },
    effectiveTo: {
      type: Date,
      index: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient date range queries
inventoryItemCostHistorySchema.index({
  inventoryItemId: 1,
  effectiveFrom: -1,
  effectiveTo: -1,
});

// Index for finding current costs (effectiveTo is null)
inventoryItemCostHistorySchema.index({ inventoryItemId: 1, effectiveTo: 1 });

const InventoryItemCostHistory =
  models.InventoryItemCostHistory ||
  model<IInventoryItemCostHistory>('InventoryItemCostHistory', inventoryItemCostHistorySchema);

export default InventoryItemCostHistory;
