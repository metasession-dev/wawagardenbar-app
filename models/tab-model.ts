/**
 * @requirement REQ-012 - Add partialPayments subdocument to tab schema
 */
import mongoose, { Schema, Model } from 'mongoose';
import { ITab, TabStatus } from '../interfaces';

const tabSchema = new Schema<ITab>(
  {
    tabNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customName: {
      type: String,
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
      enum: ['customer', 'csr', 'admin', 'super-admin'],
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
    partialPayments: [
      {
        amount: { type: Number, required: true, min: 0 },
        note: { type: String, required: true },
        paymentType: {
          type: String,
          enum: ['cash', 'transfer', 'card'],
          required: true,
        },
        paymentReference: { type: String },
        processedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        paidAt: { type: Date, default: Date.now },
      },
    ],
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
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledAt: {
      type: Date,
    },
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
