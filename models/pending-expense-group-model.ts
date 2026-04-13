/**
 * @requirement REQ-026 - Pending expense group workflow
 */
import mongoose, { Schema, Model } from 'mongoose';
import { IPendingExpenseGroup } from '@/interfaces/pending-expense-group.interface';

const ExpenseLineItemSchema = new Schema(
  {
    expenseType: {
      type: String,
      enum: ['direct-cost', 'operating-expense'],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, required: true, minlength: 3 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PendingExpenseGroupSchema = new Schema<IPendingExpenseGroup>(
  {
    date: { type: Date, required: true, index: true },
    items: { type: [ExpenseLineItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'approved', 'transferred'],
      default: 'pending',
      index: true,
    },
    paymentBatchId: { type: String, index: true, sparse: true },

    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, required: true },

    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    transferReference: { type: String },
    transferredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    transferredAt: { type: Date },

    notes: { type: String },
  },
  { timestamps: true }
);

PendingExpenseGroupSchema.index({ status: 1, date: -1 });
PendingExpenseGroupSchema.index({ paymentBatchId: 1, status: 1 });

export const PendingExpenseGroupModel: Model<IPendingExpenseGroup> =
  mongoose.models.PendingExpenseGroup ||
  mongoose.model<IPendingExpenseGroup>(
    'PendingExpenseGroup',
    PendingExpenseGroupSchema
  );
