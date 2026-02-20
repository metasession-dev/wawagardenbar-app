'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { transferStockAction, getInventoryLocationsConfigAction } from '@/app/actions/inventory/location-actions';

interface StockTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem?: {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
    locations: Array<{ location: string; currentStock: number }>;
  };
  onSuccess?: () => void;
}

export function StockTransferDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: StockTransferDialogProps) {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [availableStock, setAvailableStock] = useState(0);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (fromLocation && inventoryItem) {
      const location = inventoryItem.locations.find(l => l.location === fromLocation);
      setAvailableStock(location?.currentStock || 0);
    }
  }, [fromLocation, inventoryItem]);

  async function loadLocations() {
    const result = await getInventoryLocationsConfigAction();
    if (result.success && result.data) {
      setLocations(result.data.locations.filter((l: any) => l.isActive));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!inventoryItem) return;
    
    const qty = parseFloat(quantity);
    
    if (qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    
    if (qty > availableStock) {
      toast.error(`Insufficient stock. Available: ${availableStock} ${inventoryItem.unit}`);
      return;
    }
    
    if (fromLocation === toLocation) {
      toast.error('Source and destination must be different');
      return;
    }
    
    setIsLoading(true);
    
    const result = await transferStockAction({
      inventoryId: inventoryItem.id,
      fromLocation,
      toLocation,
      quantity: qty,
      transferReference: transferReference || undefined,
      notes: notes || undefined,
    });
    
    setIsLoading(false);
    
    if (result.success) {
      toast.success('Stock transferred successfully');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error || 'Failed to transfer stock');
    }
  }

  function resetForm() {
    setFromLocation('');
    setToLocation('');
    setQuantity('');
    setTransferReference('');
    setNotes('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogDescription>
            Move {inventoryItem?.name} between storage locations
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-location">From Location</Label>
              <Select value={fromLocation} onValueChange={setFromLocation} required>
                <SelectTrigger id="from-location">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItem?.locations.map((loc) => (
                    <SelectItem key={loc.location} value={loc.location}>
                      {locations.find(l => l.id === loc.location)?.name || loc.location}
                      {' '}({loc.currentStock} {inventoryItem.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="to-location">To Location</Label>
              <Select value={toLocation} onValueChange={setToLocation} required>
                <SelectTrigger id="to-location">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {fromLocation && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              Available in {locations.find(l => l.id === fromLocation)?.name}: 
              <span className="font-semibold ml-1">
                {availableStock} {inventoryItem?.unit}
              </span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              max={availableStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Enter quantity (${inventoryItem?.unit})`}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reference">Transfer Reference (Optional)</Label>
            <Input
              id="reference"
              value={transferReference}
              onChange={(e) => setTransferReference(e.target.value)}
              placeholder="e.g., TR-2024-001"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Transfer Stock
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
