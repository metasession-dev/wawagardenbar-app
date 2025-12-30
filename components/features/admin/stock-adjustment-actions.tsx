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

/**
 * Stock adjustment actions component
 * Provides dialogs for adding, deducting, and adjusting stock
 */
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

    if (!addData.reason) {
      toast({
        title: 'Error',
        description: 'Reason is required',
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
        setAddData({
          quantity: 0,
          reason: '',
          supplier: '',
          costPerUnit: 0,
          invoiceNumber: '',
          notes: '',
        });
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

    if (!deductData.reason) {
      toast({
        title: 'Error',
        description: 'Reason is required',
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
        setDeductData({
          quantity: 0,
          reason: '',
          category: 'waste',
          notes: '',
        });
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

    if (!adjustData.reason) {
      toast({
        title: 'Error',
        description: 'Reason is required',
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
        setAdjustData({
          newStock: inventory.currentStock,
          reason: '',
        });
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
        <DialogContent className="max-w-md">
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
                step="0.01"
                value={addData.quantity || ''}
                onChange={(e) => setAddData({ ...addData, quantity: parseFloat(e.target.value) || 0 })}
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
                value={addData.costPerUnit || ''}
                onChange={(e) => setAddData({ ...addData, costPerUnit: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={addData.notes}
                onChange={(e) => setAddData({ ...addData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} disabled={isLoading}>
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
        <DialogContent className="max-w-md">
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
                step="0.01"
                value={deductData.quantity || ''}
                onChange={(e) => setDeductData({ ...deductData, quantity: parseFloat(e.target.value) || 0 })}
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
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} disabled={isLoading}>
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
        <DialogContent className="max-w-md">
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
                step="0.01"
                value={adjustData.newStock || ''}
                onChange={(e) => setAdjustData({ ...adjustData, newStock: parseFloat(e.target.value) || 0 })}
                placeholder="45"
              />
              <p className="text-sm text-muted-foreground">
                Difference: {adjustData.newStock - inventory.currentStock > 0 ? '+' : ''}
                {(adjustData.newStock - inventory.currentStock).toFixed(2)}
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
            <Button variant="outline" onClick={() => setDialogType(null)} disabled={isLoading}>
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
