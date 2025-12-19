'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';

interface ProfitabilityFiltersProps {
  startDate: string;
  endDate: string;
  orderType: string;
  category: string;
  onFilterChange: (filters: {
    startDate: string;
    endDate: string;
    orderType: string;
    category: string;
  }) => void;
  isLoading: boolean;
}

export function ProfitabilityFilters({
  startDate,
  endDate,
  orderType,
  category,
  onFilterChange,
  isLoading,
}: ProfitabilityFiltersProps) {
  function handleExportCSV() {
    // TODO: Implement CSV export
    alert('CSV export coming soon!');
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Range */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) =>
                  onFilterChange({ startDate: e.target.value, endDate, orderType, category })
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) =>
                  onFilterChange({ startDate, endDate: e.target.value, orderType, category })
                }
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Order Type Filter */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="orderType">Order Type</Label>
            <Select
              value={orderType || 'all'}
              onValueChange={(value) =>
                onFilterChange({ startDate, endDate, orderType: value === 'all' ? '' : value, category })
              }
              disabled={isLoading}
            >
              <SelectTrigger id="orderType">
                <SelectValue placeholder="All order types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All order types</SelectItem>
                <SelectItem value="dine-in">Dine-in</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category || 'all'}
              onValueChange={(value) =>
                onFilterChange({ startDate, endDate, orderType, category: value === 'all' ? '' : value })
              }
              disabled={isLoading}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="beer-local">Local Beer</SelectItem>
                <SelectItem value="beer-imported">Imported Beer</SelectItem>
                <SelectItem value="beer-craft">Craft Beer</SelectItem>
                <SelectItem value="wine">Wine</SelectItem>
                <SelectItem value="spirits">Spirits</SelectItem>
                <SelectItem value="soft-drinks">Soft Drinks</SelectItem>
                <SelectItem value="water">Water</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <div className="flex items-end">
            <Button onClick={handleExportCSV} variant="outline" disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
