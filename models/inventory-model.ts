import mongoose, { Schema, Model } from 'mongoose';
import { IInventory, IInventoryLocation, StockStatus } from '../interfaces';

const inventoryLocationSchema = new Schema<IInventoryLocation>(
  {
    location: { type: String, required: true },
    locationName: { type: String },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String },
    notes: { type: String },
  },
  { _id: false }
);

const inventorySchema = new Schema<IInventory>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      unique: true,
    },
    currentStock: { type: Number, required: true, min: 0 },
    minimumStock: { type: Number, required: true, min: 0 },
    maximumStock: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    status: {
      type: String,
      enum: ['in-stock', 'low-stock', 'out-of-stock'] as StockStatus[],
      default: 'in-stock',
    },
    lastRestocked: { type: Date },
    autoReorderEnabled: { type: Boolean, default: false },
    reorderQuantity: { type: Number, default: 0, min: 0 },
    supplier: { type: String },
    /** @deprecated Use MenuItemPriceHistory / InventoryItemCostHistory for canonical cost tracking. */
    costPerUnit: { type: Number, required: true, min: 0 },
    preventOrdersWhenOutOfStock: { type: Boolean, default: false },
    salesVelocity: { type: Number, default: 0 },
    lastSaleDate: { type: Date },
    totalSales: { type: Number, default: 0, min: 0 },
    totalWaste: { type: Number, default: 0, min: 0 },
    totalRestocked: { type: Number, default: 0, min: 0 },
    trackByLocation: { type: Boolean, default: false },
    locations: { type: [inventoryLocationSchema], default: [] },
    defaultReceivingLocation: { type: String },
    defaultSalesLocation: { type: String },
    crateSize: { type: Number, min: 1 },
    packagingType: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventorySchema.index({ status: 1 });
inventorySchema.index({ currentStock: 1 });
inventorySchema.index({ 'locations.location': 1 });

inventorySchema.pre('save', function preSave(next) {
  // Sync currentStock with location totals if tracking by location
  if (this.trackByLocation && this.locations.length > 0) {
    this.currentStock = this.locations.reduce(
      (sum, loc) => sum + loc.currentStock,
      0
    );
  }

  // Update status based on total stock
  if (this.currentStock <= 0) {
    this.status = 'out-of-stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
  next();
});

const InventoryModel: Model<IInventory> =
  mongoose.models.Inventory ||
  mongoose.model<IInventory>('Inventory', inventorySchema);

export default InventoryModel;
