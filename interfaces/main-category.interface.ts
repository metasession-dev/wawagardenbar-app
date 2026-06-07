/**
 * REQ-075 — Configurable main categories.
 *
 * Replaces the hardcoded `MenuMainCategory = 'food' | 'drinks'` union with
 * an admin-configurable registry persisted under SystemSettings key
 * `'main-categories'`. MenuItem.mainCategory becomes a free-form string;
 * validation moves to the application layer via this registry.
 *
 * @see services/main-category-service.ts for the CRUD + rename + delete
 *      operations.
 * @see interfaces/menu-settings.interface.ts for the sub-category settings
 *      that key off each main category's slug.
 * @see SRS REQ-MENUMGT-005 (added in this REQ).
 */

export interface IMainCategoryConfig {
  /**
   * Stable slug used as `MenuItem.mainCategory` and as the keying value
   * for `IMenuSettings` (sub-categories under this main category).
   * Immutable once created — to rename, use `MainCategoryService.rename`
   * which transactionally updates all referencing rows.
   */
  readonly slug: string;

  /**
   * Human-readable label shown in the customer menu nav, admin forms,
   * and reports. Editable.
   */
  label: string;

  /**
   * Display order in nav, settings list, and reports. Lower = earlier.
   * Operator-set via drag-reorder in the settings UI.
   */
  order: number;

  /**
   * Soft-disable without deleting. When false, the main category and
   * all items under it are hidden from the customer menu but stay
   * queryable through admin views + historical reports.
   */
  isEnabled: boolean;

  /**
   * Optional emoji or icon identifier shown in customer menu cards and
   * admin badges. Replaces the hardcoded ternary in menu-item.tsx.
   * Examples: `'🍽️'`, `'🥤'`, `'🍰'`.
   */
  icon?: string;

  /**
   * Whether MenuItems under this main category support half/full portion
   * sizes. Replaces the food-only conditional in menu-item-detail-modal.
   * Defaults to false on create — operator opts in per-category.
   */
  portionsEnabled?: boolean;
}

/**
 * Seed values for the registry. Matches the pre-REQ-075 hardcoded enum
 * `'food' | 'drinks'` so existing MenuItems carry through unchanged.
 *
 * `portionsEnabled` mirrors the prior food-only conditional from
 * `menu-item-detail-modal.tsx`. `icon` mirrors the prior emoji from
 * `menu-item.tsx`.
 */
export const DEFAULT_MAIN_CATEGORIES: IMainCategoryConfig[] = [
  {
    slug: 'food',
    label: 'Food',
    order: 0,
    isEnabled: true,
    icon: '🍽️',
    portionsEnabled: true,
  },
  {
    slug: 'drinks',
    label: 'Drinks',
    order: 1,
    isEnabled: true,
    icon: '🥤',
    portionsEnabled: false,
  },
];

/**
 * SystemSettings key under which the `IMainCategoryConfig[]` list is
 * persisted. Read via `SystemSettingsService.getMainCategories`.
 */
export const MAIN_CATEGORIES_SETTINGS_KEY = 'main-categories';

/**
 * Slug validation regex. Lowercase alphanumeric + hyphen-separated.
 * Maximum 32 characters. Mirrors the existing sub-category slug shape
 * used in `MenuCategoriesForm` for the auto-from-label derivation.
 */
export const MAIN_CATEGORY_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * Reserved slug names — already used elsewhere in the codebase as
 * meaningful identifiers OR will be after this REQ ships. Refused on
 * `create` and `rename`.
 */
export const RESERVED_MAIN_CATEGORY_SLUGS = new Set([
  'all',
  'other',
  'unknown',
]);
