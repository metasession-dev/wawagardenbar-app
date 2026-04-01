/**
 * @requirement REQ-019
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Package,
  TrendingDown,
  Clock,
  DollarSign,
} from 'lucide-react';
import {
  getRestockRecommendationsAction,
  getAvailableCategoriesAction,
} from '@/app/actions/inventory/restock-recommendation-actions';
import type {
  RestockRecommendationReport,
  RestockCategoryGroup,
  RestockRecommendationItem,
} from '@/services/restock-recommendation-service';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCategoryLabel(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PriorityBadge({
  priority,
}: {
  priority: 'urgent' | 'medium' | 'low';
}) {
  if (priority === 'urgent') {
    return <Badge variant="destructive">Urgent</Badge>;
  }
  if (priority === 'medium') {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200">
        Medium
      </Badge>
    );
  }
  return <Badge variant="secondary">Low</Badge>;
}

function OverviewCards({
  report,
  isLoading,
}: {
  report: RestockRecommendationReport | null;
  isLoading: boolean;
}) {
  const cards = [
    {
      title: 'Total Items',
      value: report?.totalItems ?? 0,
      icon: Package,
      className: '',
    },
    {
      title: 'Urgent',
      value: report?.urgentItems ?? 0,
      icon: AlertTriangle,
      className: 'text-red-600',
    },
    {
      title: 'Medium',
      value: report?.mediumItems ?? 0,
      icon: TrendingDown,
      className: 'text-amber-600',
    },
    {
      title: 'Low',
      value: report?.lowItems ?? 0,
      icon: Clock,
      className: 'text-green-600',
    },
    {
      title: 'Est. Restock Cost',
      value: report
        ? formatCurrency(report.estimatedRestockCost)
        : formatCurrency(0),
      icon: DollarSign,
      className: '',
      isFormatted: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-12" />
            ) : (
              <div className="flex items-center gap-3">
                <card.icon className={`h-5 w-5 ${card.className}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold ${card.className}`}>
                    {card.isFormatted ? card.value : card.value}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoryGroupTable({
  group,
  defaultOpen,
}: {
  group: RestockCategoryGroup;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <CardTitle className="text-lg">{group.categoryLabel}</CardTitle>
                <Badge variant="outline">{group.itemCount} items</Badge>
                {group.urgentCount > 0 && (
                  <Badge variant="destructive">
                    {group.urgentCount} urgent
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Avg/Day</TableHead>
                    <TableHead className="text-right">Days Left</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Last Restock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((item: RestockRecommendationItem) => (
                    <TableRow key={item.inventoryId}>
                      <TableCell className="font-medium">
                        {item.itemName}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.currentStock}
                        <span className="text-muted-foreground text-xs ml-1">
                          / {item.minimumStock}
                        </span>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {item.avgDailySales}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.daysUntilStockout === -1 ? (
                          <span className="text-muted-foreground">--</span>
                        ) : (
                          <span
                            className={
                              item.daysUntilStockout <= 2
                                ? 'text-red-600 font-semibold'
                                : item.daysUntilStockout <= 7
                                  ? 'text-amber-600'
                                  : ''
                            }
                          >
                            {item.daysUntilStockout}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.suggestedReorderQty > 0
                          ? item.suggestedReorderQty
                          : '--'}
                      </TableCell>
                      <TableCell>
                        {item.supplier || (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={item.priority} />
                      </TableCell>
                      <TableCell>
                        {item.lastRestockDate ? (
                          new Date(item.lastRestockDate).toLocaleDateString()
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function RestockRecommendationsClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<RestockRecommendationReport | null>(
    null
  );
  const [availableCategories, setAvailableCategories] = useState<{
    drinks: string[];
    food: string[];
  }>({ drinks: [], food: [] });

  const [mainCategory, setMainCategory] = useState<string>('all');
  const [days, setDays] = useState<number>(30);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceBracket, setPriceBracket] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    getAvailableCategoriesAction().then((result) => {
      if (result.success && result.data) {
        setAvailableCategories(result.data);
      }
    });
  }, []);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let priceMin: number | undefined;
      let priceMax: number | undefined;
      if (priceBracket === 'under-1000') {
        priceMax = 1000;
      } else if (priceBracket === '1000-5000') {
        priceMin = 1000;
        priceMax = 5000;
      } else if (priceBracket === '5000-10000') {
        priceMin = 5000;
        priceMax = 10000;
      } else if (priceBracket === 'over-10000') {
        priceMin = 10000;
      }

      const categories =
        selectedCategory !== 'all' ? [selectedCategory] : undefined;

      const result = await getRestockRecommendationsAction({
        mainCategory:
          mainCategory !== 'all'
            ? (mainCategory as 'food' | 'drinks')
            : undefined,
        categories,
        days,
        priceMin,
        priceMax,
        priorityFilter:
          priorityFilter !== 'all'
            ? (priorityFilter as 'urgent' | 'medium' | 'low')
            : undefined,
      });

      if (result.success && result.data) {
        setReport(result.data);
      } else {
        setError(result.error || 'Failed to load recommendations');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  }, [mainCategory, days, selectedCategory, priceBracket, priorityFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Reset subcategory when main category changes
  useEffect(() => {
    setSelectedCategory('all');
  }, [mainCategory]);

  const subcategories =
    mainCategory === 'food'
      ? availableCategories.food
      : mainCategory === 'drinks'
        ? availableCategories.drinks
        : [...availableCategories.food, ...availableCategories.drinks].sort();

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Category</Label>
              <Select
                value={mainCategory}
                onValueChange={setMainCategory}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="drinks">Drinks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Lookback Period</Label>
              <Select
                value={String(days)}
                onValueChange={(v) => setDays(Number(v))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subcategories</SelectItem>
                  {subcategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {formatCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Price Bracket</Label>
              <Select
                value={priceBracket}
                onValueChange={setPriceBracket}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All prices</SelectItem>
                  <SelectItem value="under-1000">
                    Under {formatCurrency(1000)}
                  </SelectItem>
                  <SelectItem value="1000-5000">
                    {formatCurrency(1000)} - {formatCurrency(5000)}
                  </SelectItem>
                  <SelectItem value="5000-10000">
                    {formatCurrency(5000)} - {formatCurrency(10000)}
                  </SelectItem>
                  <SelectItem value="over-10000">
                    Over {formatCurrency(10000)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Priority</Label>
              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <OverviewCards report={report} isLoading={isLoading} />

      {/* Category Groups */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : report && report.groups.length > 0 ? (
        <div className="space-y-4">
          {report.groups.map((group) => (
            <CategoryGroupTable
              key={group.category}
              group={group}
              defaultOpen={group.urgentCount > 0}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No inventory items match the selected filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
