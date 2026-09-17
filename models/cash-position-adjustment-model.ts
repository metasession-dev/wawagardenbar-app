/**
 * @requirement REQ-106
 */
import mongoose, { Schema, Model } from 'mongoose';
import { ICashPositionAdjustment } from '../interfaces/cash-position-adjustment.interface';

const CashPositionAdjustmentSchema = new Schema<ICashPositionAdjustment>(
  {
    type: { type: String, enum: ['seed', 'correction'], required: true },
    // Signed delta — see interfaces/cash-position-adjustment.interface.ts
    // for the rationale (both types summed identically at read time).
    amount: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CashPositionAdjustmentSchema.index({ effectiveDate: 1 });

export const CashPositionAdjustmentModel: Model<ICashPositionAdjustment> =
  mongoose.models.CashPositionAdjustment ||
  mongoose.model<ICashPositionAdjustment>(
    'CashPositionAdjustment',
    CashPositionAdjustmentSchema
  );
