import { Schema, model, models } from 'mongoose';
import { IMenuItemPriceHistory } from '@/interfaces/menu-item-price-history.interface';

const menuItemPriceHistorySchema = new Schema<IMenuItemPriceHistory>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0,
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
    reason: {
      type: String,
      enum: [
        'supplier_increase',
        'supplier_decrease',
        'promotion',
        'seasonal',
        'market_adjustment',
        'cost_optimization',
        'initial_price',
        'manual_adjustment',
      ],
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
menuItemPriceHistorySchema.index({ menuItemId: 1, effectiveFrom: -1, effectiveTo: -1 });

// Index for finding current prices (effectiveTo is null)
menuItemPriceHistorySchema.index({ menuItemId: 1, effectiveTo: 1 });

const MenuItemPriceHistory =
  models.MenuItemPriceHistory ||
  model<IMenuItemPriceHistory>('MenuItemPriceHistory', menuItemPriceHistorySchema);

export default MenuItemPriceHistory;
