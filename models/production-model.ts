/**
 * REQ-034 AC11/AC12/AC13 — Production schema.
 *
 * Persisted only at the end of a successful batch (status:'completed').
 * Aborted batches leave no Production row — only their reversed
 * StockMovements remain for audit. Voiding a completed Production flips
 * status to 'voided' and stamps voidedBy/voidedAt + reasonNote.
 */
import mongoose, { Schema, Model } from 'mongoose';
import {
  IProduction,
  IProductionIngredientDeduction,
  ProductionStatus,
} from '../interfaces/production.interface';

const productionIngredientSchema = new Schema<IProductionIngredientDeduction>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    quantityInInventoryUnit: { type: Number, required: true, min: 0 },
    inventoryUnitId: { type: String, required: true },
    name: { type: String },
  },
  { _id: false }
);

const productionSchema = new Schema<IProduction>(
  {
    recipeId: {
      type: Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
      index: true,
    },
    targetMenuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      index: true,
    },
    batchCount: { type: Number, required: true, min: 1 },
    expectedYield: { type: Number, required: true, min: 0 },
    actualYield: { type: Number, required: true, min: 0 },
    yieldVariance: { type: Number, required: true },
    ingredientsDeducted: {
      type: [productionIngredientSchema],
      required: true,
      validate: {
        validator: (v: IProductionIngredientDeduction[]) =>
          Array.isArray(v) && v.length > 0,
        message: 'Production must record at least one ingredient deduction',
      },
    },
    stockMovementIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'StockMovement',
      },
    ],
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: { type: String },
    performedAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['completed', 'voided'] as ProductionStatus[],
      default: 'completed',
      required: true,
      index: true,
    },
    reasonNote: { type: String },
    notes: { type: String },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
  },
  { timestamps: true }
);

productionSchema.index({ performedAt: -1 });
productionSchema.index({ status: 1, performedAt: -1 });

const ProductionModel: Model<IProduction> =
  (mongoose.models.Production as Model<IProduction>) ||
  mongoose.model<IProduction>('Production', productionSchema);

export default ProductionModel;
