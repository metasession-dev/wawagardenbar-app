import mongoose, { Schema, Model } from 'mongoose';
import {
  IInventory,
  IStockHistory,
  StockStatus,
  StockHistoryCategory,
} from '../interfaces';

const stockHistorySchema = new Schema<IStockHistory>(
  {
    quantity: { type: Number, required: true },
    type: {
      type: String,
      enum: ['addition', 'deduction', 'adjustment'],
      required: true,
    },
    reason: { type: String, required: true },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    category: {
      type: String,
      enum: ['sale', 'restock', 'waste', 'damage', 'adjustment', 'other'] as StockHistoryCategory[],
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    invoiceNumber: { type: String },
    supplier: { type: String },
    costPerUnit: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    notes: { type: String },
    performedByName: { type: String },
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
    stockHistory: { type: [stockHistorySchema], default: [] },
    autoReorderEnabled: { type: Boolean, default: false },
    reorderQuantity: { type: Number, default: 0, min: 0 },
    supplier: { type: String },
    costPerUnit: { type: Number, required: true, min: 0 },
    preventOrdersWhenOutOfStock: { type: Boolean, default: false },
    salesVelocity: { type: Number, default: 0 },
    lastSaleDate: { type: Date },
    totalSales: { type: Number, default: 0, min: 0 },
    totalWaste: { type: Number, default: 0, min: 0 },
    totalRestocked: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventorySchema.index({ status: 1 });
inventorySchema.index({ currentStock: 1 });

inventorySchema.pre('save', function preSave(next) {
  if (this.currentStock <= 0) {
    this.status = 'out-of-stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
  next();
});

inventorySchema.methods.addStock = function addStock(
  quantity: number,
  reason: string,
  performedBy: mongoose.Types.ObjectId
): void {
  this.currentStock += quantity;
  this.lastRestocked = new Date();
  this.stockHistory.push({
    quantity,
    type: 'addition',
    reason,
    performedBy,
    timestamp: new Date(),
  });
};

inventorySchema.methods.deductStock = function deductStock(
  quantity: number,
  reason: string,
  performedBy: mongoose.Types.ObjectId
): void {
  this.currentStock = Math.max(0, this.currentStock - quantity);
  this.stockHistory.push({
    quantity: -quantity,
    type: 'deduction',
    reason,
    performedBy,
    timestamp: new Date(),
  });
};

inventorySchema.methods.adjustStock = function adjustStock(
  newQuantity: number,
  reason: string,
  performedBy: mongoose.Types.ObjectId
): void {
  const difference = newQuantity - this.currentStock;
  this.currentStock = newQuantity;
  this.stockHistory.push({
    quantity: difference,
    type: 'adjustment',
    reason,
    performedBy,
    timestamp: new Date(),
  });
};

const InventoryModel: Model<IInventory> =
  mongoose.models.Inventory ||
  mongoose.model<IInventory>('Inventory', inventorySchema);

export default InventoryModel;
