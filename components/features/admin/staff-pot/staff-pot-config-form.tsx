/**
 * @requirement REQ-015 - Staff Pot configuration form (super-admin only)
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { updateStaffPotConfigAction } from '@/app/actions/admin/staff-pot-actions';

interface StaffPotConfig {
  dailyTarget: number;
  bonusPercentage: number;
  kitchenSplitRatio: number;
  barSplitRatio: number;
  kitchenStaffCount: number;
  barStaffCount: number;
  startDate?: string;
  inventoryLossEnabled: boolean;
  foodLossThreshold: number;
  drinkLossThreshold: number;
}

interface StaffPotConfigFormProps {
  initialConfig: StaffPotConfig;
}

export function StaffPotConfigForm({ initialConfig }: StaffPotConfigFormProps) {
  const [config, setConfig] = useState<StaffPotConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateStaffPotConfigAction(config);
      if (result.success) {
        toast({
          title: 'Saved',
          description: 'Staff Pot configuration updated',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dailyTarget">Daily Revenue Target (₦)</Label>
          <Input
            id="dailyTarget"
            type="number"
            min="0"
            value={config.dailyTarget}
            onChange={(e) =>
              setConfig({ ...config, dailyTarget: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bonusPercentage">Bonus Percentage (%)</Label>
          <Input
            id="bonusPercentage"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={config.bonusPercentage}
            onChange={(e) =>
              setConfig({
                ...config,
                bonusPercentage: Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kitchenSplit">Kitchen Split (%)</Label>
          <Input
            id="kitchenSplit"
            type="number"
            min="0"
            max="100"
            value={config.kitchenSplitRatio}
            onChange={(e) => {
              const kitchen = Number(e.target.value);
              setConfig({
                ...config,
                kitchenSplitRatio: kitchen,
                barSplitRatio: 100 - kitchen,
              });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barSplit">Bar Split (%)</Label>
          <Input
            id="barSplit"
            type="number"
            min="0"
            max="100"
            value={config.barSplitRatio}
            onChange={(e) => {
              const bar = Number(e.target.value);
              setConfig({
                ...config,
                barSplitRatio: bar,
                kitchenSplitRatio: 100 - bar,
              });
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kitchenStaff">Kitchen Staff Count</Label>
          <Input
            id="kitchenStaff"
            type="number"
            min="0"
            value={config.kitchenStaffCount}
            onChange={(e) =>
              setConfig({
                ...config,
                kitchenStaffCount: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barStaff">Bar Staff Count</Label>
          <Input
            id="barStaff"
            type="number"
            min="0"
            value={config.barStaffCount}
            onChange={(e) =>
              setConfig({
                ...config,
                barStaffCount: Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Incentive Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={config.startDate || ''}
            onChange={(e) =>
              setConfig({
                ...config,
                startDate: e.target.value || undefined,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Only days from this date onward count toward the pot. Leave empty to
            start from the 1st of each month.
          </p>
        </div>
      </div>

      {/* Inventory Loss Deduction */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center gap-3 mb-4">
          <input
            id="inventoryLossEnabled"
            type="checkbox"
            checked={config.inventoryLossEnabled || false}
            onChange={(e) =>
              setConfig({
                ...config,
                inventoryLossEnabled: e.target.checked,
              })
            }
            className="h-4 w-4"
          />
          <Label htmlFor="inventoryLossEnabled" className="font-medium">
            Enable Inventory Loss Deduction
          </Label>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          When enabled, inventory losses above the acceptable threshold are
          deducted from the relevant team's pot (food → kitchen, drinks → bar).
        </p>

        {config.inventoryLossEnabled && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="foodLossThreshold">Food Loss Threshold (%)</Label>
              <Input
                id="foodLossThreshold"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={config.foodLossThreshold ?? 2}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    foodLossThreshold: Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Acceptable food inventory loss. Losses above this are deducted
                from the Kitchen pot.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drinkLossThreshold">
                Drink Loss Threshold (%)
              </Label>
              <Input
                id="drinkLossThreshold"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={config.drinkLossThreshold ?? 3}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    drinkLossThreshold: Number(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Acceptable drink inventory loss. Losses above this are deducted
                from the Bar pot.
              </p>
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Configuration
      </Button>
    </div>
  );
}
