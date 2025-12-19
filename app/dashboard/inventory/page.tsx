import { Suspense } from 'react';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryTable } from '@/components/features/admin/inventory-table';
import { AlertTriangle } from 'lucide-react';

/**
 * Get inventory items
 */
async function getInventory() {
  await connectDB();

  const inventory = await InventoryModel.find()
    .populate('menuItemId', 'name mainCategory category')
    .sort({ currentStock: 1 })
    .lean();

  // Serialize data for Client Component
  return inventory.map((item: any) => ({
    _id: item._id.toString(),
    menuItemId: item.menuItemId ? {
      _id: item.menuItemId._id.toString(),
      name: item.menuItemId.name,
      mainCategory: item.menuItemId.mainCategory,
      category: item.menuItemId.category,
    } : null,
    currentStock: item.currentStock,
    minStock: item.minimumStock,
    maxStock: item.maximumStock,
    unit: item.unit,
    lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toISOString() : undefined,
  }));
}

/**
 * Get inventory statistics
 */
async function getInventoryStats() {
  await connectDB();

  const [totalItems, lowStockItems, outOfStockItems] = await Promise.all([
    InventoryModel.countDocuments(),
    InventoryModel.countDocuments({ status: 'low-stock' }),
    InventoryModel.countDocuments({ status: 'out-of-stock' }),
  ]);

  return {
    totalItems,
    lowStockItems,
    outOfStockItems,
  };
}

/**
 * Inventory stats cards
 */
async function InventoryStats() {
  const stats = await getInventoryStats();

  const cards = [
    {
      title: 'Total Items',
      value: stats.totalItems,
      description: 'Items in inventory',
    },
    {
      title: 'Low Stock',
      value: stats.lowStockItems,
      description: 'Below minimum threshold',
      alert: stats.lowStockItems > 0,
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockItems,
      description: 'Needs reordering',
      alert: stats.outOfStockItems > 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className={card.alert ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.alert && <AlertTriangle className="h-4 w-4 text-destructive" />}
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
 * Inventory list
 */
async function InventoryList() {
  const inventory = await getInventory();

  return <InventoryTable inventory={inventory} />;
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
 * Inventory management page
 */
export default async function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">
          Track stock levels and manage inventory
        </p>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <InventoryStats />
      </Suspense>

      {/* Inventory Table */}
      <Suspense fallback={<TableSkeleton />}>
        <InventoryList />
      </Suspense>
    </div>
  );
}
