/**
 * @requirement REQ-012 - Pass partial payments data to tabs list
 * @requirement REQ-023 - Pass Staff Pot balance to tabs list
 *
 * Renders the Tabs Management dashboard. Pages 25 tabs at a time
 * (server-side) so the page stays fast at >1500 tabs. Stats are
 * computed server-side independent of the current page / filter.
 */
import { TabService } from '@/services';
import { getStaffPotDataAction } from '@/app/actions/admin/staff-pot-actions';
import { DashboardTabsListClient } from '@/components/features/admin/tabs/dashboard-tabs-list-client';

const PAGE_SIZE = 25;

async function getInitialPage() {
  // First-visit default: open tabs only, newest first, first 25.
  // Operator can override via the filter UI which writes to localStorage
  // and persists across visits. The localStorage default-fallback also
  // hits this same "status: open" implicit default — see the filter
  // component for details.
  const { tabs, total } = await TabService.listAllTabsWithFilters({
    statuses: ['open'],
    skip: 0,
    limit: PAGE_SIZE,
  });

  const serializedTabs = tabs.map((tab: any) => ({
    _id: tab._id.toString(),
    tabNumber: tab.tabNumber,
    tableNumber: tab.tableNumber,
    status: tab.status,
    orders: Array.isArray(tab.orders)
      ? tab.orders.map((o: any) => o.toString())
      : [],
    subtotal: tab.subtotal,
    serviceFee: tab.serviceFee,
    tax: tab.tax,
    deliveryFee: tab.deliveryFee,
    discountTotal: tab.discountTotal,
    tipAmount: tab.tipAmount,
    total: tab.total,
    paymentStatus: tab.paymentStatus,
    openedAt:
      typeof tab.openedAt === 'string'
        ? tab.openedAt
        : tab.openedAt.toISOString(),
    partialPayments: Array.isArray(tab.partialPayments)
      ? tab.partialPayments.map((pp: any) => ({
          amount: pp.amount,
          note: pp.note,
          paymentType: pp.paymentType,
          paidAt:
            typeof pp.paidAt === 'string'
              ? pp.paidAt
              : pp.paidAt?.toISOString?.() || '',
        }))
      : [],
    reconciled: tab.reconciled || false,
  }));

  return { tabs: serializedTabs, total };
}

export default async function DashboardTabsPage() {
  const [{ tabs, total }, stats, staffPotResult] = await Promise.all([
    getInitialPage(),
    TabService.getTabStats(),
    getStaffPotDataAction().catch(() => ({ success: false as const })),
  ]);

  const staffPotBalance =
    staffPotResult.success && staffPotResult.data
      ? ((staffPotResult.data as any).totalPot ?? 0)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tabs Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and filter all tabs across all tables
        </p>
      </div>

      <DashboardTabsListClient
        initialTabs={tabs}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        stats={stats}
        staffPotBalance={staffPotBalance}
      />
    </div>
  );
}
