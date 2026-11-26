/**
 * @requirement REQ-128 — Refund ledger (ADR-015, REQ-PAY-011)
 *
 * One row per refund request. The row is written BEFORE Paystack is called and
 * the order's paymentStatus only changes when Paystack confirms (webhook).
 */
import mongoose, { Schema, Model } from 'mongoose';
import type { IRefund } from '../interfaces/refund.interface';

const RefundSchema = new Schema<IRefund>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true },
    amountKobo: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ['full', 'partial'], required: true },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['customer_cancel', 'whatsapp_cancel', 'staff', 'request_approval'],
      required: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, required: true },
    paystackRefundId: { type: String, index: true, sparse: true },
    transactionReference: { type: String },
    failureReason: { type: String },
    processedAt: { type: Date },
    supportTicketId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportTicket',
      default: null,
    },
  },
  { timestamps: true }
);

// At most one active (pending or processed) FULL refund per order — the
// database enforces "refunded once" even if two requests race.
RefundSchema.index(
  { orderId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: 'full',
      status: { $in: ['pending', 'processed'] },
    },
  }
);
RefundSchema.index({ createdAt: -1 });

const RefundModel: Model<IRefund> =
  (mongoose.models.Refund as Model<IRefund>) ||
  mongoose.model<IRefund>('Refund', RefundSchema);

export default RefundModel;
