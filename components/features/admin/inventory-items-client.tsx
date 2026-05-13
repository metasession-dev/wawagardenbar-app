'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryFilter } from './category-filter';
import { InventoryTable } from './inventory-table';
import type { InventoryTab } from '@/lib/inventory-tabs';
import type { InventoryKind } from '@/interfaces/inventory.interface';

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
}: InventoryItemsClientProps) {
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
        <TabsTrigger value="kitchen">
          Kitchen ({kitchenInventory.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="sellable">
        <InventoryTabContent inventory={sellableInventory} />
      </TabsContent>
      <TabsContent value="kitchen">
        <InventoryTabContent inventory={kitchenInventory} />
      </TabsContent>
    </Tabs>
  );
}
