/**
 * REQ-034 AC8/AC9 — Pure validation helpers for recipes.
 *
 * The recipe service composes these into a single pre-write validation
 * pass. They're split out as pure functions so the unit suite can hit
 * every branch without a Mongo connection.
 */
import type { CreateRecipeIngredientDTO } from '@/interfaces/recipe.interface';
import type {
  UnitOfMeasurement,
  UoMCategory,
} from '@/interfaces/unit-of-measurement.interface';

/**
 * UoM categories where unit fungibility is undefined in v1 — eggs and
 * cartons are both `count` but one carton ≠ one egg. For these
 * categories the recipe ingredient `unitId` must equal the inventory
 * `unitId` byte-for-byte. (Categories `mass` and `volume` accept any
 * unit within the same category; conversion lives in step 10's
 * `lib/dimension-conversion.ts`.)
 */
export const STRICT_MATCH_UOM_CATEGORIES: readonly UoMCategory[] = [
  'count',
  'other',
  'time',
] as const;

export function validateYieldPortions(yieldPortions: number): void {
  if (!Number.isFinite(yieldPortions) || yieldPortions <= 0) {
    throw new Error(
      `Recipe yieldPortions must be a positive number (got ${yieldPortions})`
    );
  }
}

export function validateNoDuplicateIngredients(
  ingredients: ReadonlyArray<CreateRecipeIngredientDTO>
): void {
  const seen = new Set<string>();
  for (const ing of ingredients) {
    const key = String(ing.inventoryId);
    if (seen.has(key)) {
      throw new Error(
        `Duplicate ingredient ${key} — each kitchen-ingredient can only ` +
          `appear once per recipe (combine quantities into a single line)`
      );
    }
    seen.add(key);
  }
}

export function validateIngredientQuantities(
  ingredients: ReadonlyArray<CreateRecipeIngredientDTO>
): void {
  for (const ing of ingredients) {
    if (!Number.isFinite(ing.quantity) || ing.quantity <= 0) {
      throw new Error(
        `Recipe ingredient quantity must be positive (got ${ing.quantity} ` +
          `for inventory ${ing.inventoryId})`
      );
    }
  }
}

/**
 * AC9 — ingredient unit MUST share dimension with inventory unit.
 *   - mass / volume: same UoMCategory.
 *   - count / other / time: strict id equality.
 */
export function validateIngredientUnitMatchesInventory(input: {
  inventoryUnitId: string;
  ingredientUnitId: string;
  unitRegistry: ReadonlyArray<UnitOfMeasurement>;
  inventoryDescription: string;
}): void {
  const {
    inventoryUnitId,
    ingredientUnitId,
    unitRegistry,
    inventoryDescription,
  } = input;
  const inventoryUnit = unitRegistry.find((u) => u.id === inventoryUnitId);
  const ingredientUnit = unitRegistry.find((u) => u.id === ingredientUnitId);

  if (!inventoryUnit) {
    throw new Error(
      `Inventory ${inventoryDescription} uses unit '${inventoryUnitId}' ` +
        `which is not in the REQ-033 registry`
    );
  }
  if (!ingredientUnit) {
    throw new Error(
      `Recipe ingredient for ${inventoryDescription} uses unit ` +
        `'${ingredientUnitId}' which is not in the REQ-033 registry`
    );
  }

  if (inventoryUnit.category !== ingredientUnit.category) {
    throw new Error(
      `Recipe ingredient for ${inventoryDescription} uses unit ` +
        `'${ingredientUnitId}' (${ingredientUnit.category}) but inventory ` +
        `is stored in '${inventoryUnitId}' (${inventoryUnit.category}) — ` +
        `cross-dimension units cannot be combined`
    );
  }

  if (STRICT_MATCH_UOM_CATEGORIES.includes(ingredientUnit.category)) {
    if (ingredientUnitId !== inventoryUnitId) {
      throw new Error(
        `Recipe ingredient for ${inventoryDescription} uses unit ` +
          `'${ingredientUnitId}' but inventory is stored in ` +
          `'${inventoryUnitId}' — ${ingredientUnit.category} units have no ` +
          `fungible conversion (e.g. eggs ≠ cartons); the recipe and ` +
          `inventory units must match exactly`
      );
    }
  }
}
