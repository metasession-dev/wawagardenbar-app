'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';

interface InventoryLocation {
  location: string;
  locationName: string;
  currentStock: number;
}

interface InventoryItem {
  _id: string;
  menuItemId: {
    _id: string;
    name: string;
    mainCategory: string;
    category: string;
  } | null;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastRestocked?: string;
  trackByLocation: boolean;
  locations: InventoryLocation[];
}

interface InventoryTableProps {
  inventory: InventoryItem[];
}

/**
 * Inventory table component
 */
export function InventoryTable({ inventory }: InventoryTableProps) {
  const router = useRouter();

  function getStockStatus(item: InventoryItem) {
    if (item.currentStock === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, icon: AlertTriangle };
    }
    if (item.currentStock <= item.minStock) {
      return { label: 'Low Stock', variant: 'secondary' as const, icon: AlertTriangle };
    }
    return { label: 'In Stock', variant: 'default' as const, icon: CheckCircle };
  }

  function getStockPercentage(item: InventoryItem) {
    return Math.round((item.currentStock / item.maxStock) * 100);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Min/Max</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => {
                const status = getStockStatus(item);
                const percentage = getStockPercentage(item);
                const StatusIcon = status.icon;

                return (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">
                      {item.menuItemId?.name || 'Unknown Item'}
                    </TableCell>
                    <TableCell>
                      {item.menuItemId ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline">
                            {item.menuItemId.mainCategory}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.menuItemId.category}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No category
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {item.currentStock} {item.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.trackByLocation && item.locations.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {item.locations.map((loc) => (
                            <div key={loc.location} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground truncate max-w-[80px]">{loc.locationName}</span>
                              <span className="font-medium tabular-nums">{loc.currentStock}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.minStock} / {item.maxStock} {item.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${
                              percentage <= 20
                                ? 'bg-destructive'
                                : percentage <= 50
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="flex w-fit items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/inventory/${item._id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
