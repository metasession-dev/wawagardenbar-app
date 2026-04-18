'use server';

import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * @requirement REQ-028
 */
export async function getExpenseCategoriesAction() {
  try {
    const categories = await SystemSettingsService.getExpenseCategories();

    return {
      success: true as const,
      categories,
    };
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch expense categories',
      categories: {
        directCostCategories: [],
        operatingExpenseCategories: [],
        directCostGroups: [],
        operatingExpenseGroups: [],
      },
    };
  }
}
