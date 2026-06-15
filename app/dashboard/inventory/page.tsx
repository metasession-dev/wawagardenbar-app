/**
 * @requirement REQ-081 - Sellable inventory category cascade
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';
import '@/models/menu-item-model'; // Import to ensure MenuItem model is registered
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryItemsClient } from '@/components/features/admin/inventory-items-client';
import type { InventoryKind } from '@/interfaces/inventory.interface';
import { computeInventoryStatus } from '@/lib/expense-inventory-link';
import { CategoryService } from '@/services/category-service';
import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardCheck,
  PackageCheck,
} from 'lucide-react';

/**
 * REQ-034 AC3 / REQ-037 AC4: load inventory filtered by `kind`. The
 * dashboard's Sellable + Kitchen tabs are populated independently.
 * `archived` controls whether the result is the active rows (default)
 * or the archived rows (used by the Kitchen tab's Show archived
 * section under REQ-037).
 */
async function getInventoryByKind(kind: InventoryKind, archived = false) {
  await connectDB();

  const inventory = await InventoryModel.find({
    kind,
    archivedAt: { $exists: archived },
  })
    .populate('menuItemId', 'name mainCategory category')
    .sort(archived ? { updatedAt: -1 } : { currentStock: 1 })
    .lean();

  // Serialize data for Client Component
  return inventory.map((item: any) => ({
    _id: item._id.toString(),
    kind: (item.kind ?? 'menu-item') as InventoryKind,
    menuItemId: item.menuItemId
      ? {
          _id: item.menuItemId._id.toString(),
          name: item.menuItemId.name,
          mainCategory: item.menuItemId.mainCategory,
          category: item.menuItemId.category,
        }
      : null,
    currentStock: item.currentStock,
    minStock: item.minimumStock,
    maxStock: item.maximumStock,
    unit: item.unit,
    lastRestocked: item.lastRestocked
      ? new Date(item.lastRestocked).toISOString()
      : undefined,
    trackByLocation: item.trackByLocation ?? false,
    locations:
      item.trackByLocation && Array.isArray(item.locations)
        ? item.locations.map((loc: any) => ({
            location: loc.location,
            locationName: loc.locationName,
            currentStock: loc.currentStock ?? 0,
          }))
        : [],
  }));
}

/**
 * Get inventory statistics.
 *
 * Counts are computed from live `currentStock` + `minimumStock` per row
 * rather than counting on the cached `Inventory.status` field. The
 * cached field can drift if any write path bypasses the schema's
 * pre('save') hook (e.g. expense-link `$inc` before #99) — counting on
 * it would inflate the Out of Stock / Low Stock badges. Single fetch +
 * JS count is cheap for our inventory size (~150 rows).
 */
async function getInventoryStats() {
  await connectDB();

  const rows = await InventoryModel.find(
    {},
    'currentStock minimumStock'
  ).lean();

  let lowStockItems = 0;
  let outOfStockItems = 0;
  for (const r of rows) {
    const s = computeInventoryStatus(
      (r as { currentStock?: number }).currentStock ?? 0,
      (r as { minimumStock?: number }).minimumStock ?? 0
    );
    if (s === 'low-stock') lowStockItems += 1;
    else if (s === 'out-of-stock') outOfStockItems += 1;
  }

  return {
    totalItems: rows.length,
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
        <Card
          key={card.title}
          className={card.alert ? 'border-destructive' : ''}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.alert && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
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
 * Inventory list (Sellable / Kitchen tabs — REQ-034 AC3).
 */
async function InventoryList() {
  const [
    sellableInventory,
    kitchenInventory,
    archivedKitchenInventory,
    categories,
  ] = await Promise.all([
    getInventoryByKind('menu-item'),
    getInventoryByKind('kitchen-ingredient'),
    getInventoryByKind('kitchen-ingredient', true),
    CategoryService.getCategories(),
  ]);

  return (
    <InventoryItemsClient
      sellableInventory={sellableInventory}
      kitchenInventory={kitchenInventory}
      archivedKitchenInventory={archivedKitchenInventory}
      mainCategories={categories.mainCategories}
    />
  );
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/inventory/restock-recommendations"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <PackageCheck className="h-4 w-4" />
            Restock Recommendations
          </Link>
          <Link
            href="/dashboard/inventory/transfer"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Stock
          </Link>
          <Link
            href="/dashboard/inventory/snapshots"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ClipboardCheck className="h-4 w-4" />
            Inventory Snapshots
          </Link>
        </div>
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
