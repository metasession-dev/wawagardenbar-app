'use client';

import { useState, useEffect } from 'react';
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
import { getInventoryLocationsConfigAction, transferStockAction } from '@/app/actions/inventory/location-actions';
import { Plus, Minus, Edit, ArrowRightLeft, Loader2 } from 'lucide-react';
import { IInventoryLocationConfig } from '@/interfaces';

interface Props {
  inventoryId: string;
  inventory: any;
}

/**
 * Stock adjustment actions component
 * Provides dialogs for adding, deducting, and adjusting stock
 */
export function StockAdjustmentActions({ inventoryId, inventory }: Props) {
  const [dialogType, setDialogType] = useState<'add' | 'deduct' | 'adjust' | 'transfer' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<IInventoryLocationConfig[]>([]);
  const [defaultReceivingLocation, setDefaultReceivingLocation] = useState<string>('');
  const [defaultSalesLocation, setDefaultSalesLocation] = useState<string>('');
  const router = useRouter();
  const { toast } = useToast();

  // Fetch locations if trackByLocation is enabled
  useEffect(() => {
    async function fetchLocations() {
      if (inventory.trackByLocation) {
        try {
          const result = await getInventoryLocationsConfigAction();
          if (result.success && result.data) {
            const activeLocations = result.data.locations.filter(l => l.isActive);
            setAvailableLocations(activeLocations);
            if (result.data.defaultReceivingLocation) {
              setDefaultReceivingLocation(result.data.defaultReceivingLocation);
            }
            if (result.data.defaultSalesLocation) {
              setDefaultSalesLocation(result.data.defaultSalesLocation);
            }
          }
        } catch (error) {
          console.error('Failed to fetch locations:', error);
        }
      }
    }
    fetchLocations();
  }, [inventory.trackByLocation]);

  // Add Stock Form
  const [addData, setAddData] = useState({
    quantity: 0,
    reason: '',
    supplier: '',
    costPerUnit: 0,
    invoiceNumber: '',
    notes: '',
    location: '',
  });

  // Set default location when it changes
  useEffect(() => {
    if (defaultReceivingLocation && !addData.location) {
      setAddData(prev => ({ ...prev, location: defaultReceivingLocation }));
    }
  }, [defaultReceivingLocation]);

  // Deduct Stock Form
  const [deductData, setDeductData] = useState({
    quantity: 0,
    reason: '',
    category: 'waste' as 'waste' | 'damage' | 'theft' | 'other',
    notes: '',
    location: '',
  });

  // Set default sales location for deductions
  useEffect(() => {
    if (defaultSalesLocation && !deductData.location) {
      setDeductData(prev => ({ ...prev, location: defaultSalesLocation }));
    }
  }, [defaultSalesLocation]);

  // Adjust Stock Form
  const [adjustData, setAdjustData] = useState({
    newStock: inventory.currentStock,
    reason: '',
    location: '',
  });

  // Transfer Stock Form
  const [transferData, setTransferData] = useState({
    fromLocation: '',
    toLocation: '',
    quantity: 0,
    transferReference: '',
    notes: '',
  });

  // Set default transfer locations when config loads
  useEffect(() => {
    if (defaultReceivingLocation && defaultSalesLocation) {
      setTransferData(prev => ({
        ...prev,
        fromLocation: prev.fromLocation || defaultReceivingLocation,
        toLocation: prev.toLocation || defaultSalesLocation,
      }));
    }
  }, [defaultReceivingLocation, defaultSalesLocation]);

  // Derive available stock at the selected "from" location for transfer
  const transferFromStock = (() => {
    if (!transferData.fromLocation) return 0;
    const loc = (inventory.locations || []).find((l: any) => l.location === transferData.fromLocation);
    return loc ? loc.currentStock : 0;
  })();

  // Derive the current stock for the selected adjust location
  const adjustLocationStock = (() => {
    if (!inventory.trackByLocation || !adjustData.location) return inventory.currentStock;
    const loc = (inventory.locations || []).find((l: any) => l.location === adjustData.location);
    return loc ? loc.currentStock : inventory.currentStock;
  })();

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
          location: defaultReceivingLocation,
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
          location: defaultSalesLocation,
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

    if (inventory.trackByLocation && availableLocations.length > 0 && !adjustData.location) {
      toast({
        title: 'Error',
        description: 'Please select a location to adjust',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await adjustStockAction(inventoryId, {
        newStock: adjustData.newStock,
        reason: adjustData.reason,
        ...(adjustData.location && { location: adjustData.location }),
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setDialogType(null);
        setAdjustData({
          newStock: inventory.currentStock,
          reason: '',
          location: '',
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

  async function handleTransferStock() {
    if (!transferData.fromLocation) {
      toast({ title: 'Error', description: 'Please select a source location', variant: 'destructive' });
      return;
    }
    if (!transferData.toLocation) {
      toast({ title: 'Error', description: 'Please select a destination location', variant: 'destructive' });
      return;
    }
    if (transferData.fromLocation === transferData.toLocation) {
      toast({ title: 'Error', description: 'Source and destination must be different', variant: 'destructive' });
      return;
    }
    if (transferData.quantity <= 0) {
      toast({ title: 'Error', description: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }
    if (transferData.quantity > transferFromStock) {
      toast({
        title: 'Error',
        description: `Insufficient stock. Available: ${transferFromStock} ${inventory.unit}`,
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await transferStockAction({
        inventoryId,
        fromLocation: transferData.fromLocation,
        toLocation: transferData.toLocation,
        quantity: transferData.quantity,
        ...(transferData.transferReference && { transferReference: transferData.transferReference }),
        ...(transferData.notes && { notes: transferData.notes }),
      });
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setDialogType(null);
        setTransferData({
          fromLocation: defaultReceivingLocation,
          toLocation: defaultSalesLocation,
          quantity: 0,
          transferReference: '',
          notes: '',
        });
        router.refresh();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to transfer stock', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-4">
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
        {inventory.trackByLocation && availableLocations.length >= 2 && (
          <Button variant="outline" onClick={() => setDialogType('transfer')}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Transfer Stock
          </Button>
        )}
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
            {inventory.trackByLocation && availableLocations.length > 0 && (
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select
                  value={addData.location}
                  onValueChange={(value) => setAddData({ ...addData, location: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Stock will be added to this location
                </p>
              </div>
            )}
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
            {inventory.trackByLocation && availableLocations.length > 0 && (
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select
                  value={deductData.location}
                  onValueChange={(value) => setDeductData({ ...deductData, location: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Stock will be deducted from this location
                </p>
              </div>
            )}
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

      {/* Transfer Stock Dialog */}
      <Dialog open={dialogType === 'transfer'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
            <DialogDescription>
              Move stock between locations (e.g. Store → Chiller)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>From Location *</Label>
              <Select
                value={transferData.fromLocation}
                onValueChange={(value) => setTransferData({ ...transferData, fromLocation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => {
                    const locData = (inventory.locations || []).find(
                      (l: any) => l.location === location.id
                    );
                    return (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} — {locData ? locData.currentStock : 0} {inventory.unit}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {transferData.fromLocation && (
                <p className="text-xs text-muted-foreground">
                  Available: {transferFromStock} {inventory.unit}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>To Location *</Label>
              <Select
                value={transferData.toLocation}
                onValueChange={(value) => setTransferData({ ...transferData, toLocation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination location" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations
                    .filter((location) => location.id !== transferData.fromLocation)
                    .map((location) => {
                      const locData = (inventory.locations || []).find(
                        (l: any) => l.location === location.id
                      );
                      return (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} — {locData ? locData.currentStock : 0} {inventory.unit}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={transferFromStock}
                value={transferData.quantity || ''}
                onChange={(e) => setTransferData({ ...transferData, quantity: parseFloat(e.target.value) || 0 })}
                placeholder={`Max: ${transferFromStock}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Transfer Reference</Label>
              <Input
                value={transferData.transferReference}
                onChange={(e) => setTransferData({ ...transferData, transferReference: e.target.value })}
                placeholder="TRF-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={transferData.notes}
                onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                placeholder="Reason for transfer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleTransferStock} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Stock
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
            {inventory.trackByLocation && availableLocations.length > 0 && (
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select
                  value={adjustData.location}
                  onValueChange={(value) => {
                    const loc = (inventory.locations || []).find((l: any) => l.location === value);
                    const locStock = loc ? loc.currentStock : inventory.currentStock;
                    setAdjustData({ ...adjustData, location: value, newStock: locStock });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location to adjust" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map((location) => {
                      const locData = (inventory.locations || []).find(
                        (l: any) => l.location === location.id
                      );
                      return (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} — {locData ? locData.currentStock : 0} {inventory.unit}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select which location stock count to adjust
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <Input
                value={`${adjustLocationStock} ${inventory.unit}${
                  inventory.trackByLocation && adjustData.location
                    ? ` (${availableLocations.find(l => l.id === adjustData.location)?.name ?? adjustData.location})`
                    : ''
                }`}
                disabled
              />
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
                Difference: {adjustData.newStock - adjustLocationStock > 0 ? '+' : ''}
                {(adjustData.newStock - adjustLocationStock).toFixed(2)}
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
