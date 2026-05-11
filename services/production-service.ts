/**
 * REQ-034 AC10/AC11/AC12/AC13 — ProductionService.
 *
 * Standalone Mongo (no `withTransaction`) — execution uses the optimistic
 * deduction pattern: each Inventory update is an atomic `$inc` with a
 * `currentStock: { $gte: required }` guard; 0-modified is treated as
 * "ingredient short, abort" and a reversal pass undoes the deductions
 * already applied. Production is persisted only at the end of a
 * successful batch — partial-failure batches leave no Production row.
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import RecipeModel from '@/models/recipe-model';
import InventoryModel from '@/models/inventory-model';
import '@/models/menu-item-model'; // ensures MenuItem model is registered for populate
import StockMovementModel from '@/models/stock-movement-model';
import ProductionModel from '@/models/production-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import {
  computeIngredientsForBatches,
  validateProductionPreFlight,
  computeYieldVariance,
  validateVoidReason,
  type BatchIngredientDeduction,
  type InventoryUnitInfo,
} from '@/lib/recipe-execution';
import type {
  IProduction,
  MakeBatchInput,
  VoidProductionInput,
} from '@/interfaces/production.interface';
import type { UserRole } from '@/interfaces/user.interface';

export interface MakeBatchInputWithRole extends MakeBatchInput {
  performedByRole?: UserRole;
}

export interface VoidProductionInputWithRole extends VoidProductionInput {
  voidedByRole: UserRole;
}

export class ProductionService {
  /**
   * AC10 + AC11 — pre-flight + optimistic batch execution.
   */
  static async makeBatch(input: MakeBatchInputWithRole): Promise<IProduction> {
    await connectDB();

    if (!Number.isFinite(input.batchCount) || input.batchCount < 1) {
      throw new Error('batchCount must be ≥ 1');
    }

    const recipe = await RecipeModel.findById(input.recipeId);
    if (!recipe) throw new Error(`Recipe ${input.recipeId} not found`);
    if (!recipe.isActive) {
      throw new Error(
        `Recipe ${recipe.name} is deactivated and cannot run new batches`
      );
    }

    const ingredientIds = recipe.ingredients.map((i) => i.inventoryId);
    const inventories = await InventoryModel.find({
      _id: { $in: ingredientIds },
    }).populate('menuItemId', 'name');

    const inventoryUnitById = new Map<string, InventoryUnitInfo>();
    for (const inv of inventories) {
      const menuItem = inv.menuItemId as { name?: string } | null | undefined;
      inventoryUnitById.set(inv._id.toString(), {
        inventoryId: inv._id.toString(),
        unitId: inv.unit,
        name: menuItem?.name,
        currentStock: inv.currentStock,
      });
    }

    const registry = await SystemSettingsService.getUnitsOfMeasurement();

    const deductions = computeIngredientsForBatches({
      ingredients: recipe.ingredients,
      batchCount: input.batchCount,
      inventoryUnitById,
      registry,
    });

    // AC10 — pre-flight against snapshotted inventory state.
    const preflight = validateProductionPreFlight({
      deductions,
      inventoryUnitById,
    });
    if (!preflight.ok) {
      const lines = preflight.shortages
        .map(
          (s) =>
            `  - ${s.name ?? s.inventoryId}: need ${s.required} ${s.inventoryUnitId}, ` +
            `have ${s.available} ${s.inventoryUnitId}`
        )
        .join('\n');
      throw new Error(
        `Cannot start batch — the following ingredients are short:\n${lines}`
      );
    }

    // Locate the target menu-item's inventory row for the yield addition.
    const targetInventory = await InventoryModel.findOne({
      menuItemId: recipe.targetMenuItemId,
      kind: 'menu-item',
    });
    if (!targetInventory) {
      throw new Error(
        `Target menu item ${recipe.targetMenuItemId.toString()} has no inventory ` +
          `row — create one before producing batches`
      );
    }

    const expectedYield = recipe.yieldPortions * input.batchCount;
    const actualYield = input.actualYield ?? expectedYield;
    if (!Number.isFinite(actualYield) || actualYield < 0) {
      throw new Error('actualYield must be a non-negative finite number');
    }

    // Pre-allocate the Production._id so movements can carry it from the
    // first deduction onward (avoids a chicken-and-egg back-fill).
    const productionId = new Types.ObjectId();
    const performedById = new Types.ObjectId(input.performedBy);
    const performedAt = new Date();
    const successfulDeductions: BatchIngredientDeduction[] = [];
    const createdMovementIds: Types.ObjectId[] = [];
    let yieldMovementId: Types.ObjectId | null = null;

    try {
      // AC11 — deduct each ingredient via optimistic $inc with $gte guard.
      for (const d of deductions) {
        const incResult = await InventoryModel.updateOne(
          {
            _id: new Types.ObjectId(d.inventoryId),
            currentStock: { $gte: d.quantityInInventoryUnit },
          },
          { $inc: { currentStock: -d.quantityInInventoryUnit } }
        );
        if (incResult.modifiedCount !== 1) {
          throw new Error(
            `Ingredient short or race detected for ` +
              `${d.name ?? d.inventoryId} — batch aborted`
          );
        }
        const movement = await StockMovementModel.create({
          inventoryId: new Types.ObjectId(d.inventoryId),
          quantity: -d.quantityInInventoryUnit,
          type: 'deduction',
          reason: `Production batch ${productionId.toString()} (${recipe.name})`,
          category: 'production',
          performedBy: performedById,
          performedByName: input.performedByName,
          timestamp: performedAt,
          productionId,
        });
        createdMovementIds.push(movement._id);
        successfulDeductions.push(d);
      }

      // AC11 — yield addition to the target menu item's inventory.
      await InventoryModel.updateOne(
        { _id: targetInventory._id },
        {
          $inc: { currentStock: actualYield },
          $set: { lastRestocked: performedAt },
        }
      );
      const yieldMovement = await StockMovementModel.create({
        inventoryId: targetInventory._id,
        quantity: actualYield,
        type: 'addition',
        reason: `Production yield ${productionId.toString()} (${recipe.name})`,
        category: 'production',
        performedBy: performedById,
        performedByName: input.performedByName,
        timestamp: performedAt,
        productionId,
      });
      yieldMovementId = yieldMovement._id;
      createdMovementIds.push(yieldMovementId);

      // Persist Production only on full success.
      const production = await ProductionModel.create({
        _id: productionId,
        recipeId: recipe._id,
        targetMenuItemId: recipe.targetMenuItemId,
        batchCount: input.batchCount,
        expectedYield,
        actualYield,
        yieldVariance: computeYieldVariance({
          actual: actualYield,
          expected: expectedYield,
        }),
        ingredientsDeducted: deductions.map((d) => ({
          inventoryId: new Types.ObjectId(d.inventoryId),
          quantityInInventoryUnit: d.quantityInInventoryUnit,
          inventoryUnitId: d.inventoryUnitId,
          name: d.name,
        })),
        stockMovementIds: createdMovementIds,
        performedBy: performedById,
        performedByName: input.performedByName,
        performedAt,
        status: 'completed',
        notes: input.notes,
      });

      return production.toObject() as unknown as IProduction;
    } catch (err) {
      // Reversal pass — undo successful deductions + yield if it landed.
      await this.reversePartialBatch({
        deductions: successfulDeductions,
        yieldInventoryId: yieldMovementId ? targetInventory._id : null,
        yieldQuantity: actualYield,
        productionId,
        performedBy: performedById,
        performedByName: input.performedByName,
        recipeName: recipe.name,
      });
      throw err;
    }
  }

  /**
   * Compensating writes for a mid-flight batch failure. Each step is
   * independent; one failing undo step is logged but does not block
   * the rest.
   */
  private static async reversePartialBatch(input: {
    deductions: ReadonlyArray<BatchIngredientDeduction>;
    yieldInventoryId: Types.ObjectId | null;
    yieldQuantity: number;
    productionId: Types.ObjectId;
    performedBy: Types.ObjectId;
    performedByName?: string;
    recipeName: string;
  }): Promise<void> {
    const now = new Date();
    for (const d of input.deductions) {
      try {
        await InventoryModel.updateOne(
          { _id: new Types.ObjectId(d.inventoryId) },
          { $inc: { currentStock: d.quantityInInventoryUnit } }
        );
        await StockMovementModel.create({
          inventoryId: new Types.ObjectId(d.inventoryId),
          quantity: d.quantityInInventoryUnit,
          type: 'addition',
          reason: `Aborted-batch reversal (${input.recipeName})`,
          category: 'production',
          performedBy: input.performedBy,
          performedByName: input.performedByName,
          timestamp: now,
          productionId: input.productionId,
          notes: 'Compensating addition for aborted production batch',
        });
      } catch (err) {
        console.error(
          '[REQ-034] reversePartialBatch: ingredient reversal failed',
          err
        );
      }
    }

    if (input.yieldInventoryId && input.yieldQuantity > 0) {
      try {
        await InventoryModel.updateOne(
          { _id: input.yieldInventoryId },
          { $inc: { currentStock: -input.yieldQuantity } }
        );
        await StockMovementModel.create({
          inventoryId: input.yieldInventoryId,
          quantity: -input.yieldQuantity,
          type: 'deduction',
          reason: `Aborted-batch yield reversal (${input.recipeName})`,
          category: 'production',
          performedBy: input.performedBy,
          performedByName: input.performedByName,
          timestamp: now,
          productionId: input.productionId,
          notes: 'Compensating deduction for aborted production yield',
        });
      } catch (err) {
        console.error(
          '[REQ-034] reversePartialBatch: yield reversal failed',
          err
        );
      }
    }
  }

  /**
   * AC13 — Void a completed production. Super-admin only. Within 24h
   * reasonNote is optional; past 24h it's required and stamped on every
   * reversal StockMovement. Idempotent — voiding an already-voided
   * production is a no-op.
   */
  static async voidBatch(
    input: VoidProductionInputWithRole
  ): Promise<IProduction> {
    await connectDB();

    if (input.voidedByRole !== 'super-admin') {
      throw new Error('Only super-admin can void a production batch');
    }

    const production = await ProductionModel.findById(input.productionId);
    if (!production) {
      throw new Error(`Production ${input.productionId} not found`);
    }

    if (production.status === 'voided') {
      // AC13 — idempotent: return the existing voided row.
      return production.toObject() as unknown as IProduction;
    }

    const trimmedReason = validateVoidReason({
      producedAt: production.performedAt,
      now: new Date(),
      reasonNote: input.reasonNote,
    });

    const voidedById = new Types.ObjectId(input.voidedBy);
    const now = new Date();

    // Restore each ingredient deduction.
    for (const d of production.ingredientsDeducted) {
      await InventoryModel.updateOne(
        { _id: d.inventoryId },
        { $inc: { currentStock: d.quantityInInventoryUnit } }
      );
      await StockMovementModel.create({
        inventoryId: d.inventoryId,
        quantity: d.quantityInInventoryUnit,
        type: 'addition',
        reason: `Void of production ${production._id.toString()}`,
        category: 'production',
        performedBy: voidedById,
        performedByName: input.voidedByName,
        timestamp: now,
        productionId: production._id,
        notes: trimmedReason,
      });
    }

    // Reverse the yield addition with a $gte guard — protects against
    // partial-sale state. Failure (modifiedCount=0) raises a race so
    // the caller surfaces the issue without leaving inventory negative.
    const yieldIncResult = await InventoryModel.updateOne(
      {
        menuItemId: production.targetMenuItemId,
        kind: 'menu-item',
        currentStock: { $gte: production.actualYield },
      },
      { $inc: { currentStock: -production.actualYield } }
    );
    if (yieldIncResult.modifiedCount !== 1) {
      throw new Error(
        `Cannot void production ${production._id.toString()} — some of the ` +
          `${production.actualYield} produced portions have already been sold ` +
          `or current target inventory is below the produced yield`
      );
    }
    const yieldInv = await InventoryModel.findOne({
      menuItemId: production.targetMenuItemId,
      kind: 'menu-item',
    });
    if (yieldInv) {
      await StockMovementModel.create({
        inventoryId: yieldInv._id,
        quantity: -production.actualYield,
        type: 'deduction',
        reason: `Void of production yield ${production._id.toString()}`,
        category: 'production',
        performedBy: voidedById,
        performedByName: input.voidedByName,
        timestamp: now,
        productionId: production._id,
        notes: trimmedReason,
      });
    }

    production.status = 'voided';
    production.voidedBy = voidedById;
    production.voidedAt = now;
    if (trimmedReason !== undefined) {
      production.reasonNote = trimmedReason;
    }
    await production.save();

    return production.toObject() as unknown as IProduction;
  }

  static async getProductionById(id: string): Promise<IProduction | null> {
    await connectDB();
    return ProductionModel.findById(id).lean() as Promise<IProduction | null>;
  }

  static async listRecentProductions(limit = 50): Promise<IProduction[]> {
    await connectDB();
    return ProductionModel.find()
      .sort({ performedAt: -1 })
      .limit(limit)
      .lean() as Promise<IProduction[]>;
  }
}

export default ProductionService;
