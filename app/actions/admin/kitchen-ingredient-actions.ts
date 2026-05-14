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
