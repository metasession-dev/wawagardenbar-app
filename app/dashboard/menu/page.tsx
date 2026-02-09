import { Suspense } from 'react';
import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItemsClient } from '@/components/features/admin/menu-items-client';

/**
 * Get all menu items
 */
async function getMenuItems() {
  await connectDB();

  const menuItems = await MenuItemModel.find()
    .sort({ mainCategory: 1, category: 1, name: 1 })
    .lean();

  // Serialize data for Client Component
  return menuItems.map((item) => ({
    _id: item._id.toString(),
    name: item.name,
    description: item.description,
    mainCategory: item.mainCategory,
    category: item.category,
    price: item.price,
    preparationTime: item.preparationTime,
    isAvailable: item.isAvailable,
    tags: item.tags,
    images: item.images,
  }));
}

/**
 * Get menu statistics
 */
async function getMenuStats() {
  await connectDB();

  const [totalItems, availableItems, foodItems, drinkItems] = await Promise.all([
    MenuItemModel.countDocuments(),
    MenuItemModel.countDocuments({ isAvailable: true }),
    MenuItemModel.countDocuments({ mainCategory: 'food' }),
    MenuItemModel.countDocuments({ mainCategory: 'drinks' }),
  ]);

  return {
    totalItems,
    availableItems,
    unavailableItems: totalItems - availableItems,
    foodItems,
    drinkItems,
  };
}

/**
 * Menu stats cards
 */
async function MenuStats() {
  const stats = await getMenuStats();

  const cards = [
    {
      title: 'Total Items',
      value: stats.totalItems,
      description: `${stats.foodItems} food, ${stats.drinkItems} drinks`,
    },
    {
      title: 'Available',
      value: stats.availableItems,
      description: 'Currently in stock',
    },
    {
      title: 'Unavailable',
      value: stats.unavailableItems,
      description: 'Out of stock',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Menu items table wrapper
 */
async function MenuItemsList() {
  const menuItems = await getMenuItems();

  return <MenuItemsClient menuItems={menuItems} />;
}

/**
 * Loading skeletons
 */
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Menu management page
 */
export default async function MenuPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage your menu items and categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/menu/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <MenuStats />
      </Suspense>

      {/* Menu Items Table */}
      <Suspense fallback={<TableSkeleton />}>
        <MenuItemsList />
      </Suspense>
    </div>
  );
}
