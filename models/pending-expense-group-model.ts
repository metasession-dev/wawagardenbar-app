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
    // REQ-034 AC5/AC6 — optional inventory link selected at submission.
    linkedInventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      sparse: true,
    },
    // REQ-104 — optional tags selected at submission, per line item
    // (mirrors `category`'s existing per-line-item granularity).
    tagIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
      default: undefined,
    },
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
    // REQ-106 — cash vs bank-transfer payment method, selected once at
    // creation. Group-level (not per-line-item): the user picks how THIS
    // payment run will be paid, not per individual purchase.
    // Not `required` at the schema level (deliberately) — enforced instead
    // in `createPendingExpenseGroupAction`/`PendingExpenseGroupService`, so
    // pending/approved groups created before this REQ deployed (and thus
    // lacking the field) don't fail Mongoose validation on their next edit.
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer'],
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
// REQ-106 — Current Cash Position's cash-out-expenses aggregation query
PendingExpenseGroupSchema.index({
  status: 1,
  paymentMethod: 1,
  transferredAt: 1,
});

export const PendingExpenseGroupModel: Model<IPendingExpenseGroup> =
  mongoose.models.PendingExpenseGroup ||
  mongoose.model<IPendingExpenseGroup>(
    'PendingExpenseGroup',
    PendingExpenseGroupSchema
  );
