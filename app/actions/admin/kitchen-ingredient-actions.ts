'use server';

/**
 * @requirement REQ-034 / D7 — Create kitchen-ingredient inventory rows.
 *
 * Inventory rows pair 1:1 with MenuItems via `menuItemId: { required:
 * true, unique: true }`. To create a kitchen-ingredient inventory row,
 * we therefore create a paired hidden MenuItem first (with
 * `kind:'kitchen-ingredient'`, `isAvailable:false`, and a fixed
 * description noting it's not customer-facing), then the matching
 * Inventory row. The MenuItem is reaped on Inventory-creation failure
 * so we don't leak half-pairs.
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import { RecipeService } from '@/services/recipe-service';

interface CreateKitchenIngredientInput {
  name: string;
  category: string;
  unit: string;
  currentStock?: number;
  minimumStock?: number;
  maximumStock?: number;
}

async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

function requireInventoryManagement(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role === 'super-admin') return;
  if (!session.permissions?.inventoryManagement) {
    throw new Error('Insufficient permissions — inventoryManagement required');
  }
}

export async function createKitchenIngredientAction(
  input: CreateKitchenIngredientInput
) {
  try {
    const session = await getSession();
    requireInventoryManagement(session);

    if (!input.name?.trim()) {
      return { success: false as const, error: 'Name is required' };
    }
    if (!input.category?.trim()) {
      return { success: false as const, error: 'Category is required' };
    }
    if (!input.unit?.trim()) {
      return { success: false as const, error: 'Unit is required' };
    }
    const currentStock = input.currentStock ?? 0;
    const minimumStock = input.minimumStock ?? 0;
    const maximumStock = input.maximumStock ?? 0;
    if (currentStock < 0 || minimumStock < 0 || maximumStock < 0) {
      return {
        success: false as const,
        error: 'Stock fields must be non-negative',
      };
    }
    if (maximumStock < minimumStock) {
      return {
        success: false as const,
        error: 'Maximum stock must be ≥ minimum stock',
      };
    }

    await connectDB();

    // Create the hidden MenuItem first so we have a stable _id to pair.
    const menuItem = await MenuItemModel.create({
      kind: 'kitchen-ingredient',
      name: input.name.trim(),
      description:
        'Kitchen ingredient — used in recipes; not visible on the customer menu.',
      mainCategory: 'food',
      category: input.category.trim(),
      price: 0,
      costPerUnit: 0,
      preparationTime: 0,
      isAvailable: false,
    });

    try {
      const inventory = await InventoryModel.create({
        menuItemId: menuItem._id,
        kind: 'kitchen-ingredient',
        currentStock,
        minimumStock,
        maximumStock,
        unit: input.unit.trim(),
        costPerUnit: 0,
      });
      revalidatePath('/dashboard/inventory');
      return {
        success: true as const,
        inventoryId: inventory._id.toString(),
        menuItemId: menuItem._id.toString(),
      };
    } catch (err) {
      // Reap the orphaned MenuItem so the pair stays consistent.
      await MenuItemModel.findByIdAndDelete(menuItem._id);
      throw err;
    }
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create kitchen ingredient',
    };
  }
}

interface UpdateKitchenIngredientInput {
  inventoryId: string;
  name: string;
  category: string;
  minimumStock?: number;
  maximumStock?: number;
}

/**
 * REQ-037 AC2 — Edit a kitchen-ingredient pair.
 *
 * Updates the paired MenuItem (`name`, `category`) AND the Inventory row
 * (`minimumStock`, `maximumStock`) atomically from the operator's view. If
 * one write succeeds and the other fails the operator gets a clear error
 * naming what didn't write — we DON'T roll back silently because that
 * would mask the inconsistency. Out-of-scope by design: unit and
 * currentStock are NOT editable here (changing them retroactively would
 * corrupt audit-trail integrity).
 */
