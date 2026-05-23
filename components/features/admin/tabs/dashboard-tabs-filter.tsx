/**
 * @requirement REQ-014 - Add reconciliation filter to tabs
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Filter, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

/**
 * Persisted filter shape. Stored under this localStorage key per
 * browser. Date range can't be serialised reliably across visits (and
 * "last week's date range" is rarely the same thing twice), so only
 * statuses + reconciliation persist; the date range resets each session.
 */
const STORAGE_KEY = 'wawagardenbar.tabs-filter';
const DEFAULT_STATUSES = ['open'];
const DEFAULT_RECONCILED: 'all' | 'reconciled' | 'not-reconciled' = 'all';

interface SavedFilter {
  statuses: string[];
  reconciled: 'all' | 'reconciled' | 'not-reconciled';
}

function readSavedFilter(): SavedFilter {
  if (typeof window === 'undefined') {
    return { statuses: DEFAULT_STATUSES, reconciled: DEFAULT_RECONCILED };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { statuses: DEFAULT_STATUSES, reconciled: DEFAULT_RECONCILED };
    }
    const parsed = JSON.parse(raw) as Partial<SavedFilter>;
    return {
      statuses: Array.isArray(parsed.statuses)
        ? parsed.statuses.filter((s) => typeof s === 'string')
        : DEFAULT_STATUSES,
      reconciled:
        parsed.reconciled === 'reconciled' ||
        parsed.reconciled === 'not-reconciled' ||
        parsed.reconciled === 'all'
          ? parsed.reconciled
          : DEFAULT_RECONCILED,
    };
  } catch {
    return { statuses: DEFAULT_STATUSES, reconciled: DEFAULT_RECONCILED };
  }
}

interface DashboardTabsFilterProps {
  onFilterChange: (filters: {
    statuses: string[];
    dateRange?: DateRange;
    reconciled?: 'all' | 'reconciled' | 'not-reconciled';
  }) => void;
}

const TAB_STATUSES = [
  { value: 'open', label: 'Open', description: 'Currently active tabs' },
  {
    value: 'settling',
    label: 'Settling',
    description: 'Payment in progress',
  },
  { value: 'closed', label: 'Closed', description: 'Completed tabs' },
];

/**
 * Dashboard tabs filter component with status checkboxes, date range picker, and reconciliation filter
 */
export function DashboardTabsFilter({
  onFilterChange,
}: DashboardTabsFilterProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  // Hydrate from localStorage on mount. SSR-safe via the typeof window
  // guard inside readSavedFilter().
  const initialFilter = readSavedFilter();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialFilter.statuses
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reconciled, setReconciled] = useState<
    'all' | 'reconciled' | 'not-reconciled'
  >(initialFilter.reconciled);

  // Track whether the saved filter has been emitted to the parent yet.
  // On first mount we tell the parent about the persisted filter so the
  // page reloads with it applied even if the server-side default-paint
  // doesn't match.
  const hasEmittedInitial = useRef(false);
  useEffect(() => {
    if (hasEmittedInitial.current) return;
    hasEmittedInitial.current = true;
    // Only emit on mount if the persisted filter differs from the
    // server's first-paint default (`statuses: ['open'], reconciled: 'all'`).
    const matchesDefault =
      initialFilter.statuses.length === 1 &&
      initialFilter.statuses[0] === 'open' &&
      initialFilter.reconciled === 'all';
    if (!matchesDefault) {
      onFilterChange({
        statuses: initialFilter.statuses,
        dateRange: undefined,
        reconciled: initialFilter.reconciled,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter((s) => s !== status);

    setSelectedStatuses(newStatuses);
    onFilterChange({ statuses: newStatuses, dateRange, reconciled });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    onFilterChange({
      statuses: selectedStatuses,
      dateRange: range,
      reconciled,
    });
  };

  const handleReconciledChange = (
    value: 'all' | 'reconciled' | 'not-reconciled'
  ) => {
    setReconciled(value);
    onFilterChange({
      statuses: selectedStatuses,
      dateRange,
      reconciled: value,
    });
  };

  const handleClearFilters = () => {
    setSelectedStatuses([]);
    setDateRange(undefined);
    setReconciled('all');
    onFilterChange({
      statuses: [],
      dateRange: undefined,
      reconciled: 'all',
    });
  };

  /**
   * Persist the current filter to localStorage so the next visit to
   * this page reloads with the same filter applied. Date range is
   * deliberately excluded — "last Monday" rarely means the same thing
   * across visits.
   */
  const handleSaveFilter = () => {
    if (typeof window === 'undefined') return;
    try {
      const payload: SavedFilter = {
        statuses: selectedStatuses,
        reconciled,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      toast({
        title: 'Filter saved',
        description: 'This page will reload with your filter next visit.',
      });
    } catch (err) {
      toast({
        title: 'Could not save filter',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  /**
   * Drop the saved filter and revert to the implicit default (open tabs).
   */
  const handleResetSaved = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* localStorage unavailable; default still applies in-memory */
      }
    }
    setSelectedStatuses(DEFAULT_STATUSES);
    setDateRange(undefined);
    setReconciled(DEFAULT_RECONCILED);
    onFilterChange({
      statuses: DEFAULT_STATUSES,
      dateRange: undefined,
      reconciled: DEFAULT_RECONCILED,
    });
    toast({
      title: 'Default restored',
      description: 'Showing open tabs (the default).',
    });
  };

  const activeFilterCount =
    (selectedStatuses.length > 0 ? 1 : 0) +
    (dateRange?.from ? 1 : 0) +
    (reconciled !== 'all' ? 1 : 0);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <CardTitle className="flex items-center gap-2 cursor-pointer">
                    <Filter className="h-4 w-4" />
                    Filter Tabs
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </CardTitle>
                </Button>
              </CollapsibleTrigger>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <CardDescription>
            Filter tabs by status, date range, and reconciliation
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filters */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tab Status</Label>
                <div className="flex flex-wrap gap-4">
                  {TAB_STATUSES.map((status) => (
                    <div
                      key={status.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={(checked) =>
                          handleStatusChange(status.value, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`status-${status.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  placeholder="Select date range"
                  maxDate={new Date()}
                />
              </div>

              {/* Reconciliation Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reconciliation</Label>
                <Select
                  value={reconciled}
                  onValueChange={handleReconciledChange}
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
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Status:{' '}
                    {selectedStatuses
                      .map(
                        (s) => TAB_STATUSES.find((ts) => ts.value === s)?.label
                      )
                      .join(', ')}
                  </Badge>
                )}
                {dateRange?.from && (
                  <Badge variant="secondary" className="text-xs">
                    {dateRange.to
                      ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                      : format(dateRange.from, 'MMM dd')}
                  </Badge>
                )}
                {reconciled !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {reconciled === 'reconciled'
                      ? 'Reconciled'
                      : 'Not Reconciled'}
                  </Badge>
                )}
              </div>
            )}

            {/* Save / Reset — persist the current filter to localStorage
                so the page reloads with it on the next visit. Date
                range is deliberately not persisted. */}
            <div className="flex items-center gap-2 pt-3 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveFilter}
                data-testid="save-filter"
              >
                <Save className="h-4 w-4 mr-1" />
                Save filter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetSaved}
                data-testid="reset-filter"
              >
                Reset to default (open tabs)
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
