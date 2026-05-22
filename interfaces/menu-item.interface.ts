export type MenuCategory =
  | 'beer-local'
  | 'beer-imported'
  | 'beer-craft'
  | 'wine'
  | 'soft-drinks'
  | 'starters'
  | 'main-courses'
  | 'desserts'
  | 'cider'
  | 'pre-mixed-spirit'
  | 'bitters'
  | 'liqueur'
  | 'whisky'
  | 'tequila'
  | 'energy-drink'
  | 'juice'
  | 'yoghurt'
  | 'malt'
  | 'water'
  | 'healthy-soft-drink'
  | 'soups'
  | 'swallow'
  | 'sauce'
  | 'rice-dishes'
  | 'noodles'
  | 'small-chops'
  | 'pepper-soup';

export type MenuMainCategory = 'drinks' | 'food';

/**
 * REQ-034: discriminator on MenuItem mirrors the one on Inventory.
 * Customer-menu queries filter `kind: 'menu-item'` so kitchen-ingredient
 * MenuItems (created as foreign-key targets for kitchen-ingredient
 * Inventory rows) never appear on customer-facing surfaces.
 *
 * Kept as an alias of `InventoryKind` so the two stay in sync.
 */
export type MenuItemKind = import('./inventory.interface').InventoryKind;

export interface ICustomizationOption {
  name: string;
  price: number;
  available: boolean;
  inventoryId?: string;
  inventoryDeduction?: number;
}

export interface ICustomization {
  name: string;
  required: boolean;
  options: ICustomizationOption[];
}

export interface IMenuItem {
  _id: string;
  /**
   * REQ-034: discriminates sellable items from kitchen-ingredient targets.
   * Defaults to `'menu-item'` for legacy rows after the backfill script runs.
   */
  kind: MenuItemKind;
  name: string;
  description: string;
  mainCategory: MenuMainCategory;
  category: MenuCategory;
  price: number;
  costPerUnit: number;
  images: string[];
  customizations: ICustomization[];
  isAvailable: boolean;
  preparationTime: number;
  servingSize?: string;
  tags: string[];
  allergens: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'extra-hot';
  };
  slug?: string;
  metaDescription?: string;
  trackInventory: boolean;
  pointsValue?: number;
  pointsRedeemable: boolean;
  portionOptions: {
    halfPortionEnabled: boolean;
    halfPortionSurcharge: number;
    quarterPortionEnabled: boolean;
    quarterPortionSurcharge: number;
  };
  allowManualPriceOverride: boolean;
  /**
   * REQ-037 — Soft-delete marker for the hidden MenuItem paired with a
   * kitchen-ingredient inventory row. Mirrors `Inventory.archivedAt`.
   * Never set on sellable menu items.
   */
  archivedAt?: Date;
  /**
   * REQ-038 — UoM-registry id that locks the Expense form's Unit field
   * when restocking this item via "Update inventory count". Sourced
   * from the active UoM registry (REQ-033). `undefined` (the default)
   * means "Any (operator chooses at expense time)" — the legacy
   * behaviour. Generic over unit id; not bottles-hardcoded.
   */
  expenseUnitOverride?: string;
  createdAt: string;
  updatedAt: string;
}
