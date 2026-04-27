'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  deriveCombinedPricePreview,
  combinedToSurcharge,
} from '@/lib/customization-builder-preview';

interface CustomizationOption {
  name: string;
  price: number;
  available: boolean;
  inventoryId?: string;
  inventoryDeduction?: number;
}

interface Customization {
  name: string;
  required: boolean;
  options: CustomizationOption[];
}

interface InventoryLookupItem {
  _id: string;
  name: string;
  unit: string;
}

interface CustomizationOptionsBuilderProps {
  customizations: Customization[];
  onChange: (customizations: Customization[]) => void;
  disabled?: boolean;
  availableInventories?: InventoryLookupItem[];
  // REQ-031: needed for the live "Combined price" preview (D10).
  // Optional so existing callers without REQ-031 wiring still compile.
  basePrice?: number;
  itemName?: string;
}

// Sentinel used by the Select "— None —" item. `<SelectItem value="">` is
// disallowed by Radix, so we round-trip through a sentinel and treat it as
// "clear the inventoryId field".
const NO_INVENTORY_LINK = '__none__';

/**
 * Customization options builder component
 * Allows building customization groups with options
 */
export function CustomizationOptionsBuilder({
  customizations,
  onChange,
  disabled = false,
  availableInventories = [],
  basePrice,
  itemName,
}: CustomizationOptionsBuilderProps) {
  const showCombinedPreview =
    typeof basePrice === 'number' && !!itemName && itemName.length > 0;
  function addGroup() {
    onChange([
      ...customizations,
      {
        name: '',
        required: false,
        options: [{ name: '', price: 0, available: true }],
      },
    ]);
  }

  function removeGroup(groupIndex: number) {
    onChange(customizations.filter((_, i) => i !== groupIndex));
  }

  function updateGroup(
    groupIndex: number,
    field: keyof Customization,
    value: any
  ) {
    const updated = [...customizations];
    updated[groupIndex] = { ...updated[groupIndex], [field]: value };
    onChange(updated);
  }

  function addOption(groupIndex: number) {
    const updated = [...customizations];
    updated[groupIndex].options.push({ name: '', price: 0, available: true });
    onChange(updated);
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    const updated = [...customizations];
    updated[groupIndex].options = updated[groupIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    onChange(updated);
  }

  function updateOption(
    groupIndex: number,
    optionIndex: number,
    field: keyof CustomizationOption,
    value: any
  ) {
    const updated = [...customizations];
    updated[groupIndex].options[optionIndex] = {
      ...updated[groupIndex].options[optionIndex],
      [field]: value,
    };
    onChange(updated);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Customization Options</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGroup}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {customizations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No customization options yet</p>
            <p className="text-sm">
              Add groups like "Size", "Add-ons", or "Extras"
            </p>
          </div>
        ) : (
          customizations.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-4 p-4 border rounded-lg">
              {/* Group Header */}
              <div className="flex items-start gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                <div className="flex-1 space-y-4">
                  {/* Group Name & Required Toggle */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label>Group Name</Label>
                      <Input
                        value={group.name}
                        onChange={(e) =>
                          updateGroup(groupIndex, 'name', e.target.value)
                        }
                        placeholder="e.g., Size, Add-ons"
                        disabled={disabled}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-8">
                      <Switch
                        checked={group.required}
                        onCheckedChange={(checked) =>
                          updateGroup(groupIndex, 'required', checked)
                        }
                        disabled={disabled}
                      />
                      <Label className="text-sm">Required</Label>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <Label className="text-sm">Options</Label>
                    {group.options.map((option, optionIndex) => {
                      const unit =
                        availableInventories.find(
                          (i) => i._id === option.inventoryId
                        )?.unit ?? 'units';
                      return (
                        <div
                          key={optionIndex}
                          className="space-y-2 rounded-md border p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={option.name}
                              onChange={(e) =>
                                updateOption(
                                  groupIndex,
                                  optionIndex,
                                  'name',
                                  e.target.value
                                )
                              }
                              placeholder="Option name"
                              disabled={disabled}
                              className="flex-1"
                            />
                            <div className="flex w-44 flex-col gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={option.price}
                                onChange={(e) =>
                                  updateOption(
                                    groupIndex,
                                    optionIndex,
                                    'price',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="Surcharge"
                                disabled={disabled}
                                className="w-full"
                              />
                              {showCombinedPreview && option.name && (
                                <p
                                  className="text-xs text-muted-foreground"
                                  data-testid="combined-price-preview"
                                >
                                  {deriveCombinedPricePreview({
                                    basePrice: basePrice!,
                                    surcharge: option.price || 0,
                                    itemName: itemName!,
                                    optionName: option.name,
                                  })}
                                </p>
                              )}
                              {showCombinedPreview && option.name && (
                                <details className="text-xs text-muted-foreground">
                                  <summary className="cursor-pointer hover:text-foreground">
                                    Set combined price instead
                                  </summary>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Combined price for ${itemName} + ${option.name}`}
                                    onChange={(e) => {
                                      const combined = parseFloat(
                                        e.target.value
                                      );
                                      if (Number.isNaN(combined)) return;
                                      updateOption(
                                        groupIndex,
                                        optionIndex,
                                        'price',
                                        Math.max(
                                          0,
                                          combinedToSurcharge(
                                            combined,
                                            basePrice!
                                          )
                                        )
                                      );
                                    }}
                                    className="mt-1 w-full"
                                  />
                                </details>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removeOption(groupIndex, optionIndex)
                              }
                              disabled={disabled || group.options.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {availableInventories.length > 0 && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  Deduct from inventory (optional)
                                </Label>
                                <Select
                                  value={
                                    option.inventoryId || NO_INVENTORY_LINK
                                  }
                                  onValueChange={(value) => {
                                    if (value === NO_INVENTORY_LINK) {
                                      updateOption(
                                        groupIndex,
                                        optionIndex,
                                        'inventoryId',
                                        undefined
                                      );
                                      updateOption(
                                        groupIndex,
                                        optionIndex,
                                        'inventoryDeduction',
                                        undefined
                                      );
                                    } else {
                                      updateOption(
                                        groupIndex,
                                        optionIndex,
                                        'inventoryId',
                                        value
                                      );
                                      if (
                                        option.inventoryDeduction === undefined
                                      ) {
                                        updateOption(
                                          groupIndex,
                                          optionIndex,
                                          'inventoryDeduction',
                                          1
                                        );
                                      }
                                    }
                                  }}
                                  disabled={disabled}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="— None —" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_INVENTORY_LINK}>
                                      — None —
                                    </SelectItem>
                                    {availableInventories.map((inv) => (
                                      <SelectItem key={inv._id} value={inv._id}>
                                        {inv.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {option.inventoryId && (
                                <div className="w-full space-y-1 sm:w-48">
                                  <Label className="text-xs text-muted-foreground">
                                    Units to deduct ({unit})
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={option.inventoryDeduction ?? 1}
                                    onChange={(e) => {
                                      const parsed = parseFloat(e.target.value);
                                      updateOption(
                                        groupIndex,
                                        optionIndex,
                                        'inventoryDeduction',
                                        Number.isFinite(parsed) && parsed > 0
                                          ? parsed
                                          : 1
                                      );
                                    }}
                                    disabled={disabled}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addOption(groupIndex)}
                      disabled={disabled}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Option
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGroup(groupIndex)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {groupIndex < customizations.length - 1 && <Separator />}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
