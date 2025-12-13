'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useOrderStore, Order } from '@/stores/order-store';
import { OrderCard } from './order-card';
import { OrderFilters, FilterValues } from './order-filters';
import { OrderSearch } from './order-search';
import { OrderExport } from './order-export';
import { OrderBatchActions } from './order-batch-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface OrderQueueProps {
  initialOrders: Order[];
}

/**
 * Order queue component
 * Displays list of orders with filtering and selection
 */
export function OrderQueue({ initialOrders }: OrderQueueProps) {
  const router = useRouter();
  const {
    orders,
    setOrders,
    selectedOrders,
    toggleSelectOrder,
  } = useOrderStore();

  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize orders
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders, setOrders]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'active') {
          if (!['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
            return false;
          }
        } else if (order.status !== activeTab) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(order.status)) {
          return false;
        }
      }

      // Order type filter
      if (filters.orderType && filters.orderType.length > 0) {
        if (!filters.orderType.includes(order.orderType)) {
          return false;
        }
      }

      // Payment status filter
      if (filters.paymentStatus) {
        if (order.paymentStatus !== filters.paymentStatus) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange?.from) {
        const orderDate = new Date(order.createdAt);
        const from = startOfDay(filters.dateRange.from);
        const to = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);
        
        if (!isWithinInterval(orderDate, { start: from, end: to })) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesOrderNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesCustomerName = order.customer.name.toLowerCase().includes(query);
        const matchesEmail = order.customer.email?.toLowerCase().includes(query);
        const matchesPhone = order.customer.phone?.includes(query);

        if (!matchesOrderNumber && !matchesCustomerName && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, filters, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [router]);

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <Card data-testid="order-queue">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Order Queue</CardTitle>
          <div className="flex items-center gap-2">
            {selectedOrders.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedOrders.length} selected
              </span>
            )}
            <OrderExport orders={filteredOrders} filename="orders" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <OrderSearch onSearch={handleSearch} />
          <OrderFilters onFilterChange={handleFilterChange} activeFilters={filters} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({orders.filter((o) => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({orders.filter((o) => o.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({orders.filter((o) => o.status === 'confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="preparing">
              Preparing ({orders.filter((o) => o.status === 'preparing').length})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({orders.filter((o) => o.status === 'ready').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({orders.filter((o) => o.status === 'completed').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Order list */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                isSelected={selectedOrders.includes(order._id)}
                onSelect={toggleSelectOrder}
                showCheckbox={true}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Batch Actions Toolbar */}
      <OrderBatchActions selectedOrderIds={selectedOrders} />
    </Card>
  );
}
