import { TabService } from '@/services';
import { DashboardTabsListClient } from '@/components/features/admin/tabs/dashboard-tabs-list-client';

async function getAllTabs() {
  const tabs = await TabService.listAllTabsWithFilters({});

  // Fully serialize tabs to plain objects
  const serializedTabs = tabs.map((tab: any) => ({
    _id: tab._id.toString(),
    tabNumber: tab.tabNumber,
    tableNumber: tab.tableNumber,
    status: tab.status,
    orders: Array.isArray(tab.orders) ? tab.orders.map((o: any) => o.toString()) : [],
    subtotal: tab.subtotal,
    serviceFee: tab.serviceFee,
    tax: tab.tax,
    deliveryFee: tab.deliveryFee,
    discountTotal: tab.discountTotal,
    tipAmount: tab.tipAmount,
    total: tab.total,
    paymentStatus: tab.paymentStatus,
    openedAt: typeof tab.openedAt === 'string' ? tab.openedAt : tab.openedAt.toISOString(),
    partialPayments: Array.isArray(tab.partialPayments)
      ? tab.partialPayments.map((pp: any) => ({
          amount: pp.amount,
          note: pp.note,
          paymentType: pp.paymentType,
          paidAt: typeof pp.paidAt === 'string' ? pp.paidAt : pp.paidAt?.toISOString?.() || '',
        }))
      : [],
  }));

  return { tabs: serializedTabs };
}

export default async function DashboardTabsPage() {
  const { tabs } = await getAllTabs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tabs Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and filter all tabs across all tables
        </p>
      </div>

      <DashboardTabsListClient initialTabs={tabs} />
    </div>
  );
}
