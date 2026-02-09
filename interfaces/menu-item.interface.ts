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

export interface ICustomizationOption {
  name: string;
  price: number;
  available: boolean;
}

export interface ICustomization {
  name: string;
  required: boolean;
  options: ICustomizationOption[];
}

export interface IMenuItem {
  _id: string;
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
  inventoryId?: string;
  pointsValue?: number;
  pointsRedeemable: boolean;
  portionOptions: {
    halfPortionEnabled: boolean;
    halfPortionSurcharge: number;
    quarterPortionEnabled: boolean;
    quarterPortionSurcharge: number;
  };
  allowManualPriceOverride: boolean;
  createdAt: string;
  updatedAt: string;
}
