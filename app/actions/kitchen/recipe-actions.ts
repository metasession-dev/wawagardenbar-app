'use server';

/**
 * @requirement REQ-034 AC8/AC9/AC16 — Recipe CRUD server actions.
 *
 * Kitchen / admin / super-admin can create + edit recipes; only
 * super-admin can deactivate / reactivate (matches the existing pattern
 * where deactivations affect downstream historical reports).
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { RecipeService } from '@/services/recipe-service';
import { InventoryService } from '@/services';
import MenuItemModel from '@/models/menu-item-model';
import { connectDB } from '@/lib/mongodb';
import type {
  CreateRecipeDTO,
  UpdateRecipeDTO,
} from '@/interfaces/recipe.interface';

async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

function requireKitchenManagement(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  // Super-admin has every permission unconditionally.
  if (session.role === 'super-admin') return;
  if (!session.permissions?.kitchenManagement) {
    throw new Error('Insufficient permissions — kitchenManagement required');
  }
}

function requireSuperAdmin(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role !== 'super-admin') {
    throw new Error('Only super-admin can perform this action');
  }
}

export async function createRecipeAction(
  data: Omit<CreateRecipeDTO, 'createdBy'>
) {
  try {
    const session = await getSession();
    requireKitchenManagement(session);
    const recipe = await RecipeService.createRecipe({
      ...data,
      createdBy: session.userId!,
    });
    revalidatePath('/dashboard/kitchen/recipes');
    return {
      success: true as const,
      recipe: JSON.parse(JSON.stringify(recipe)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to create recipe',
    };
  }
}

export async function updateRecipeAction(id: string, data: UpdateRecipeDTO) {
  try {
    const session = await getSession();
    requireKitchenManagement(session);
    const recipe = await RecipeService.updateRecipe(id, data);
    revalidatePath('/dashboard/kitchen/recipes');
    revalidatePath(`/dashboard/kitchen/recipes/${id}`);
    return {
      success: true as const,
      recipe: JSON.parse(JSON.stringify(recipe)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to update recipe',
    };
  }
}

export async function deactivateRecipeAction(id: string) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const recipe = await RecipeService.deactivateRecipe(id);
    revalidatePath('/dashboard/kitchen/recipes');
    return {
      success: true as const,
      recipe: JSON.parse(JSON.stringify(recipe)),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : 'Failed to deactivate recipe',
    };
  }
}

export async function reactivateRecipeAction(id: string) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const recipe = await RecipeService.reactivateRecipe(id);
    revalidatePath('/dashboard/kitchen/recipes');
    return {
      success: true as const,
      recipe: JSON.parse(JSON.stringify(recipe)),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : 'Failed to reactivate recipe',
    };
  }
}

export async function listRecipesAction(includeInactive = false) {
  try {
    const session = await getSession();
    requireKitchenManagement(session);
    const recipes = includeInactive
      ? await RecipeService.listAllRecipes()
      : await RecipeService.listActiveRecipes();
    return {
      success: true as const,
      recipes: JSON.parse(JSON.stringify(recipes)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to list recipes',
      recipes: [],
    };
  }
}

export async function getRecipeAction(id: string) {
  try {
    const session = await getSession();
    requireKitchenManagement(session);
    const recipe = await RecipeService.getRecipeById(id);
    if (!recipe) return { success: false as const, error: 'Recipe not found' };
    return {
      success: true as const,
      recipe: JSON.parse(JSON.stringify(recipe)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to load recipe',
    };
  }
}

/**
 * REQ-034 — option-list helpers consumed by the recipe builder.
 */
export async function listRecipeFormOptionsAction() {
  try {
    const session = await getSession();
    requireKitchenManagement(session);
    await connectDB();
    const [targets, kitchenInventory] = await Promise.all([
      MenuItemModel.find({ kind: 'menu-item' })
        .select('_id name mainCategory category')
        .sort({ name: 1 })
        .lean(),
      InventoryService.listByKind('kitchen-ingredient'),
    ]);
    return {
      success: true as const,
      targets: targets.map((t: any) => ({
        id: t._id.toString(),
        name: t.name,
        mainCategory: t.mainCategory,
        category: t.category,
      })),
      ingredients: kitchenInventory.map((inv: any) => {
        const mi = inv.menuItemId;
        return {
          id: inv._id.toString(),
          name: mi?.name ?? 'Unknown ingredient',
          unit: inv.unit,
          currentStock: inv.currentStock,
        };
      }),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load recipe form options',
      targets: [],
      ingredients: [],
    };
  }
}
