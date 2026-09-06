import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import { MenuEditAllTable } from '@/components/features/admin/menu-edit-all-table';

/**
 * REQ-102 — bulk "Edit All" menu page.
 *
 * Single page to view/edit cost price, default price, show price,
 * happy-hour price, name, main category, category, and availability
 * across every menu item, filterable by main category and category.
 */
export default async function EditAllMenuItemsPage() {
  await connectDB();

  const [items, menuSettings, mainCategoriesAll] = await Promise.all([
    MenuItemModel.find({ kind: 'menu-item' })
      .sort({ mainCategory: 1, category: 1, name: 1 })
      .select(
        '_id name mainCategory category costPerUnit price showPrice happyHourPrice isAvailable'
      )
      .lean(),
    SystemSettingsService.getMenuCategories(),
    SystemSettingsService.getMainCategories(),
  ]);

  const mainCategories = mainCategoriesAll
    .filter((m) => m.isEnabled)
    .sort((a, b) => a.order - b.order);

  const serializedItems = items.map((item) => ({
    _id: item._id.toString(),
    name: item.name,
    mainCategory: item.mainCategory,
    category: item.category,
    costPerUnit: item.costPerUnit,
    price: item.price,
    // REQ-102 — fall back to `price` for documents predating the
    // showPrice/happyHourPrice backfill migration (R-025): `.lean()`
    // reads bypass Mongoose schema defaults, so an unmigrated document's
    // `showPrice`/`happyHourPrice` come back `undefined` here, which
    // would otherwise crash the table's `.toString()` on the value.
    showPrice: item.showPrice ?? item.price,
    happyHourPrice: item.happyHourPrice ?? item.price,
    isAvailable: item.isAvailable,
  }));

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
        <span className="text-foreground">Edit All</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Edit All Menu Items
        </h1>
        <p className="text-muted-foreground">
          Bulk-review and edit cost price, default price, show price, happy hour
          price, name, category, and availability across every menu item.
        </p>
      </div>

      <MenuEditAllTable
        items={serializedItems}
        mainCategories={mainCategories}
        availableCategories={menuSettings}
      />
    </div>
  );
}
