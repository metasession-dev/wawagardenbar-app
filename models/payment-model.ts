import mongoose, { Schema, Model } from 'mongoose';
import { IPayment, IMonnifyResponse, PaymentMethod, PaymentStatus } from '../interfaces';

const monnifyResponseSchema = new Schema<IMonnifyResponse>(
  {
    transactionReference: { type: String, required: true },
    paymentReference: { type: String, required: true },
    amountPaid: { type: Number, required: true },
    totalPayable: { type: Number, required: true },
    settlementAmount: { type: Number, required: true },
    paidOn: { type: String, required: true },
    paymentStatus: { type: String, required: true },
    paymentDescription: { type: String, required: true },
    currency: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    product: {
      type: { type: String, required: true },
      reference: { type: String, required: true },
    },
    cardDetails: {
      cardType: { type: String },
      last4: { type: String },
      bin: { type: String },
    },
    accountDetails: {
      accountName: { type: String },
      accountNumber: { type: String },
      bankCode: { type: String },
      bankName: { type: String },
    },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'NGN' },
    paymentMethod: {
      type: String,
      enum: ['card', 'transfer', 'ussd', 'phone'] as PaymentMethod[],
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'paid',
        'failed',
        'cancelled',
        'refunded',
        'partially-refunded',
      ] as PaymentStatus[],
      default: 'pending',
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
    },
    transactionReference: { type: String },
    monnifyResponse: { type: monnifyResponseSchema },
    webhookData: { type: Schema.Types.Mixed },
    failureReason: { type: String },
    refundAmount: { type: Number, min: 0 },
    refundReason: { type: String },
    refundedAt: { type: Date },
    paidAt: { type: Date },
    metadata: {
      customerEmail: { type: String, required: true },
      customerName: { type: String, required: true },
      orderNumber: { type: String, required: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.index({ transactionReference: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ 'metadata.customerEmail': 1 });

const PaymentModel: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>('Payment', paymentSchema);

export default PaymentModel;
