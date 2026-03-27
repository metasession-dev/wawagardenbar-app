/**
 * @requirement REQ-012 - Include partial payments in tab data for outstanding balance calculation
 */
'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  Eye,
  CreditCard,
  Loader2,
  CheckCircle2,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { DashboardTabsFilter } from './dashboard-tabs-filter';
import { AdminPayTabDialog } from './admin-pay-tab-dialog';
import {
  getDashboardFilteredTabsAction,
  toggleTabReconciliationAction,
} from '@/app/actions/tabs/tab-actions';
import { useToast } from '@/hooks/use-toast';

interface PartialPayment {
  amount: number;
  note: string;
  paymentType: string;
  paidAt: string;
}

interface Tab {
  _id: string;
  tabNumber: string;
  tableNumber: string;
  status: string;
  orders: string[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  deliveryFee: number;
  discountTotal: number;
  tipAmount: number;
  total: number;
  paymentStatus: string;
  openedAt: string;
  partialPayments: PartialPayment[];
  reconciled?: boolean;
}

interface DashboardTabsListClientProps {
  initialTabs: Tab[];
}

/**
 * Client component for dashboard tabs list with filtering
 */
export function DashboardTabsListClient({
  initialTabs,
}: DashboardTabsListClientProps) {
  const { toast } = useToast();
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<{
    statuses: string[];
    dateRange?: DateRange;
    reconciled?: 'all' | 'reconciled' | 'not-reconciled';
  }>({
    statuses: [],
    dateRange: undefined,
    reconciled: undefined,
  });

  const handleFilterChange = async (filters: {
    statuses: string[];
    dateRange?: DateRange;
    reconciled?: 'all' | 'reconciled' | 'not-reconciled';
  }) => {
    setCurrentFilters(filters);
    setIsLoading(true);

    try {
      const result = await getDashboardFilteredTabsAction({
        statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
        startDate: filters.dateRange?.from?.toISOString(),
        endDate: filters.dateRange?.to?.toISOString(),
        reconciled: filters.reconciled,
      });

      if (result.success && result.data) {
        // Serialize tabs to match Tab interface
        const serializedTabs = result.data.tabs.map((tab: any) => ({
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
          openedAt: tab.openedAt,
          partialPayments: Array.isArray(tab.partialPayments)
            ? tab.partialPayments
            : [],
          reconciled: tab.reconciled || false,
        }));
        setTabs(serializedTabs);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to filter tabs',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to filter tabs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      open: 'default',
      settling: 'secondary',
      closed: 'outline',
    };

    return (
      <Badge
        variant={variants[status] || 'default'}
        data-testid="tab-status-badge"
      >
        {status}
      </Badge>
    );
  };

  const totalTabsAmount = tabs.reduce((sum, tab) => sum + tab.total, 0);
  const totalOrders = tabs.reduce((sum, tab) => sum + tab.orders.length, 0);
  const totalOpenTabs = tabs.filter((tab) => tab.status === 'open').length;

  return (
    <div className="space-y-6" data-testid="tabs-dashboard">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tabs</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tabs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Open Tabs
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpenTabs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{totalTabsAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <DashboardTabsFilter onFilterChange={handleFilterChange} />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Tabs List */}
      {!isLoading && tabs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tabs Found</h3>
            <p className="text-sm text-muted-foreground text-center">
              No tabs match your current filters. Try adjusting your search
              criteria.
            </p>
          </CardContent>
        </Card>
      ) : !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>All Tabs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tabs.map((tab) => (
                <div
                  key={tab._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid="tab-card"
                  data-tab-number={tab.tabNumber}
                >
                  <label className="flex items-center gap-1.5 mr-3 cursor-pointer">
                    <Checkbox
                      checked={tab.reconciled || false}
                      onCheckedChange={async () => {
                        const prev = tab.reconciled;
                        setTabs((current) =>
                          current.map((t) =>
                            t._id === tab._id
                              ? { ...t, reconciled: !t.reconciled }
                              : t
                          )
                        );
                        const result = await toggleTabReconciliationAction(
                          tab._id
                        );
                        if (!result.success) {
                          setTabs((current) =>
                            current.map((t) =>
                              t._id === tab._id ? { ...t, reconciled: prev } : t
                            )
                          );
                          toast({
                            title: 'Error',
                            description: result.error,
                            variant: 'destructive',
                          });
                        }
                      }}
                      aria-label={`Mark tab ${tab.tabNumber} as reconciled`}
                    />
                    <span className="text-xs text-muted-foreground">
                      Reconciled
                    </span>
                  </label>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">Table {tab.tableNumber}</h3>
                      <Badge variant="outline">Tab #{tab.tabNumber}</Badge>
                      {getStatusBadge(tab.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{tab.orders.length} order(s)</span>
                      <span>•</span>
                      <span>
                        Opened {new Date(tab.openedAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span
                        className="font-semibold text-foreground"
                        data-testid="tab-total"
                      >
                        ₦{tab.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {tab.status === 'open' ? (
                      <>
                        <Link
                          href={`/menu?tableNumber=${tab.tableNumber}&tabId=${tab._id}`}
                        >
                          <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add to Tab
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedTab(tab);
                            setShowPayDialog(true);
                          }}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Customer Wants to Pay
                        </Button>
                      </>
                    ) : tab.status === 'closed' ||
                      tab.paymentStatus === 'paid' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="cursor-not-allowed opacity-80"
                        data-testid="tab-payment-status"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                        Tab Paid
                      </Button>
                    ) : null}
                    <Link href={`/dashboard/orders/tabs/${tab._id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Pay Tab Dialog */}
      {selectedTab && (
        <AdminPayTabDialog
          tabId={selectedTab._id}
          tabNumber={selectedTab.tabNumber}
          tableNumber={selectedTab.tableNumber}
          total={selectedTab.total}
          outstandingBalance={
            selectedTab.total -
            (selectedTab.partialPayments || []).reduce(
              (sum, pp) => sum + pp.amount,
              0
            )
          }
          open={showPayDialog}
          onOpenChange={setShowPayDialog}
          onSuccess={() => handleFilterChange(currentFilters)}
        />
      )}
    </div>
  );
}
