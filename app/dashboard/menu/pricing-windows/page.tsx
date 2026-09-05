import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SettingsService } from '@/services';
import { PricingWindowsForm } from '@/components/features/admin/pricing-windows-form';

/**
 * REQ-102 (amended) — dedicated Show Price Window / Happy Hour Window page.
 *
 * Originally a tab inside Settings; moved here per operator request so
 * pricing-window configuration lives alongside the other menu-pricing
 * surfaces (Price Management, Edit All) rather than in the general
 * Settings hub.
 */
export default async function PricingWindowsPage() {
  const settings = await SettingsService.getSettings();
  const plainSettings = JSON.parse(JSON.stringify(settings));

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
        <span className="text-foreground">Pricing Windows</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pricing Windows</h1>
        <p className="text-muted-foreground">
          Configure when menu items automatically use their Show Price or Happy
          Hour Price instead of their default price.
        </p>
      </div>

      <PricingWindowsForm
        initialValues={{
          showPriceWindow: plainSettings.showPriceWindow,
          happyHourWindow: plainSettings.happyHourWindow,
        }}
      />
    </div>
  );
}
