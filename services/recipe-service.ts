/**
 * REQ-034 AC8/AC9/AC16 — RecipeService.
 *
 * Owns CRUD and validation for kitchen recipes. All cross-collection
 * validation (kind checks on target + ingredients, dimension match
 * against the UoM registry) runs at the service layer before any write.
 */
import { Types } from 'mongoose';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/mongodb';
import RecipeModel from '@/models/recipe-model';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import {
  validateYieldPortions,
  validateNoDuplicateIngredients,
  validateIngredientQuantities,
  validateIngredientUnitMatchesInventory,
} from '@/lib/recipe-validation';
import type {
  CreateRecipeDTO,
  CreateRecipeIngredientDTO,
  IRecipe,
  UpdateRecipeDTO,
} from '@/interfaces/recipe.interface';

export class RecipeService {
  /**
   * Validate a candidate set of ingredients against the database state:
   *   - target MenuItem exists and is `kind:'menu-item'`
   *   - every ingredient.inventoryId is `kind:'kitchen-ingredient'`
   *   - no duplicate ingredients
   *   - every ingredient quantity > 0
   *   - every ingredient.unitId shares dimension with the linked
   *     inventory's unit (per the REQ-033 UoM registry)
   *
   * Throws a descriptive Error on the first failure. Caller surfaces
   * the message verbatim to the user.
   */
  private static async validateRecipePayload(input: {
    targetMenuItemId: string;
    yieldPortions: number;
    ingredients: ReadonlyArray<CreateRecipeIngredientDTO>;
  }): Promise<void> {
    validateYieldPortions(input.yieldPortions);
    if (input.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }
    validateNoDuplicateIngredients(input.ingredients);
    validateIngredientQuantities(input.ingredients);

    const target = await MenuItemModel.findById(input.targetMenuItemId).select(
      'name kind'
    );
    if (!target) {
      throw new Error(`Target menu item ${input.targetMenuItemId} not found`);
    }
    if (target.kind !== 'menu-item') {
      throw new Error(
        `Target menu item ${input.targetMenuItemId} has kind ` +
          `'${target.kind}', expected 'menu-item' — a recipe can only ` +
          `produce sellable menu items`
      );
    }

    const inventoryIds = input.ingredients.map((i) => i.inventoryId);
    const inventories = await InventoryModel.find({
      _id: { $in: inventoryIds },
    })
      .select('_id kind unit menuItemId')
      .populate('menuItemId', 'name');

    const inventoryById = new Map<string, (typeof inventories)[number]>();
    for (const inv of inventories) {
      inventoryById.set(inv._id.toString(), inv);
    }

    const unitRegistry = await SystemSettingsService.getUnitsOfMeasurement();

    for (const ing of input.ingredients) {
      const inv = inventoryById.get(String(ing.inventoryId));
      if (!inv) {
        throw new Error(
          `Recipe ingredient inventory ${ing.inventoryId} not found`
        );
      }
      if (inv.kind !== 'kitchen-ingredient') {
        const menuItem = inv.menuItemId as { name?: string } | undefined | null;
        const label = menuItem?.name ?? inv._id.toString();
        throw new Error(
          `Recipe ingredient '${label}' has kind '${inv.kind}', expected ` +
            `'kitchen-ingredient' — only kitchen ingredients can be used as ` +
            `recipe inputs`
        );
      }
      validateIngredientUnitMatchesInventory({
        inventoryUnitId: inv.unit,
        ingredientUnitId: ing.unitId,
        unitRegistry,
        inventoryDescription:
          (inv.menuItemId as { name?: string } | undefined | null)?.name ??
          inv._id.toString(),
      });
    }
  }

  static async createRecipe(data: CreateRecipeDTO): Promise<IRecipe> {
    await connectDB();
    await this.validateRecipePayload({
      targetMenuItemId: data.targetMenuItemId,
      yieldPortions: data.yieldPortions,
      ingredients: data.ingredients,
    });

    const recipe = await RecipeModel.create({
      targetMenuItemId: new Types.ObjectId(data.targetMenuItemId),
      name: data.name,
      yieldPortions: data.yieldPortions,
      ingredients: data.ingredients.map((i) => ({
        inventoryId: new Types.ObjectId(i.inventoryId),
        quantity: i.quantity,
        unitId: i.unitId,
      })),
      notes: data.notes,
      isActive: data.isActive ?? true,
      createdBy: new ObjectId(data.createdBy),
    });

    return recipe.toObject() as unknown as IRecipe;
  }

  static async updateRecipe(
    id: string,
    data: UpdateRecipeDTO
  ): Promise<IRecipe> {
    await connectDB();
    const existing = await RecipeModel.findById(id);
    if (!existing) throw new Error('Recipe not found');

    // Re-validate the full intended state when any validated field changes.
    const nextTarget =
      data.targetMenuItemId ?? existing.targetMenuItemId.toString();
    const nextYield = data.yieldPortions ?? existing.yieldPortions;
    const nextIngredients: CreateRecipeIngredientDTO[] =
      data.ingredients?.map((i) => ({
        inventoryId: i.inventoryId,
        quantity: i.quantity,
        unitId: i.unitId,
      })) ??
      existing.ingredients.map((i) => ({
        inventoryId: i.inventoryId.toString(),
        quantity: i.quantity,
        unitId: i.unitId,
      }));

    if (
      data.targetMenuItemId !== undefined ||
      data.yieldPortions !== undefined ||
      data.ingredients !== undefined
    ) {
      await this.validateRecipePayload({
        targetMenuItemId: nextTarget,
        yieldPortions: nextYield,
        ingredients: nextIngredients,
      });
    }

    const update: Record<string, unknown> = {};
    if (data.targetMenuItemId !== undefined)
      update.targetMenuItemId = new Types.ObjectId(data.targetMenuItemId);
    if (data.name !== undefined) update.name = data.name;
    if (data.yieldPortions !== undefined)
      update.yieldPortions = data.yieldPortions;
    if (data.ingredients !== undefined)
      update.ingredients = data.ingredients.map((i) => ({
        inventoryId: new Types.ObjectId(i.inventoryId),
        quantity: i.quantity,
        unitId: i.unitId,
      }));
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.isActive !== undefined) update.isActive = data.isActive;

    const updated = await RecipeModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new Error('Recipe not found');
    return updated as unknown as IRecipe;
  }

  static async getRecipeById(id: string): Promise<IRecipe | null> {
    await connectDB();
    return RecipeModel.findById(id).lean() as Promise<IRecipe | null>;
  }

  /** AC16 — active recipes only (drives the Make-a-batch picker). */
  static async listActiveRecipes(): Promise<IRecipe[]> {
    await connectDB();
    return RecipeModel.find({ isActive: true })
      .sort({ name: 1 })
      .lean() as Promise<IRecipe[]>;
  }

  static async listAllRecipes(): Promise<IRecipe[]> {
    await connectDB();
    return RecipeModel.find().sort({ isActive: -1, name: 1 }).lean() as Promise<
      IRecipe[]
    >;
  }

  /** AC16 — deactivate hides the recipe from "Make a batch" but preserves
   *  historical Production references (which carry a snapshot of the
   *  ingredients deducted at execution time, independent of the recipe). */
  static async deactivateRecipe(id: string): Promise<IRecipe> {
    return this.updateRecipe(id, { isActive: false });
  }

  static async reactivateRecipe(id: string): Promise<IRecipe> {
    return this.updateRecipe(id, { isActive: true });
  }
}

export default RecipeService;
