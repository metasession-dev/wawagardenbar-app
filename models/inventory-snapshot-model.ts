import mongoose, { Schema, Model } from 'mongoose';
import type { IInventorySnapshot } from '@/interfaces/inventory-snapshot.interface';

const inventorySnapshotItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    menuItemName: { type: String, required: true },
    mainCategory: { type: String, enum: ['food', 'drinks'], required: true },
    category: { type: String, required: true },
    systemInventoryCount: { type: Number, required: true, default: 0 },
    todaySalesCount: { type: Number, required: true, default: 0 },
    staffConfirmed: { type: Boolean, required: true, default: false },
    staffAdjustedCount: { type: Number },
    staffNotes: { type: String },
    discrepancy: { type: Number, required: true, default: 0 },
    requiresAdjustment: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const inventorySnapshotSchema = new Schema<IInventorySnapshot>(
  {
    snapshotDate: { type: Date, required: true },
    mainCategory: { type: String, enum: ['food', 'drinks'], required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedByName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: { type: String },
    reviewNotes: { type: String },
    items: [inventorySnapshotItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventorySnapshotSchema.index({ snapshotDate: -1, status: 1 });
inventorySnapshotSchema.index({ submittedBy: 1, snapshotDate: -1 });
inventorySnapshotSchema.index({ status: 1, submittedAt: -1 });
inventorySnapshotSchema.index({ snapshotDate: 1, mainCategory: 1, submittedBy: 1 }, { unique: true });

export const InventorySnapshotModel: Model<IInventorySnapshot> =
  mongoose.models.InventorySnapshot ||
  mongoose.model<IInventorySnapshot>('InventorySnapshot', inventorySnapshotSchema);
