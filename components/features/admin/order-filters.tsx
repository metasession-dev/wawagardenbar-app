'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface OrderFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  activeFilters: FilterValues;
}

export interface FilterValues {
  status?: string[];
  orderType?: string[];
  paymentStatus?: string;
  dateRange?: DateRange;
  reconciled?: 'all' | 'reconciled' | 'not-reconciled';
}

/**
 * Advanced order filters component
 * Multi-select filters with date range
 */
export function OrderFilters({
  onFilterChange,
  activeFilters,
}: OrderFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterValues>(activeFilters);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const orderTypeOptions = [
    { value: 'dine-in', label: 'Dine-in' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'delivery', label: 'Delivery' },
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  function toggleStatus(status: string) {
    const current = localFilters.status || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];

    setLocalFilters({
      ...localFilters,
      status: updated.length > 0 ? updated : undefined,
    });
  }

  function toggleOrderType(type: string) {
    const current = localFilters.orderType || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];

    setLocalFilters({
      ...localFilters,
      orderType: updated.length > 0 ? updated : undefined,
    });
  }

  function handlePaymentStatusChange(value: string) {
    setLocalFilters({
      ...localFilters,
      paymentStatus: value === 'all' ? undefined : value,
    });
  }

  function handleDateRangeChange(range: DateRange | undefined) {
    setLocalFilters({ ...localFilters, dateRange: range });
  }

  function applyFilters() {
    onFilterChange(localFilters);
    setIsOpen(false);
  }

  function clearFilters() {
    const emptyFilters: FilterValues = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  }

  function clearFilter(filterType: keyof FilterValues) {
    const updated = { ...localFilters };
    delete updated[filterType];
    setLocalFilters(updated);
    onFilterChange(updated);
  }

  const activeFilterCount = [
    localFilters.status?.length || 0,
    localFilters.orderType?.length || 0,
    localFilters.paymentStatus ? 1 : 0,
    localFilters.dateRange?.from ? 1 : 0,
    localFilters.reconciled ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filter Orders</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={
                        localFilters.status?.includes(option.value)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Order Type Filter */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <div className="flex flex-wrap gap-2">
                  {orderTypeOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={
                        localFilters.orderType?.includes(option.value)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => toggleOrderType(option.value)}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Payment Status Filter */}
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select
                  value={localFilters.paymentStatus || 'all'}
                  onValueChange={handlePaymentStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All payment statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {paymentStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reconciliation Filter */}
              <div className="space-y-2">
                <Label>Reconciliation</Label>
                <Select
                  value={localFilters.reconciled || 'all'}
                  onValueChange={(value) =>
                    setLocalFilters({
                      ...localFilters,
                      reconciled:
                        value === 'all'
                          ? undefined
                          : (value as 'reconciled' | 'not-reconciled'),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="not-reconciled">
                      Not Reconciled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateRange?.from ? (
                        localFilters.dateRange.to ? (
                          <>
                            {format(localFilters.dateRange.from, 'LLL dd, y')} -{' '}
                            {format(localFilters.dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(localFilters.dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={localFilters.dateRange?.from}
                      selected={localFilters.dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Apply Button */}
              <Button onClick={applyFilters} className="w-full">
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filter Presets */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const filters: FilterValues = {
              status: ['pending'],
              dateRange: { from: today, to: today },
            };
            setLocalFilters(filters);
            onFilterChange(filters);
          }}
        >
          Today's Pending
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const filters: FilterValues = {
              status: ['pending', 'preparing', 'ready'],
            };
            setLocalFilters(filters);
            onFilterChange(filters);
          }}
        >
          Active Orders
        </Button>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {localFilters.status?.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              Status: {status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const updated = localFilters.status?.filter(
                    (s) => s !== status
                  );
                  setLocalFilters({
                    ...localFilters,
                    status: updated?.length ? updated : undefined,
                  });
                  onFilterChange({
                    ...localFilters,
                    status: updated?.length ? updated : undefined,
                  });
                }}
              />
            </Badge>
          ))}
          {localFilters.orderType?.map((type) => (
            <Badge key={type} variant="secondary" className="gap-1">
              Type: {type}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const updated = localFilters.orderType?.filter(
                    (t) => t !== type
                  );
                  setLocalFilters({
                    ...localFilters,
                    orderType: updated?.length ? updated : undefined,
                  });
                  onFilterChange({
                    ...localFilters,
                    orderType: updated?.length ? updated : undefined,
                  });
                }}
              />
            </Badge>
          ))}
          {localFilters.paymentStatus && (
            <Badge variant="secondary" className="gap-1">
              Payment: {localFilters.paymentStatus}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('paymentStatus')}
              />
            </Badge>
          )}
          {localFilters.dateRange?.from && (
            <Badge variant="secondary" className="gap-1">
              Date: {format(localFilters.dateRange.from, 'MMM dd')}
              {localFilters.dateRange.to &&
                ` - ${format(localFilters.dateRange.to, 'MMM dd')}`}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('dateRange')}
              />
            </Badge>
          )}
          {localFilters.reconciled && (
            <Badge variant="secondary" className="gap-1">
              {localFilters.reconciled === 'reconciled'
                ? 'Reconciled'
                : 'Not Reconciled'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => clearFilter('reconciled')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
