/**
 * @requirement REQ-106
 */
import mongoose, { Schema, Model } from 'mongoose';
import { ICashDeposit } from '../interfaces/cash-deposit.interface';

const CashDepositSchema = new Schema<ICashDeposit>(
  {
    date: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'transferred'],
      default: 'pending',
      index: true,
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    transferredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    transferredAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

CashDepositSchema.index({ status: 1, date: -1 });

export const CashDepositModel: Model<ICashDeposit> =
  mongoose.models.CashDeposit ||
  mongoose.model<ICashDeposit>('CashDeposit', CashDepositSchema);
