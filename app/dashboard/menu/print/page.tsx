import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SystemSettingsService } from '@/services/system-settings-service';
import { MenuPrintClient } from '@/components/features/admin/menu-print/menu-print-client';

/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * "Print New Menu" page. Access is enforced by app/dashboard/menu/layout.tsx
 * (requirePermission('menuManagement')); item data is loaded per Generate by
 * getPrintableMenuDataAction, so only the enabled main categories load here.
 */
export default async function PrintMenuPage() {
  const mainCategories = (await SystemSettingsService.getMainCategories())
    .filter((m) => m.isEnabled)
    .sort((a, b) => a.order - b.order)
    .map(({ slug, label }) => ({ slug, label }));

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
        <span className="text-foreground">Print New Menu</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Print New Menu</h1>
        <p className="text-muted-foreground">
          Choose categories, a price type and a layout, preview the menu, then
          download an A4 PDF to print.
        </p>
      </div>

      <MenuPrintClient mainCategories={mainCategories} />
    </div>
  );
}
