import mongoose, { Schema, Model } from 'mongoose';
import { IExpense } from '../interfaces/expense.interface';

const ExpenseSchema = new Schema<IExpense>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    expenseType: {
      type: String,
      enum: ['direct-cost', 'operating-expense'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      minlength: 3,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
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
    supplier: {
      type: String,
    },
    receiptReference: {
      type: String,
    },
    referenceNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    notes: {
      type: String,
    },
    pendingGroupId: {
      type: String,
      index: true,
      sparse: true,
    },
    // REQ-034 AC6/AC7 — Inventory link fields.
    linkedInventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      index: true,
      sparse: true,
    },
    stockMovementId: {
      type: Schema.Types.ObjectId,
      ref: 'StockMovement',
      sparse: true,
    },
    linkVoidedAt: {
      type: Date,
    },
    // REQ-104 — tags carried over from the originating pending-expense line
    // item at transfer time, so a transferred Expense stays filterable.
    tagIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
      default: undefined,
    },
    // REQ-106 — propagated from the originating pending-expense group at
    // transfer time. Only 'cash'-method transferred expenses reduce
    // Current Cash Position (see CashPositionService).
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient date range queries with expense type
ExpenseSchema.index({ date: 1, expenseType: 1 });

// Index for category-based queries
ExpenseSchema.index({ category: 1, date: -1 });

// Text index for search functionality
ExpenseSchema.index({ description: 'text', notes: 'text' });

// REQ-104 — tag-filter queries on the expense list
ExpenseSchema.index({ tagIds: 1 });

export const ExpenseModel: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
