import mongoose, { Schema, Model } from 'mongoose';
import { IUploadedExpense } from '../interfaces/uploaded-expense.interface';

const UploadedExpenseSchema = new Schema<IUploadedExpense>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      required: false,
    },
    expenseType: {
      type: String,
      enum: ['direct-cost', 'operating-expense'],
      required: false,
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    originalData: {
      transactionType: String,
      transactionStatus: String,
      terminalId: String,
      rrn: Number,
      reversalStatus: Number,
      settlementDebit: Number,
      settlementCredit: Number,
      balanceBefore: Number,
      balanceAfter: Number,
      beneficiary: String,
      beneficiaryInstitution: String,
      source: String,
      sourceInstitution: String,
      narration: String,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
UploadedExpenseSchema.index({ status: 1, uploadedAt: -1 });
UploadedExpenseSchema.index({ uploadedBy: 1, status: 1 });
UploadedExpenseSchema.index({ date: 1, status: 1 });

export const UploadedExpenseModel: Model<IUploadedExpense> =
  mongoose.models.UploadedExpense ||
  mongoose.model<IUploadedExpense>('UploadedExpense', UploadedExpenseSchema);
