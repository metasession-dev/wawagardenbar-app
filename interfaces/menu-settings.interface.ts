export interface IMenuCategoryConfig {
  label: string;
  value: string;
  order: number;
  isEnabled: boolean;
}

export interface IMenuSettings {
  food: IMenuCategoryConfig[];
  drinks: IMenuCategoryConfig[];
}

export const DEFAULT_MENU_SETTINGS: IMenuSettings = {
  food: [
    { label: 'Starters', value: 'starters', order: 1, isEnabled: true },
    { label: 'Main Courses', value: 'main-courses', order: 2, isEnabled: true },
    { label: 'Rice Dishes', value: 'rice-dishes', order: 3, isEnabled: true },
    { label: 'Swallow', value: 'swallow', order: 4, isEnabled: true },
    { label: 'Soups', value: 'soups', order: 5, isEnabled: true },
    { label: 'Pepper Soup', value: 'pepper-soup', order: 6, isEnabled: true },
    { label: 'Noodles', value: 'noodles', order: 7, isEnabled: true },
    { label: 'Sauce', value: 'sauce', order: 8, isEnabled: true },
    { label: 'Small Chops', value: 'small-chops', order: 9, isEnabled: true },
    { label: 'Desserts', value: 'desserts', order: 10, isEnabled: true },
    { label: 'Sides', value: 'sides', order: 11, isEnabled: true },
  ],
  drinks: [
    { label: 'Beer (Local)', value: 'beer-local', order: 1, isEnabled: true },
    { label: 'Beer (Imported)', value: 'beer-imported', order: 2, isEnabled: true },
    { label: 'Beer (Craft)', value: 'beer-craft', order: 3, isEnabled: true },
    { label: 'Wine', value: 'wine', order: 4, isEnabled: true },
    { label: 'Soft Drinks', value: 'soft-drinks', order: 5, isEnabled: true },
    { label: 'Water', value: 'water', order: 6, isEnabled: true },
    { label: 'Juice', value: 'juice', order: 7, isEnabled: true },
    { label: 'Energy Drink', value: 'energy-drink', order: 8, isEnabled: true },
    { label: 'Malt', value: 'malt', order: 9, isEnabled: true },
    { label: 'Yoghurt', value: 'yoghurt', order: 10, isEnabled: true },
    { label: 'Healthy Soft Drink', value: 'healthy-soft-drink', order: 11, isEnabled: true },
    { label: 'Cider', value: 'cider', order: 12, isEnabled: true },
    { label: 'Pre-mixed Spirit', value: 'pre-mixed-spirit', order: 13, isEnabled: true },
    { label: 'Bitters', value: 'bitters', order: 14, isEnabled: true },
    { label: 'Liqueur', value: 'liqueur', order: 15, isEnabled: true },
    { label: 'Whisky', value: 'whisky', order: 16, isEnabled: true },
    { label: 'Tequila', value: 'tequila', order: 17, isEnabled: true },
    { label: 'Cocktails', value: 'cocktails', order: 18, isEnabled: true },
  ],
};
