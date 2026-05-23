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
        // REQ-035 — tip on this partial-payment row. Tab-level
        // `tipAmount` is recomputed as the sum of these by pre('save').
        tipAmount: { type: Number, default: 0, min: 0 },
        // REQ-036 — independent tip-payment-method per partial row.
        // Optional; when unset, the daily-report aggregator falls back
        // to the row's own `paymentType`. Lets staff record card-paid
        // bill + cash-paid tip on the same row.
        tipPaymentMethod: {
          type: String,
          enum: ['cash', 'transfer', 'card'],
        },
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
    businessDate: {
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
tabSchema.index({ businessDate: 1 });
tabSchema.index({ tableNumber: 1, status: 1 });
// Default Tabs Management page query: find({status:'open'}).sort({openedAt:-1}).
// Compound covers the filter + sort + (skip/limit) without scanning every
// tab. Builds in background; existing single-field openedAt index stays
// for date-range queries that don't filter on status.
tabSchema.index({ status: 1, openedAt: -1 });

// REQ-035 — tab-level `tipAmount` is a derived sum of partial-payment
// tips. Recompute on every save so callers cannot drift the two apart.
// (Pre-REQ-035 callers only ever set the tab-level field directly; their
// behaviour is preserved when no partial-payment carries a tip — the sum
// is 0 and the existing field is overwritten with 0, matching the
// default. After REQ-035, all writes go through the partial-payment
// path which keeps both fields in sync.)
tabSchema.pre('save', function recomputeTabTipAmount(next) {
  const partials = this.partialPayments ?? [];
  this.tipAmount = partials.reduce((sum, pp) => sum + (pp.tipAmount ?? 0), 0);
  next();
});

const TabModel: Model<ITab> =
  mongoose.models.Tab || mongoose.model<ITab>('Tab', tabSchema);

export default TabModel;
