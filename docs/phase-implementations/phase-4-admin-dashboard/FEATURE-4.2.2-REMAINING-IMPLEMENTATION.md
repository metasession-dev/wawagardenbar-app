# Feature 4.2.2: Remaining Frontend Implementation Guide

**Status:** Backend 100% Complete, Frontend 20% Complete  
**Date:** November 17, 2025

---

## ✅ Completed So Far

### Backend (100% Complete)
- ✅ All database models updated
- ✅ InventoryService with 11 methods
- ✅ Menu item creation with inventory
- ✅ Manual stock adjustments (3 actions)
- ✅ Order completion with auto-deduction
- ✅ Email alerts
- ✅ Audit logging

### Frontend (20% Complete)
- ✅ Menu item form updated with inventory fields

---

## 📋 Remaining Tasks

### Phase 7: Inventory Detail Page & Stock Adjustment Dialogs

#### File 1: `/app/dashboard/inventory/[id]/page.tsx`

```typescript
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-middleware';
import { getInventoryDetailsAction } from '@/app/actions/admin/inventory-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StockAdjustmentActions } from '@/components/features/admin/stock-adjustment-actions';
import { StockHistoryTable } from '@/components/features/admin/stock-history-table';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface Props {
  params: {
    id: string;
  };
}

export default async function InventoryDetailPage({ params }: Props) {
  await requireAdmin();

  const result = await getInventoryDetailsAction(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const inventory = result.data;
  const stockPercentage = (inventory.currentStock / inventory.maximumStock) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{inventory.menuItemId?.name}</h1>
        <p className="text-muted-foreground">
          {inventory.menuItemId?.mainCategory} • {inventory.menuItemId?.category}
        </p>
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
            <Badge
              variant={
                inventory.status === 'in-stock'
                  ? 'default'
                  : inventory.status === 'low-stock'
                  ? 'warning'
                  : 'destructive'
              }
              className="mt-2"
            >
              {inventory.status}
            </Badge>
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
              ₦{(inventory.totalWaste * inventory.costPerUnit).toLocaleString()}
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
            <Progress value={stockPercentage} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Stock Adjustment Actions */}
      <StockAdjustmentActions inventoryId={params.id} inventory={inventory} />

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
```

#### File 2: `/components/features/admin/stock-adjustment-actions.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  addStockAction,
  deductStockAction,
  adjustStockAction,
} from '@/app/actions/admin/inventory-actions';
import { Plus, Minus, Edit, Loader2 } from 'lucide-react';

interface Props {
  inventoryId: string;
  inventory: any;
}

