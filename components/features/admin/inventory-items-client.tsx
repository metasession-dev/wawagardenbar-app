'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryFilter } from './category-filter';
import { InventoryTable } from './inventory-table';
import {
  isInventoryTabVisibleForRole,
  type InventoryTab,
} from '@/lib/inventory-tabs';
import type { InventoryKind } from '@/interfaces/inventory.interface';
import type { UserRole } from '@/interfaces/user.interface';

interface InventoryLocation {
  location: string;
  locationName: string;
  currentStock: number;
}

interface InventoryItem {
  _id: string;
  kind: InventoryKind;
  menuItemId: {
    _id: string;
    name: string;
    mainCategory: string;
    category: string;
  } | null;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  lastRestocked?: string;
  trackByLocation: boolean;
  locations: InventoryLocation[];
}

interface InventoryItemsClientProps {
  sellableInventory: InventoryItem[];
  kitchenInventory: InventoryItem[];
  currentRole?: UserRole;
}

function InventoryTabContent({ inventory }: { inventory: InventoryItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      inventory
        .filter((item) => item.menuItemId?.category)
        .map((item) => item.menuItemId!.category)
    );
    return Array.from(uniqueCategories).sort();
  }, [inventory]);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return inventory;
    return inventory.filter(
      (item) => item.menuItemId?.category === selectedCategory
    );
  }, [inventory, selectedCategory]);

  return (
    <div className="space-y-4">
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <InventoryTable inventory={filteredItems} />
    </div>
  );
}

export function InventoryItemsClient({
  sellableInventory,
  kitchenInventory,
  currentRole,
}: InventoryItemsClientProps) {
  // REQ-034 AC3: hide the Kitchen tab from the kitchen role (defense-in-depth;
  // /dashboard/inventory is already super-admin-gated in lib/permissions.ts).
  const showKitchenTab = isInventoryTabVisibleForRole('kitchen', currentRole);
  const [activeTab, setActiveTab] = useState<InventoryTab>('sellable');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as InventoryTab)}
      className="space-y-4"
    >
      <TabsList>
        <TabsTrigger value="sellable">
          Sellable ({sellableInventory.length})
        </TabsTrigger>
        {showKitchenTab && (
          <TabsTrigger value="kitchen">
            Kitchen ({kitchenInventory.length})
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="sellable">
        <InventoryTabContent inventory={sellableInventory} />
      </TabsContent>
      {showKitchenTab && (
        <TabsContent value="kitchen">
          <InventoryTabContent inventory={kitchenInventory} />
        </TabsContent>
      )}
    </Tabs>
  );
}
