import mongoose, { Schema, Model } from 'mongoose';
import { ITab, TabStatus } from '../interfaces';

const tabSchema = new Schema<ITab>(
  {
    tabNumber: {
      type: String,
      required: true,
      unique: true,
    },
    tableNumber: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByRole: {
      type: String,
      enum: ['admin', 'super-admin', 'customer'],
      default: 'customer',
    },
    openedByStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customerName: {
      type: String,
    },
    customerEmail: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    guestId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'settling', 'closed'] as TabStatus[],
      default: 'open',
    },
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    tipAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentReference: {
      type: String,
    },
    transactionReference: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
tabSchema.index({ status: 1, tableNumber: 1 });
tabSchema.index({ userId: 1, status: 1 });
tabSchema.index({ openedAt: -1 });
tabSchema.index({ tableNumber: 1, status: 1 });

const TabModel: Model<ITab> =
  mongoose.models.Tab || mongoose.model<ITab>('Tab', tabSchema);

export default TabModel;