export async function updateKitchenIngredientAction(
  input: UpdateKitchenIngredientInput
) {
  try {
    const session = await getSession();
    requireInventoryManagement(session);

    if (!input.inventoryId?.trim()) {
      return { success: false as const, error: 'inventoryId is required' };
    }
    if (!input.name?.trim()) {
      return { success: false as const, error: 'Name is required' };
    }
    if (!input.category?.trim()) {
      return { success: false as const, error: 'Category is required' };
    }
    const minimumStock = input.minimumStock ?? 0;
    const maximumStock = input.maximumStock ?? 0;
    if (minimumStock < 0 || maximumStock < 0) {
      return {
        success: false as const,
        error: 'Stock fields must be non-negative',
      };
    }
    if (maximumStock < minimumStock) {
      return {
        success: false as const,
        error: 'Maximum stock must be ≥ minimum stock',
      };
    }

    await connectDB();

    const inventory = await InventoryModel.findById(input.inventoryId);
    if (!inventory) {
      return { success: false as const, error: 'Inventory row not found' };
    }
    if (inventory.kind !== 'kitchen-ingredient') {
      return {
        success: false as const,
        error: 'This action only edits kitchen-ingredient inventory rows',
      };
    }
    if (inventory.archivedAt) {
      return {
        success: false as const,
        error:
          'Cannot edit an archived ingredient — restore or recreate it first',
      };
    }

    // Update MenuItem first. If this fails we never touch Inventory, so
    // there's no partial-write to reconcile.
    try {
      await MenuItemModel.findByIdAndUpdate(inventory.menuItemId, {
        name: input.name.trim(),
        category: input.category.trim(),
      });
    } catch (err) {
      return {
        success: false as const,
        error: `Failed to update menu-item: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }

    // Then Inventory thresholds. If THIS fails we surface the partial
    // state explicitly rather than silently reverting the MenuItem.
    try {
      await InventoryModel.findByIdAndUpdate(input.inventoryId, {
        minimumStock,
        maximumStock,
      });
    } catch (err) {
      return {
        success: false as const,
        error:
          `Menu-item was updated but inventory thresholds failed to save: ${
            err instanceof Error ? err.message : String(err)
          }. ` +
          `Reopen the ingredient and retry the thresholds; the name/category change already persisted.`,
      };
    }

    revalidatePath('/dashboard/inventory');
    return {
      success: true as const,
      inventoryId: input.inventoryId,
      menuItemId: inventory.menuItemId.toString(),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update kitchen ingredient',
    };
  }
}

/**
 * REQ-037 AC3 + AC4 — Archive a kitchen-ingredient pair.
 *
 * Blocks if any ACTIVE recipe references the inventory row (error names
 * the offending recipes so the operator knows what to deactivate first).
 *
 * On success: stamps `archivedAt` on both the paired MenuItem and the
 * Inventory row. The rows stay queryable by `_id` so historical
 * StockMovement / Expense / CostHistory back-refs continue to resolve;
 * the archive flag is purely a listing-side filter.
 *
 * Archived ingredients can be restored later via
 * `restoreKitchenIngredientAction` — the operator-facing "Delete"
 * verb is intentionally avoided in favour of "Archive" so the
 * reversibility is honest. Aligns with the Recipe deactivate/reactivate
 * pattern shipped under REQ-034.
 */
export async function archiveKitchenIngredientAction(inventoryId: string) {
  try {
    const session = await getSession();
    requireInventoryManagement(session);

    if (!inventoryId?.trim()) {
      return { success: false as const, error: 'inventoryId is required' };
    }

    await connectDB();

    const inventory = await InventoryModel.findById(inventoryId);
    if (!inventory) {
      return { success: false as const, error: 'Inventory row not found' };
    }
    if (inventory.kind !== 'kitchen-ingredient') {
      return {
        success: false as const,
        error: 'This action only deletes kitchen-ingredient inventory rows',
      };
    }
    if (inventory.archivedAt) {
      return {
        success: false as const,
        error: 'This ingredient is already archived',
      };
    }

    // AC3 — safe-removal guard.
    const blockingRecipes =
      await RecipeService.findActiveRecipesReferencingInventory(inventoryId);
    if (blockingRecipes.length > 0) {
      const names = blockingRecipes.map((r) => `'${r.name}'`).join(', ');
      // Look up the ingredient's display name from the paired MenuItem.
      const menuItem = await MenuItemModel.findById(inventory.menuItemId, {
        name: 1,
      });
      const ingredientName = menuItem?.name ?? 'this ingredient';
      return {
        success: false as const,
        error:
          `Cannot archive '${ingredientName}': used in active recipe${
            blockingRecipes.length === 1 ? '' : 's'
          } ${names}. ` +
          `Deactivate ${
            blockingRecipes.length === 1 ? 'that recipe' : 'those recipes'
          } first, or use Recipes → Deactivate.`,
      };
    }

    const now = new Date();

    // Archive the MenuItem first. If this fails we don't touch the
    // Inventory row, so the pair stays in a consistent state.
    try {
      await MenuItemModel.findByIdAndUpdate(inventory.menuItemId, {
        archivedAt: now,
      });
    } catch (err) {
      return {
        success: false as const,
        error: `Failed to archive menu-item: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }

    try {
      await InventoryModel.findByIdAndUpdate(inventoryId, { archivedAt: now });
    } catch (err) {
      // Compensate: un-archive the MenuItem to keep the pair consistent.
      await MenuItemModel.findByIdAndUpdate(inventory.menuItemId, {
        $unset: { archivedAt: '' },
      });
      return {
        success: false as const,
        error: `Failed to archive inventory row: ${
          err instanceof Error ? err.message : String(err)
        }. Menu-item archive was reverted to keep the pair consistent.`,
      };
    }

    revalidatePath('/dashboard/inventory');
    return {
      success: true as const,
      inventoryId,
      menuItemId: inventory.menuItemId.toString(),
      archivedAt: now,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to archive kitchen ingredient',
    };
  }
}

/**
 * REQ-037 AC7 — Restore an archived kitchen-ingredient pair.
 *
 * Clears `archivedAt` on both the paired MenuItem and Inventory row,
 * making the ingredient visible again on the Kitchen tab, in the
 * Recipe builder dropdown, and in the Expense form "Add to kitchen
 * inventory" dropdown.
 *
 * No active-recipe guard is needed on restore — restoring is purely
 * additive (it doesn't change what any recipe currently references;
 * the recipe's `inventoryId` link to this row never broke because the
 * archive was soft).
 *
 * Idempotency: restoring a row that is NOT archived returns a clear
 * error rather than silently no-op'ing, so the operator's intent is
 * unambiguous.
 */
export async function restoreKitchenIngredientAction(inventoryId: string) {
  try {
    const session = await getSession();
    requireInventoryManagement(session);

    if (!inventoryId?.trim()) {
      return { success: false as const, error: 'inventoryId is required' };
    }

    await connectDB();

    const inventory = await InventoryModel.findById(inventoryId);
    if (!inventory) {
      return { success: false as const, error: 'Inventory row not found' };
    }
    if (inventory.kind !== 'kitchen-ingredient') {
      return {
        success: false as const,
        error: 'This action only restores kitchen-ingredient inventory rows',
      };
    }
    if (!inventory.archivedAt) {
      return {
        success: false as const,
        error: 'This ingredient is not archived',
      };
    }

    // Restore the MenuItem first. If this fails we never touch
    // Inventory, so the pair stays in a consistent "archived" state.
    try {
      await MenuItemModel.findByIdAndUpdate(inventory.menuItemId, {
        $unset: { archivedAt: '' },
      });
    } catch (err) {
      return {
        success: false as const,
        error: `Failed to restore menu-item: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }

    try {
      await InventoryModel.findByIdAndUpdate(inventoryId, {
        $unset: { archivedAt: '' },
      });
    } catch (err) {
      // Compensate: re-archive the MenuItem to keep the pair consistent.
      await MenuItemModel.findByIdAndUpdate(inventory.menuItemId, {
        archivedAt: inventory.archivedAt,
      });
      return {
        success: false as const,
        error: `Failed to restore inventory row: ${
          err instanceof Error ? err.message : String(err)
        }. Menu-item restore was reverted to keep the pair consistent.`,
      };
    }

    revalidatePath('/dashboard/inventory');
    return {
      success: true as const,
      inventoryId,
      menuItemId: inventory.menuItemId.toString(),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to restore kitchen ingredient',
    };
  }
}

/** Returns the COGS category options + the active UoM registry, so the
 *  client form can render its dropdowns without two round-trips.
 *
 *  COGS categories are sourced from the same `expense-categories`
 *  system-settings entry the Expense form uses
 *  (`SystemSettingsService.getExpenseCategories`), so any custom
 *  categories added via Settings → Expense Categories flow through
 *  here too. `directCostGroups` is also returned so the client can
 *  render a grouped dropdown matching the Expense form's UX.
 */
export async function getKitchenIngredientFormOptionsAction() {
  try {
    const session = await getSession();
    requireInventoryManagement(session);
    const [units, expenseCategories] = await Promise.all([
      SystemSettingsService.getUnitsOfMeasurement(),
      SystemSettingsService.getExpenseCategories(),
    ]);
    return {
      success: true as const,
      categories: expenseCategories.directCostCategories,
      categoryGroups: expenseCategories.directCostGroups ?? [],
      units: units
        .filter((u) => u.isActive)
        .map((u) => ({ id: u.id, label: u.label, category: u.category })),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : 'Failed to load form options',
      categories: [],
      categoryGroups: [],
      units: [],
    };
  }
}