export function StockAdjustmentActions({ inventoryId, inventory }: Props) {
  const [dialogType, setDialogType] = useState<'add' | 'deduct' | 'adjust' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Add Stock Form
  const [addData, setAddData] = useState({
    quantity: 0,
    reason: '',
    supplier: '',
    costPerUnit: 0,
    invoiceNumber: '',
    notes: '',
  });

  // Deduct Stock Form
  const [deductData, setDeductData] = useState({
    quantity: 0,
    reason: '',
    category: 'waste' as 'waste' | 'damage' | 'theft' | 'other',
    notes: '',
  });

  // Adjust Stock Form
  const [adjustData, setAdjustData] = useState({
    newStock: inventory.currentStock,
    reason: '',
  });

  async function handleAddStock() {
    if (addData.quantity <= 0) {
      toast({
        title: 'Error',
        description: 'Quantity must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await addStockAction(inventoryId, addData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setDialogType(null);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeductStock() {
    if (deductData.quantity <= 0) {
      toast({
        title: 'Error',
        description: 'Quantity must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await deductStockAction(inventoryId, deductData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setDialogType(null);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deduct stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdjustStock() {
    if (adjustData.newStock < 0) {
      toast({
        title: 'Error',
        description: 'Stock cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await adjustStockAction(inventoryId, adjustData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setDialogType(null);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to adjust stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex gap-4">
        <Button onClick={() => setDialogType('add')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
        <Button variant="outline" onClick={() => setDialogType('deduct')}>
          <Minus className="mr-2 h-4 w-4" />
          Deduct Stock
        </Button>
        <Button variant="outline" onClick={() => setDialogType('adjust')}>
          <Edit className="mr-2 h-4 w-4" />
          Adjust Stock
        </Button>
      </div>

      {/* Add Stock Dialog */}
      <Dialog open={dialogType === 'add'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock (Restocking)</DialogTitle>
            <DialogDescription>
              Record new inventory received from suppliers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={addData.quantity}
                onChange={(e) => setAddData({ ...addData, quantity: parseInt(e.target.value) })}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={addData.reason}
                onChange={(e) => setAddData({ ...addData, reason: e.target.value })}
                placeholder="Weekly restock"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={addData.supplier}
                  onChange={(e) => setAddData({ ...addData, supplier: e.target.value })}
                  placeholder="ABC Suppliers"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={addData.invoiceNumber}
                  onChange={(e) => setAddData({ ...addData, invoiceNumber: e.target.value })}
                  placeholder="INV-2024-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cost Per Unit (₦)</Label>
              <Input
                type="number"
                step="0.01"
                value={addData.costPerUnit}
                onChange={(e) => setAddData({ ...addData, costPerUnit: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={addData.notes}
                onChange={(e) => setAddData({ ...addData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddStock} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduct Stock Dialog */}
      <Dialog open={dialogType === 'deduct'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Stock</DialogTitle>
            <DialogDescription>
              Record waste, damage, theft, or other stock reductions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={deductData.quantity}
                onChange={(e) => setDeductData({ ...deductData, quantity: parseInt(e.target.value) })}
                placeholder="5"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={deductData.category}
                onValueChange={(value: any) => setDeductData({ ...deductData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waste">Waste/Spoilage</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={deductData.reason}
                onChange={(e) => setDeductData({ ...deductData, reason: e.target.value })}
                placeholder="Items expired"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={deductData.notes}
                onChange={(e) => setDeductData({ ...deductData, notes: e.target.value })}
                placeholder="Additional details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleDeductStock} disabled={isLoading} variant="destructive">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deduct Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={dialogType === 'adjust'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Correct stock level based on physical count
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input value={`${inventory.currentStock} ${inventory.unit}`} disabled />
            </div>
            <div className="space-y-2">
              <Label>New Stock Level *</Label>
              <Input
                type="number"
                value={adjustData.newStock}
                onChange={(e) => setAdjustData({ ...adjustData, newStock: parseInt(e.target.value) })}
                placeholder="45"
              />
              <p className="text-sm text-muted-foreground">
                Difference: {adjustData.newStock - inventory.currentStock > 0 ? '+' : ''}
                {adjustData.newStock - inventory.currentStock}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={adjustData.reason}
                onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                placeholder="Physical inventory count"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adjust Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### File 3: `/components/features/admin/stock-history-table.tsx`

```typescript
'use client';

import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Edit } from 'lucide-react';

interface StockHistoryEntry {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment';
  reason: string;
  category?: string;
  timestamp: string;
  performedByName?: string;
  notes?: string;
  supplier?: string;
  invoiceNumber?: string;
}

interface Props {
  history: StockHistoryEntry[];
  unit: string;
}

export function StockHistoryTable({ history, unit }: Props) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stock movements recorded yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date & Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Performed By</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((entry, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">
              {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {entry.type === 'addition' && (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <Badge variant="default">Addition</Badge>
                  </>
                )}
                {entry.type === 'deduction' && (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <Badge variant="destructive">Deduction</Badge>
                  </>
                )}
                {entry.type === 'adjustment' && (
                  <>
                    <Edit className="h-4 w-4 text-blue-600" />
                    <Badge variant="secondary">Adjustment</Badge>
                  </>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span
                className={
                  entry.quantity > 0
                    ? 'text-green-600 font-semibold'
                    : 'text-red-600 font-semibold'
                }
              >
                {entry.quantity > 0 ? '+' : ''}
                {entry.quantity} {unit}
              </span>
            </TableCell>
            <TableCell>
              <div>
                <p>{entry.reason}</p>
                {entry.category && (
                  <Badge variant="outline" className="mt-1">
                    {entry.category}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>{entry.performedByName || 'System'}</TableCell>
            <TableCell>
              <div className="text-sm text-muted-foreground">
                {entry.supplier && <p>Supplier: {entry.supplier}</p>}
                {entry.invoiceNumber && <p>Invoice: {entry.invoiceNumber}</p>}
                {entry.notes && <p>{entry.notes}</p>}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

### Phase 8: Update Inventory Table with Actions

Modify `/components/features/admin/inventory-table.tsx`:

Add to the actions dropdown:
```typescript
<DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/${item._id}`)}>
  <Package className="mr-2 h-4 w-4" />
  View Details
</DropdownMenuItem>
```

---

### Phase 9: Testing Checklist

- [ ] Create menu item with inventory tracking enabled
- [ ] Create menu item without inventory tracking
- [ ] Verify inventory record is created and linked
- [ ] Add stock via admin interface
- [ ] Deduct stock (waste)
- [ ] Adjust stock (correction)
- [ ] Complete an order and verify stock deduction
- [ ] Check low stock email alert (set stock below minimum)
- [ ] View stock history accuracy
- [ ] Test concurrent stock updates
- [ ] Verify audit logs in database

---

### Phase 10: User Guide

Create `/docs/Phase 4: Admin Dashboard/INVENTORY-USER-GUIDE.md` with:

1. **Creating Menu Items with Inventory**
2. **Viewing Inventory Dashboard**
3. **Managing Stock Levels**
4. **Understanding Stock Alerts**
5. **Reading Stock History**
6. **Best Practices**
7. **Troubleshooting**

---

## 🚀 Quick Implementation Steps

1. **Copy the code above** for each file
2. **Create the files** in the specified locations
3. **Test each component** individually
4. **Run end-to-end tests**
5. **Write user documentation**

**Estimated Time:** 2-3 hours

---

*Guide created: November 17, 2025*
