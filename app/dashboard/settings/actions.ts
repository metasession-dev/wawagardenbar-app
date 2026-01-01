'use server';

import { requireSuperAdmin } from '@/lib/auth-middleware';
import { SystemSettingsService } from '@/services/system-settings-service';
import { revalidatePath } from 'next/cache';

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

export async function updateExpenseCategoriesAction(categories: {
  directCostCategories: string[];
  operatingExpenseCategories: string[];
}) {
  try {
    const session = await requireSuperAdmin();
    
    await SystemSettingsService.updateExpenseCategories(categories, session.userId!);
    
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/finance/expenses');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update expense categories',
    };
  }
}

export async function updateMenuCategoriesAction(settings: import('@/interfaces/menu-settings.interface').IMenuSettings) {
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
      error: error instanceof Error ? error.message : 'Failed to update menu categories',
    };
  }
}
