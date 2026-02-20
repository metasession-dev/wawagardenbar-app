'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateInventoryLocationsConfigAction } from '@/app/actions/inventory/location-actions';
import { IInventoryLocationsSettings, IInventoryLocationConfig } from '@/interfaces';

interface InventoryLocationsFormProps {
  initialConfig: IInventoryLocationsSettings;
}

export function InventoryLocationsForm({ initialConfig }: InventoryLocationsFormProps) {
  const [config, setConfig] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(false);

  function addLocation() {
    const newLocation: IInventoryLocationConfig = {
      id: `location-${Date.now()}`,
      name: '',
      type: 'other',
      isActive: true,
      displayOrder: config.locations.length + 1,
    };
    
    setConfig({
      ...config,
      locations: [...config.locations, newLocation],
    });
  }

  function removeLocation(id: string) {
    const newLocations = config.locations.filter(l => l.id !== id);
    const activeLocationIds = newLocations.filter(l => l.isActive).map(l => l.id);
    
    setConfig({
      ...config,
      locations: newLocations,
      defaultReceivingLocation: config.defaultReceivingLocation === id 
        ? (activeLocationIds[0] || '') 
        : config.defaultReceivingLocation,
      defaultSalesLocation: config.defaultSalesLocation === id 
        ? (activeLocationIds[0] || '') 
        : config.defaultSalesLocation,
    });
  }

  function updateLocation(id: string, updates: Partial<IInventoryLocationConfig>) {
    setConfig({
      ...config,
      locations: config.locations.map(l =>
        l.id === id ? { ...l, ...updates } : l
      ),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Client-side validation
    if (config.enabled) {
      const activeLocations = config.locations.filter(l => l.isActive);
      
      if (activeLocations.length === 0) {
        toast.error('At least one location must be active when location tracking is enabled');
        return;
      }
      
      // Get ALL location IDs (including inactive ones) - this matches server validation
      const locationIds = config.locations.map(l => l.id);
      
      if (!config.defaultReceivingLocation) {
        toast.error('Please select a default receiving location');
        return;
      }
      
      if (!config.defaultSalesLocation) {
        toast.error('Please select a default sales location');
        return;
      }
      
      // Check if default locations exist in the configured locations list
      if (!locationIds.includes(config.defaultReceivingLocation)) {
        toast.error(`Default receiving location "${config.defaultReceivingLocation}" is not in the configured locations list`);
        console.log('Available location IDs:', locationIds);
        console.log('Default receiving location:', config.defaultReceivingLocation);
        return;
      }
      
      if (!locationIds.includes(config.defaultSalesLocation)) {
        toast.error(`Default sales location "${config.defaultSalesLocation}" is not in the configured locations list`);
        console.log('Available location IDs:', locationIds);
        console.log('Default sales location:', config.defaultSalesLocation);
        return;
      }
      
      // Check for duplicate location IDs
      const duplicateIds = locationIds.filter((id, index) => locationIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        toast.error(`Duplicate location IDs found: ${duplicateIds.join(', ')}`);
        return;
      }
      
      // Check for empty location names or IDs
      const emptyLocations = config.locations.filter(l => !l.id || !l.name);
      if (emptyLocations.length > 0) {
        toast.error('All locations must have both an ID and a name');
        return;
      }
    }
    
    setIsLoading(true);
    
    const result = await updateInventoryLocationsConfigAction(config);
    
    setIsLoading(false);
    
    if (result.success) {
      toast.success('Locations configuration saved successfully');
    } else {
      toast.error(result.error || 'Failed to save configuration');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Location Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track inventory across multiple physical locations
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
            />
          </div>
          
          {config.enabled && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Locations</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {config.locations.map((location) => (
                    <Card key={location.id}>
                      <CardContent className="pt-6">
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Location ID</Label>
                              <Input
                                value={location.id}
                                onChange={(e) => updateLocation(location.id, { id: e.target.value })}
                                placeholder="e.g., chiller-1"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Display Name</Label>
                              <Input
                                value={location.name}
                                onChange={(e) => updateLocation(location.id, { name: e.target.value })}
                                placeholder="e.g., Bar Chiller 1"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Select
                                value={location.type}
                                onValueChange={(value: 'storage' | 'chiller' | 'other') => 
                                  updateLocation(location.id, { type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="storage">Storage</SelectItem>
                                  <SelectItem value="chiller">Chiller</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-end">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={location.isActive}
                                  onCheckedChange={(isActive) => updateLocation(location.id, { isActive })}
                                />
                                <Label>Active</Label>
                              </div>
                            </div>
                            
                            <div className="flex items-end justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLocation(location.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Receiving Location *</Label>
                  <p className="text-xs text-muted-foreground">
                    Where new stock is received by default
                  </p>
                  <Select
                    value={config.defaultReceivingLocation}
                    onValueChange={(value) => setConfig({ ...config, defaultReceivingLocation: value })}
                    disabled={config.locations.filter(l => l.isActive).length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select receiving location" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.locations.filter(l => l.isActive).map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {config.locations.filter(l => l.isActive).length === 0 && (
                    <p className="text-xs text-destructive">
                      Add at least one active location first
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Default Sales Location *</Label>
                  <p className="text-xs text-muted-foreground">
                    Where sales deduct from by default
                  </p>
                  <Select
                    value={config.defaultSalesLocation}
                    onValueChange={(value) => setConfig({ ...config, defaultSalesLocation: value })}
                    disabled={config.locations.filter(l => l.isActive).length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales location" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.locations.filter(l => l.isActive).map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {config.locations.filter(l => l.isActive).length === 0 && (
                    <p className="text-xs text-destructive">
                      Add at least one active location first
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Transfer Notes</Label>
                    <p className="text-sm text-muted-foreground">
                      Make notes mandatory when transferring stock
                    </p>
                  </div>
                  <Switch
                    checked={config.requireTransferNotes}
                    onCheckedChange={(requireTransferNotes) => 
                      setConfig({ ...config, requireTransferNotes })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Negative Stock</Label>
                    <p className="text-sm text-muted-foreground">
                      Permit stock levels to go below zero
                    </p>
                  </div>
                  <Switch
                    checked={config.allowNegativeStock}
                    onCheckedChange={(allowNegativeStock) => 
                      setConfig({ ...config, allowNegativeStock })
                    }
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
    </form>
  );
}
