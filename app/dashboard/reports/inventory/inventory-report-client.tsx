'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InventoryLocation {
  location: string;
  locationName: string;
  currentStock: number;
}

interface InventoryItem {
  _id: string;
  menuItemName: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  costPerUnit: number;
  supplier?: string;
  lastRestockDate?: string;
  category?: string;
  trackByLocation: boolean;
  locations: InventoryLocation[];
}

interface InventoryStats {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  needsReorder: number;
}

export function InventoryReportClient() {
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
    needsReorder: 0,
  });
  const [filter, setFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchInventoryReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports/inventory');
      if (response.ok) {
        const data = await response.json();
        console.log('Inventory data received:', data);
        setInventory(data.items);
        setStats(data.stats);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch inventory data');
        console.error('API error:', errorData);
      }
    } catch (error) {
      console.error('Error fetching inventory report:', error);
      setError('Network error: Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data on component mount
  useEffect(() => {
    fetchInventoryReport();
  }, []);

  const exportToCSV = () => {
    const headers = ['Item Name', 'Location', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit', 'Status', 'Cost/Unit', 'Total Value', 'Supplier'];
    const rows: (string | number)[][] = [];
    filteredInventory.forEach(item => {
      rows.push([
        item.menuItemName,
        '',
        item.currentStock,
        item.minimumStock,
        item.maximumStock,
        item.unit,
        item.status,
        `₦${item.costPerUnit}`,
        `₦${(item.currentStock * item.costPerUnit).toFixed(2)}`,
        item.supplier || 'N/A',
      ]);
      if (item.trackByLocation && item.locations.length > 0) {
        item.locations.forEach(loc => {
          rows.push([
            `  ${item.menuItemName}`,
            loc.locationName,
            loc.currentStock,
            '',
            '',
            item.unit,
            '',
            '',
            '',
            '',
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredInventory = filter === 'all' 
    ? inventory 
    : inventory.filter(item => item.status === filter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge className="bg-green-500">In Stock</Badge>;
      case 'low-stock':
        return <Badge className="bg-yellow-500">Low Stock</Badge>;
      case 'out-of-stock':
        return <Badge className="bg-red-500">Out of Stock</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStockPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Report</h2>
          <p className="text-muted-foreground">
            Stock levels, usage, and reorder recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchInventoryReport}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            onClick={exportToCSV}
            disabled={inventory.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-500 bg-red-50 p-4">
          <p className="text-sm text-red-600">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Tracked inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inStock}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalItems > 0 ? Math.round((stats.inStock / stats.totalItems) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({inventory.length})
        </Button>
        <Button
          variant={filter === 'in-stock' ? 'default' : 'outline'}
          onClick={() => setFilter('in-stock')}
        >
          In Stock ({stats.inStock})
        </Button>
        <Button
          variant={filter === 'low-stock' ? 'default' : 'outline'}
          onClick={() => setFilter('low-stock')}
        >
          Low Stock ({stats.lowStock})
        </Button>
        <Button
          variant={filter === 'out-of-stock' ? 'default' : 'outline'}
          onClick={() => setFilter('out-of-stock')}
        >
          Out of Stock ({stats.outOfStock})
        </Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click "Refresh" to load inventory data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Item Name</th>
                    <th className="text-right p-2">Current Stock</th>
                    <th className="text-left p-2">Location Breakdown</th>
                    <th className="text-left p-2">Min/Max</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Stock Level</th>
                    <th className="text-right p-2">Cost/Unit</th>
                    <th className="text-right p-2">Total Value</th>
                    <th className="text-left p-2">Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const percentage = getStockPercentage(item.currentStock, item.maximumStock);
                    const totalValue = item.currentStock * item.costPerUnit;
                    const hasLocations = item.trackByLocation && item.locations.length > 0;

                    return (
                      <>
                        <tr key={item._id} className={`border-b hover:bg-muted/50 ${hasLocations ? 'border-b-0' : ''}`}>
                          <td className="p-2 font-medium">{item.menuItemName}</td>
                          <td className="p-2 text-right">
                            {item.currentStock} {item.unit}
                          </td>
                          {/* Location breakdown cell */}
                          <td className="p-2">
                            {hasLocations ? (
                              <div className="flex flex-col gap-0.5">
                                {item.locations.map((loc) => (
                                  <div key={loc.location} className="flex items-center justify-between gap-3 text-xs">
                                    <span className="text-muted-foreground">{loc.locationName}</span>
                                    <span className="font-medium tabular-nums">{loc.currentStock} {item.unit}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {item.minimumStock} / {item.maximumStock}
                          </td>
                          <td className="p-2">{getStatusBadge(item.status)}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    percentage > 50
                                      ? 'bg-green-500'
                                      : percentage > 20
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            ₦{item.costPerUnit.toLocaleString()}
                          </td>
                          <td className="p-2 text-right font-medium">
                            ₦{totalValue.toLocaleString()}
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {item.supplier || 'Not specified'}
                          </td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
