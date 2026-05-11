/**
 * REQ-034 AC11/AC12/AC13 — Production batch interface.
 *
 * Each Production row records one execution of a Recipe for N batches.
 * Persisted only after every ingredient deduction + the yield addition
 * succeed; a partial-failure aborted batch leaves no Production doc.
 *
 * `ingredientsDeducted` is a snapshot in inventory units — independent
 * of the Recipe so deactivating / editing the Recipe later doesn't
 * change history (AC16).
 */
import { ObjectId } from 'mongodb';

export interface IProductionIngredientDeduction {
  inventoryId: ObjectId;
  /** Quantity actually deducted, expressed in the inventory's unit. */
  quantityInInventoryUnit: number;
  inventoryUnitId: string;
  name?: string;
}

export type ProductionStatus = 'completed' | 'voided';

export interface IProduction {
  _id: ObjectId;
  recipeId: ObjectId;
  /** kind:'menu-item' MenuItem that received the yield addition. */
  targetMenuItemId: ObjectId;
  batchCount: number;
  expectedYield: number;
  actualYield: number;
  /** actualYield - expectedYield (negative = waste, positive = over-yield). */
  yieldVariance: number;
  ingredientsDeducted: IProductionIngredientDeduction[];
  /** Every StockMovement (_id) emitted as part of this batch. N+1 entries:
   *  N deductions + 1 yield addition on the target MenuItem inventory. */
  stockMovementIds: ObjectId[];
  performedBy: ObjectId;
  performedByName?: string;
  performedAt: Date;
  status: ProductionStatus;
  /** Mandatory when voiding past the 24h window; optional within. Recorded
   *  on the production row + every reversal StockMovement. */
  reasonNote?: string;
  notes?: string;
  voidedBy?: ObjectId;
  voidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MakeBatchInput {
  recipeId: string;
  batchCount: number;
  /** Defaults to recipe.yieldPortions × batchCount when omitted. */
  actualYield?: number;
  notes?: string;
  performedBy: string;
  performedByName?: string;
}

export interface VoidProductionInput {
  productionId: string;
  voidedBy: string;
  voidedByName?: string;
  /** Required (after trim) when voiding > 24h after performedAt. */
  reasonNote?: string;
}
