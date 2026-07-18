/** @requirement REQ-094 - Immutable category attribution for order lines. */

export type CategoryAttributionSource =
  | 'sale_time'
  | 'legacy_current_menu_fallback';

export interface CategoryAttribution {
  mainCategoryAtSale?: string;
  categoryAtSale?: string;
  categoryAtSaleSource?: CategoryAttributionSource;
}

export interface MenuCategoryMetadata {
  mainCategory?: string;
  category?: string;
}

/**
 * Returns a disclosed legacy attribution only when current menu metadata can
 * fill both category dimensions. This helper is pure so the migration's
 * additive/idempotent behaviour can be verified without a database.
 */
export function legacyCategoryAttribution(
  existing: CategoryAttribution,
  menuItem?: MenuCategoryMetadata | null
): CategoryAttribution | undefined {
  if (existing.mainCategoryAtSale && existing.categoryAtSale) {
    return undefined;
  }
  if (!menuItem?.mainCategory || !menuItem.category) {
    return undefined;
  }
  return {
    mainCategoryAtSale: menuItem.mainCategory,
    categoryAtSale: menuItem.category,
    categoryAtSaleSource: 'legacy_current_menu_fallback',
  };
}
