'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Search, Package } from 'lucide-react';
import { StockTransferDialog } from './stock-transfer-dialog';
import { getInventoryLocationsConfigAction } from '@/app/actions/inventory/location-actions';

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  trackByLocation: boolean;
  locations: Array<{ location: string; currentStock: number }>;
}

interface StockTransferClientProps {
  inventoryItems: InventoryItem[];
}

export function StockTransferClient({ inventoryItems }: StockTransferClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    const result = await getInventoryLocationsConfigAction();
    if (result.success && result.data) {
      setLocations(result.data.locations.filter((l: any) => l.isActive));
    }
  }

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === 'all' || 
      item.locations.some(loc => loc.location === locationFilter);
    return matchesSearch && matchesLocation && item.trackByLocation;
  });

  function handleTransferClick(item: InventoryItem) {
    setSelectedItem(item);
    setShowTransferDialog(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Transfer</CardTitle>
          <CardDescription>
            Transfer inventory between storage locations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location-filter">Filter by Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger id="location-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items with Location Tracking ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No items found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || locationFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No items have location tracking enabled'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.locations.map(loc => (
                            <Badge key={loc.location} variant="outline">
                              {locations.find(l => l.id === loc.location)?.name || loc.location}: {loc.currentStock} {item.unit}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Total: {item.currentStock} {item.unit}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleTransferClick(item)}
                        size="sm"
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Transfer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StockTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        inventoryItem={selectedItem || undefined}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
