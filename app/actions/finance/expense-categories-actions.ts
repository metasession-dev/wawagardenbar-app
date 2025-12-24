'use server';

import { SystemSettingsService } from '@/services/system-settings-service';

export async function getExpenseCategoriesAction() {
  try {
    const categories = await SystemSettingsService.getExpenseCategories();
    
    return {
      success: true,
      categories,
    };
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expense categories',
      categories: {
        directCostCategories: [],
        operatingExpenseCategories: [],
      },
    };
  }
}
