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
  const menuSettings = await SystemSettingsService.getMenuCategories();

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
          <MenuItemForm availableCategories={menuSettings} />
        </CardContent>
      </Card>
    </div>
  );
}
