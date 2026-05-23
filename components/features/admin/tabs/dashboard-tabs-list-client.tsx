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
  PiggyBank,
  Loader2,
  CheckCircle2,
  FolderOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
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
  initialTotal: number;
  pageSize: number;
  stats: {
    totalTabs: number;
    totalOpenTabs: number;
    totalOrders: number;
  };
  staffPotBalance: number;
}

/**
 * Client component for dashboard tabs list with server-paginated
 * filtering. The filter component is the single source of truth for the
 * current filter (it also persists to localStorage); this component
 * reacts to filter / page changes and fetches the matching slice from
 * the server.
 */
export function DashboardTabsListClient({
  initialTabs,
  initialTotal,
  pageSize,
  stats,
  staffPotBalance,
}: DashboardTabsListClientProps) {
  const { toast } = useToast();
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<{
    statuses: string[];
    dateRange?: DateRange;
    reconciled?: 'all' | 'reconciled' | 'not-reconciled';
  }>({
    // Match the server's first-paint default so an immediate page change
    // (without a filter touch) still fires the right query.
    statuses: ['open'],
    dateRange: undefined,
    reconciled: undefined,
  });

  // Single fetcher used by both filter and page changes.
  const fetchPage = async (
    filters: typeof currentFilters,
    nextPage: number
  ) => {
    setIsLoading(true);
    try {
      const result = await getDashboardFilteredTabsAction({
        statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
        startDate: filters.dateRange?.from?.toISOString(),
        endDate: filters.dateRange?.to?.toISOString(),
        reconciled: filters.reconciled,
        skip: (nextPage - 1) * pageSize,
        limit: pageSize,
      });

      if (result.success && result.data) {
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
        setTotal(result.data.total);
        setPage(nextPage);
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

  const handleFilterChange = async (filters: {
    statuses: string[];
    dateRange?: DateRange;
    reconciled?: 'all' | 'reconciled' | 'not-reconciled';
  }) => {
    setCurrentFilters(filters);
    // Filter change resets pagination to page 1.
    await fetchPage(filters, 1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

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

  return (
    <div className="space-y-6" data-testid="tabs-dashboard">
      {/* Stats Cards — server-computed, independent of filter/page state */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tabs</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTabs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
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
            <div className="text-2xl font-bold">{stats.totalOpenTabs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Staff Pot Balance
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{staffPotBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
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
                    <label className="flex items-center gap-1.5 ml-2 cursor-pointer border-l pl-3">
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
                                t._id === tab._id
                                  ? { ...t, reconciled: prev }
                                  : t
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
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination — server-paginated 25 per page. */}
            {total > pageSize && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPage(currentFilters, page - 1)}
                    disabled={!canPrev || isLoading}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm" aria-live="polite">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPage(currentFilters, page + 1)}
                    disabled={!canNext || isLoading}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
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
