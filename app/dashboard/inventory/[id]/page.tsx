import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInventoryDetailsAction } from '@/app/actions/admin/inventory-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { StockAdjustmentActions } from '@/components/features/admin/stock-adjustment-actions';
import { StockHistoryTable } from '@/components/features/admin/stock-history-table';
import { Package, TrendingUp, TrendingDown, AlertTriangle, ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Inventory detail page
 * View and manage individual inventory item
 */
export default async function InventoryDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getInventoryDetailsAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const inventory = result.data as any;
  const stockPercentage = (inventory.currentStock / inventory.maximumStock) * 100;

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'default';
      case 'low-stock':
        return 'secondary';
      case 'out-of-stock':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Get progress bar color
  const getProgressColor = () => {
    if (stockPercentage <= 0) return 'bg-red-600';
    if (stockPercentage <= 20) return 'bg-orange-600';
    if (stockPercentage <= 50) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard/inventory">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{inventory.menuItemId?.name || 'Unknown Item'}</h1>
          <p className="text-muted-foreground">
            {inventory.menuItemId?.mainCategory} • {inventory.menuItemId?.category}
            {inventory.menuItemId?.price && ` • ₦${inventory.menuItemId.price.toLocaleString()}`}
          </p>
        </div>
        <Badge variant={getStatusVariant(inventory.status)} className="text-lg px-4 py-2">
          {inventory.status.replace('-', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Stock Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventory.currentStock} {inventory.unit}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Min: {inventory.minimumStock} • Max: {inventory.maximumStock}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.totalSales}</div>
            <p className="text-xs text-muted-foreground">Lifetime sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waste</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.totalWaste}</div>
            <p className="text-xs text-muted-foreground">
              ₦{(inventory.totalWaste * inventory.costPerUnit).toLocaleString()} cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Level</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stockPercentage)}%</div>
            <Progress value={stockPercentage} className={`mt-2 ${getProgressColor()}`} />
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supplier</p>
              <p className="text-lg">{inventory.supplier || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cost Per Unit</p>
              <p className="text-lg">₦{inventory.costPerUnit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Restocked</p>
              <p className="text-lg">
                {inventory.lastRestocked
                  ? new Date(inventory.lastRestocked).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Sale</p>
              <p className="text-lg">
                {inventory.lastSaleDate
                  ? new Date(inventory.lastSaleDate).toLocaleDateString()
                  : 'No sales yet'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Restocked</p>
              <p className="text-lg">
                {inventory.totalRestocked} {inventory.unit}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stock Value</p>
              <p className="text-lg">
                ₦{(inventory.currentStock * inventory.costPerUnit).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          <StockAdjustmentActions inventoryId={id} inventory={inventory} />
        </CardContent>
      </Card>

      {/* Stock History */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <StockHistoryTable history={inventory.stockHistory} unit={inventory.unit} />
        </CardContent>
      </Card>
    </div>
  );
}
