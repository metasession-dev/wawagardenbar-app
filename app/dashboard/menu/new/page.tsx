import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuItemForm } from '@/components/features/admin/menu-item-form';
import { SystemSettingsService } from '@/services/system-settings-service';

export const metadata = {
  title: 'Add Menu Item | Admin Dashboard',
  description: 'Add a new menu item',
};

/**
 * Add new menu item page
 */
export default async function NewMenuItemPage() {
  // REQ-075 — also load the configurable main-category registry so the
  // form's Select renders every enabled main category.
  const [menuSettings, mainCategoriesAll] = await Promise.all([
    SystemSettingsService.getMenuCategories(),
    SystemSettingsService.getMainCategories(),
  ]);
  const mainCategories = mainCategoriesAll
    .filter((m) => m.isEnabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Menu Item</h1>
        <p className="text-muted-foreground">Create a new menu item</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <MenuItemForm
            availableCategories={menuSettings}
            mainCategories={mainCategories}
          />
        </CardContent>
      </Card>
    </div>
  );
}
