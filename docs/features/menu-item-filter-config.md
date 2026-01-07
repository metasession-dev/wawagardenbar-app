# Menu Item Filter (Category) Management Design

## Overview
Currently, the Wawa Garden Bar application uses a hardcoded list of menu categories (filters) in the `MenuItemForm` component, which restricts the available categories for menu items. While the database schema supports a wider range of categories (like 'swallow', 'pepper-soup', etc.), the UI does not expose them all, and adding new ones requires code changes.

This design proposes a dynamic system to manage menu item filters (categories) via the Admin Dashboard Settings, allowing admins to:
1. Define available categories for Food and Drinks.
2. Control the display label and order of these categories.
3. Assign these categories to menu items in the Edit/Create Menu Item page.

## Problem Statement
- **Hardcoded UI Lists**: `MenuItemForm` has a limited, hardcoded list of categories (e.g., only Main Courses, Starters, Desserts, Sides for food), missing many valid options like Swallow, Pepper Soup, etc.
- **Inflexibility**: Adding a new category requires a developer to modify the codebase (interface types, mongoose schema enums, and UI constants).
- **User Request**: The user wants to manage these "filters" in `Dashboard > Settings` and apply them in `Dashboard > Menu > Edit`.

## Proposed Solution

### 1. Data Model Changes

#### System Settings
We will use the existing `SystemSettings` collection to store the configuration for menu categories.

**New Setting Key**: `menu-categories`

**Structure**:
```typescript
interface IMenuCategoryConfig {
  label: string; // Display name (e.g., "Swallow")
  value: string; // Internal slug (e.g., "swallow")
  order: number; // For sorting
  isEnabled: boolean; // To hide without deleting
}

interface IMenuSettings {
  food: IMenuCategoryConfig[];
  drinks: IMenuCategoryConfig[];
}
```

#### Mongoose Schema (`MenuItemModel`)
We need to relax the strict `enum` validation on the `category` field in `MenuItemModel` to allow for dynamically created categories.

**Change**:
- Remove `enum: [...]` from the `category` field definition.
- Keep `type: String` and `required: true`.
- Validation will be handled at the application level (ensuring the category exists in the active settings).

### 2. Services

#### `SystemSettingsService`
- Add methods to `getMenuCategories()` and `updateMenuCategories()`.
- Initialize with a comprehensive default list (merging the existing hardcoded enum values).

#### `CategoryService`
- Update to fetch available categories from `SystemSettings` instead of relying solely on `distinct` queries or hardcoded lists.

### 3. User Interface

#### Settings Page (`/dashboard/settings`)
- New Section: **Menu Item Filter Management**.
- Component: `MenuCategoriesForm`.
- Features:
  - Tabs for "Food" and "Drinks".
  - List of existing categories with drag-and-drop reordering (or simple up/down buttons).
  - "Add Category" input (Label & Value).
  - Edit/Delete/Toggle Visibility actions.

#### Menu Item Form (`/dashboard/menu/.../edit`)
- Replace hardcoded `foodCategories` and `drinkCategories` arrays.
- Fetch available categories dynamically from `SystemSettings`.
- Populate the "Category" dropdown with these dynamic values.

## Implementation Plan

### Phase 1: Backend & Schema
1.  **Update `MenuItemModel`**: Remove `enum` validation from `category`.
2.  **Update `SystemSettingsService`**: Implement logic to store/retrieve menu categories.
3.  **Migration/Initialization**: Create a script or update `initializeDefaults` to populate `menu-categories` setting with all currently defined types in `menu-item.interface.ts`.

### Phase 2: Settings UI
1.  **Create `MenuCategoriesForm`**: A client component to manage the list.
2.  **Update `SettingsPage`**: Integrate the new form.
3.  **Server Actions**: Create `updateMenuCategoriesAction`.

### Phase 3: Menu Item Management UI
1.  **Update `MenuItemForm`**: Accept `availableCategories` as a prop.
2.  **Update Page Loaders**: Fetch categories in `dashboard/menu/new/page.tsx` and `edit/page.tsx` and pass them to the form.

### Phase 4: Frontend "Menu" Page (Optional/Review)
1.  **Review `MenuContent`**: Ensure the frontend menu filtering respects the new dynamic categories (it currently uses `CategoryService.getCategories()` which does `distinct` queries, so it should automatically support new categories as long as items exist with them).

## Default Categories to Initialize
We will initialize the settings with the superset of all known categories to ensure no data is broken.

**Food**:
- Starters, Main Courses, Desserts, Sides
- Swallow, Soups, Sauce, Rice Dishes, Noodles, Small Chops, Pepper Soup

**Drinks**:
- Beer (Local, Imported, Craft), Wine, Soft Drinks, Cocktails
- Cider, Spirits, Bitters, Liqueur, Whisky, Tequila, Energy Drink, Juice, Water, Yoghurt, Malt
