import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { MenuItemEditForm } from '@/components/features/admin/menu-item-edit-form';
import { PriceManagementSection } from '@/components/features/admin/price-management-section';
import { SystemSettingsService } from '@/services/system-settings-service';

interface EditMenuItemPageProps {
  params: Promise<{
    itemId: string;
  }>;
}

/**
 * Get menu item by ID with inventory data
 */
async function getMenuItem(itemId: string) {
  await connectDB();

  const menuItem = await MenuItemModel.findById(itemId).lean();

  if (!menuItem) {
    return null;
  }

  // Get inventory data if tracking is enabled
  let inventory = null;
  if (menuItem.trackInventory && menuItem.inventoryId) {
    inventory = await InventoryModel.findById(menuItem.inventoryId).lean();
  }

  // Serialize data
  return {
    _id: menuItem._id.toString(),
    name: menuItem.name,
    description: menuItem.description,
    mainCategory: menuItem.mainCategory,
    category: menuItem.category,
    price: menuItem.price,
    costPerUnit: menuItem.costPerUnit || 0,
    preparationTime: menuItem.preparationTime,
    servingSize: menuItem.servingSize || '',
    isAvailable: menuItem.isAvailable,
    allowManualPriceOverride: menuItem.allowManualPriceOverride || false,
    portionOptions: menuItem.portionOptions || {
      halfPortionEnabled: false,
      quarterPortionEnabled: false,
    },
    tags: menuItem.tags,
    allergens: menuItem.allergens || [],
    images: menuItem.images,
    customizations: menuItem.customizations || [],
    nutritionalInfo: menuItem.nutritionalInfo || {},
    slug: menuItem.slug || '',
    metaDescription: menuItem.metaDescription || '',
    trackInventory: menuItem.trackInventory,
    inventoryId: menuItem.inventoryId?.toString(),
    inventory: inventory
      ? {
          _id: inventory._id.toString(),
          currentStock: inventory.currentStock,
          minimumStock: inventory.minimumStock,
          maximumStock: inventory.maximumStock,
          unit: inventory.unit,
          costPerUnit: inventory.costPerUnit,
          supplier: inventory.supplier,
          preventOrdersWhenOutOfStock: inventory.preventOrdersWhenOutOfStock,
          trackByLocation: inventory.trackByLocation || false,
        }
      : null,
    createdAt: menuItem.createdAt?.toString(),
    updatedAt: menuItem.updatedAt?.toString(),
  };
}

/**
 * Loading skeleton
 */
function EditFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Edit menu item page
 */
export default async function EditMenuItemPage({ params }: EditMenuItemPageProps) {
  const { itemId } = await params;
  const [menuItem, menuSettings] = await Promise.all([
    getMenuItem(itemId),
    SystemSettingsService.getMenuCategories(),
  ]);

  if (!menuItem) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/menu" className="hover:text-foreground">
          Menu
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Edit {menuItem.name}</span>
      </div>

      {/* Back Button */}
      <div>
        <Link href="/dashboard/menu">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Menu Item</h1>
        <p className="text-muted-foreground">Update menu item details and settings</p>
      </div>

      {/* Edit Form */}
      <Suspense fallback={<EditFormSkeleton />}>
        <MenuItemEditForm menuItem={menuItem} availableCategories={menuSettings} />
      </Suspense>

      {/* Price Management Section */}
      <PriceManagementSection
        menuItemId={menuItem._id}
        currentPrice={menuItem.price}
        currentCostPerUnit={menuItem.costPerUnit}
        menuItemName={menuItem.name}
      />

      {/* Audit Trail */}
      {menuItem.createdAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              Created: {new Date(menuItem.createdAt).toLocaleString()}
            </p>
            {menuItem.updatedAt && (
              <p>
                Last Modified: {new Date(menuItem.updatedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
