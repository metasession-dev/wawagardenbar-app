/**
 * REQ-034 AC8/AC9 — Recipe model interface.
 *
 * A recipe binds a sellable menu item (the "target") to a list of
 * kitchen-ingredient deductions that together produce `yieldPortions`
 * portions when executed as a production batch (REQ-034 AC10/AC11).
 *
 * The ingredient `unitId` references the REQ-033 UoM registry; at recipe
 * save time we enforce dimensional compatibility with the linked
 * inventory's unit:
 *   - mass / volume: same UoMCategory (conversion applied at deduction
 *     time via lib/dimension-conversion.ts in step 10).
 *   - count / other / time: strict `unitId` equality between recipe and
 *     inventory (no fungibility — eggs ≠ cartons).
 */
import { ObjectId } from 'mongodb';

export interface IRecipeIngredient {
  /** kind:'kitchen-ingredient' Inventory row. */
  inventoryId: ObjectId;
  /** Positive number; units of {@link unitId}. */
  quantity: number;
  /** UoM registry id (REQ-033). */
  unitId: string;
}

export interface IRecipe {
  _id: ObjectId;
  /** kind:'menu-item' MenuItem produced by executing this recipe. */
  targetMenuItemId: ObjectId;
  /** Display name for the recipe (e.g. "Pepper Soup — large pot"). */
  name: string;
  /** Portions of the target menu item produced per batch. Must be > 0. */
  yieldPortions: number;
  ingredients: IRecipeIngredient[];
  notes?: string;
  /** Inactive recipes are hidden from the "Make a batch" picker. */
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecipeIngredientDTO {
  inventoryId: string;
  quantity: number;
  unitId: string;
}

export interface CreateRecipeDTO {
  targetMenuItemId: string;
  name: string;
  yieldPortions: number;
  ingredients: CreateRecipeIngredientDTO[];
  notes?: string;
  /** Defaults to true if omitted. */
  isActive?: boolean;
  createdBy: string;
}

export interface UpdateRecipeDTO {
  targetMenuItemId?: string;
  name?: string;
  yieldPortions?: number;
  ingredients?: CreateRecipeIngredientDTO[];
  notes?: string;
  isActive?: boolean;
}
