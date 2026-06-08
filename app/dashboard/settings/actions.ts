'use server';

import { requireSuperAdmin } from '@/lib/auth-middleware';
import { SystemSettingsService } from '@/services/system-settings-service';
import { revalidatePath } from 'next/cache';
import type { ExpenseCategoriesSettings } from '@/interfaces/expense.interface';

export async function updatePaymentSettingsAction(settings: {
  activeProvider: 'monnify' | 'paystack';
  paystack: {
    enabled: boolean;
    mode: 'test' | 'live';
    publicKey: string;
    secretKey: string;
  };
}) {
  const session = await requireSuperAdmin();

  await SystemSettingsService.updatePaymentSettings(settings, session.userId!);

  revalidatePath('/dashboard/settings');
  return { success: true };
}

/**
 * @requirement REQ-028
 */
export async function updateExpenseCategoriesAction(
  categories: ExpenseCategoriesSettings
) {
  try {
    const session = await requireSuperAdmin();

    await SystemSettingsService.updateExpenseCategories(
      categories,
      session.userId!
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/finance/expenses');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update expense categories',
    };
  }
}

export async function getBusinessDayCutoffAction(): Promise<{
  success: boolean;
  cutoff?: string;
  error?: string;
}> {
  try {
    const cutoff = await SystemSettingsService.getBusinessDayCutoff();
    return { success: true, cutoff };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cutoff',
    };
  }
}

export async function updateBusinessDayCutoffAction(
  cutoffTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSuperAdmin();
    await SystemSettingsService.updateBusinessDayCutoff(
      cutoffTime,
      session.userId!
    );
    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update cutoff',
    };
  }
}

/**
 * @requirement REQ-033 - App-wide Unit-of-Measurement registry
 */
export async function updateUnitsOfMeasurementAction(
  units: import('@/interfaces/unit-of-measurement.interface').UnitOfMeasurement[]
) {
  try {
    const session = await requireSuperAdmin();

    await SystemSettingsService.updateUnitsOfMeasurement(
      units,
      session.userId!
    );

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/finance/expenses');
    revalidatePath('/dashboard/menu');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update units of measurement',
    };
  }
}

export async function updateMenuCategoriesAction(
  settings: import('@/interfaces/menu-settings.interface').IMenuSettings
) {
  try {
    const session = await requireSuperAdmin();

    await SystemSettingsService.updateMenuCategories(settings, session.userId!);

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/menu');
    revalidatePath('/menu'); // Revalidate public menu page

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update menu categories',
    };
  }
}

// ─── REQ-075 — Main categories admin actions ───────────────────────────────
//
// CRUD + rename + delete + reorder for the configurable main-category
// registry. All authorisation is super-admin only via `requireSuperAdmin`;
// service-layer guards (reserved slug, duplicate, reference-count) raise
// errors that are surfaced verbatim to the UI.

type ActionResult<T = void> = T extends void
  ? { success: boolean; error?: string }
  : { success: boolean; error?: string; data?: T };

async function withSuperAdmin<T>(
  work: (userId: string) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const session = await requireSuperAdmin();
    const data = await work(session.userId!);

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/menu');
    revalidatePath('/menu');

    return { success: true, data } as ActionResult<T>;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Main category update failed',
    } as ActionResult<T>;
  }
}

export async function createMainCategoryAction(input: {
  label: string;
  slug?: string;
  icon?: string;
  portionsEnabled?: boolean;
}) {
  const { MainCategoryService } = await import(
    '@/services/main-category-service'
  );
  return withSuperAdmin((userId) => MainCategoryService.create(input, userId));
}

export async function updateMainCategoryAction(
  slug: string,
  patch: {
    label?: string;
    isEnabled?: boolean;
    icon?: string;
    portionsEnabled?: boolean;
  }
) {
  const { MainCategoryService } = await import(
    '@/services/main-category-service'
  );
  return withSuperAdmin((userId) =>
    MainCategoryService.update(slug, patch, userId)
  );
}

export async function renameMainCategoryAction(
  oldSlug: string,
  newSlug: string
) {
  const { MainCategoryService } = await import(
    '@/services/main-category-service'
  );
  return withSuperAdmin((userId) =>
    MainCategoryService.rename(oldSlug, newSlug, userId)
  );
}

export async function reorderMainCategoriesAction(slugs: string[]) {
  const { MainCategoryService } = await import(
    '@/services/main-category-service'
  );
  return withSuperAdmin((userId) => MainCategoryService.reorder(slugs, userId));
}

export async function deleteMainCategoryAction(slug: string) {
  const { MainCategoryService } = await import(
    '@/services/main-category-service'
  );
  return withSuperAdmin((userId) => MainCategoryService.delete(slug, userId));
}

// REQ-075 — Read-only fetch used by admin client components (filters,
// selects). Not auth-gated; the same list is already exposed publicly
// via `GET /api/public/menu/categories`. Mutations remain super-admin
// only via the actions above.
export async function getMainCategoriesAction() {
  try {
    const list = await SystemSettingsService.getMainCategories();
    return { success: true as const, data: list };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to read main categories',
    };
  }
}

export async function getMainCategoryReferenceCountAction(slug: string) {
  try {
    await requireSuperAdmin();
    const { MainCategoryService } = await import(
      '@/services/main-category-service'
    );
    const data = await MainCategoryService.referenceCount(slug);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read counts',
    };
  }
}
