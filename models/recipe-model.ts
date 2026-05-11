/**
 * REQ-034 AC8 — Recipe schema.
 *
 * Cross-collection validations (target kind, ingredient kind, unit
 * dimension match) live in {@link RecipeService.createRecipe} /
 * {@link RecipeService.updateRecipe} because Mongoose validators run
 * in-document only — they can't fetch the linked Inventory / MenuItem to
 * verify `kind`. Service-layer validation throws a descriptive Error
 * before any write, which the caller surfaces verbatim.
 */
import mongoose, { Schema, Model } from 'mongoose';
import { IRecipe, IRecipeIngredient } from '../interfaces/recipe.interface';

const recipeIngredientSchema = new Schema<IRecipeIngredient>(
  {
    inventoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unitId: { type: String, required: true },
  },
  { _id: false }
);

const recipeSchema = new Schema<IRecipe>(
  {
    targetMenuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 1 },
    yieldPortions: { type: Number, required: true, min: 0 },
    ingredients: {
      type: [recipeIngredientSchema],
      required: true,
      validate: {
        validator: (v: IRecipeIngredient[]) => Array.isArray(v) && v.length > 0,
        message: 'Recipe must have at least one ingredient',
      },
    },
    notes: { type: String },
    isActive: { type: Boolean, default: true, required: true, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Common query patterns: list active recipes for a menu item; list all
// active recipes for the "Make a batch" picker.
recipeSchema.index({ isActive: 1, targetMenuItemId: 1 });

const RecipeModel: Model<IRecipe> =
  (mongoose.models.Recipe as Model<IRecipe>) ||
  mongoose.model<IRecipe>('Recipe', recipeSchema);

export default RecipeModel;
