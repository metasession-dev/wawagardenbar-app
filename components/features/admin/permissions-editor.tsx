'use client';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { IAdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from '@/interfaces';
import {
  ShoppingCart,
  Menu,
  Package,
  Gift,
  FileText,
  DollarSign,
  Settings,
} from 'lucide-react';

interface PermissionsEditorProps {
  permissions: IAdminPermissions | null;
  onChange: (permissions: IAdminPermissions) => void;
  disabled?: boolean;
}

export function PermissionsEditor({ permissions, onChange, disabled }: PermissionsEditorProps) {
  const currentPermissions = permissions || DEFAULT_ADMIN_PERMISSIONS;

  function handleToggle(key: keyof IAdminPermissions) {
    const updated = {
      ...currentPermissions,
      [key]: !currentPermissions[key],
    };
    onChange(updated);
  }

  const permissionFeatures = [
    {
      key: 'orderManagement' as const,
      title: 'Order Management',
      icon: ShoppingCart,
      description: 'Access to orders, kitchen display, and order processing',
    },
    {
      key: 'menuManagement' as const,
      title: 'Menu Management',
      icon: Menu,
      description: 'Manage menu items, categories, and pricing',
    },
    {
      key: 'inventoryManagement' as const,
      title: 'Inventory Management',
      icon: Package,
      description: 'Track and manage inventory levels',
    },
    {
      key: 'rewardsAndLoyalty' as const,
      title: 'Rewards & Loyalty',
      icon: Gift,
      description: 'Manage rewards programs and loyalty points',
    },
    {
      key: 'reportsAndAnalytics' as const,
      title: 'Reports & Analytics',
      icon: FileText,
      description: 'Access to reports and analytics dashboards',
    },
    {
      key: 'expensesManagement' as const,
      title: 'Expenses Management',
      icon: DollarSign,
      description: 'Track and manage business expenses',
    },
    {
      key: 'settingsAndConfiguration' as const,
      title: 'Settings & Configuration',
      icon: Settings,
      description: 'Access to system settings and configuration',
    },
  ];

  return (
    <div className="space-y-3">
      {permissionFeatures.map((feature) => {
        const isEnabled = currentPermissions[feature.key];
        const Icon = feature.icon;

        return (
          <Card key={feature.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {feature.description}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  id={feature.key}
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(feature.key)}
                  disabled={disabled}
                />
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
