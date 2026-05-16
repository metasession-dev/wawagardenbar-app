'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { CategoryFilter } from './category-filter';
import {
  InventoryTable,
  type InventoryItem as TableInventoryItem,
} from './inventory-table';
import { AddKitchenIngredientDialog } from './add-kitchen-ingredient-dialog';
import { EditKitchenIngredientDialog } from './edit-kitchen-ingredient-dialog';
import { DeleteKitchenIngredientDialog } from './delete-kitchen-ingredient-dialog';
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

function InventoryTabContent({
  inventory,
  renderRowActions,
}: {
  inventory: InventoryItem[];
  renderRowActions?: (item: TableInventoryItem) => React.ReactNode;
}) {
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
      <InventoryTable
        inventory={filteredItems}
        renderRowActions={renderRowActions}
      />
    </div>
  );
}

export function InventoryItemsClient({
  sellableInventory,
  kitchenInventory,
}: InventoryItemsClientProps) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('sellable');
  const router = useRouter();

  // REQ-037 — Edit + Delete dialog state for the Kitchen tab. Single
  // shared state at this level so the row buttons just set the target.
  const [editTarget, setEditTarget] = useState<TableInventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TableInventoryItem | null>(
    null
  );

  function renderKitchenRowActions(item: TableInventoryItem) {
    const ingredientName = item.menuItemId?.name ?? 'ingredient';
    return (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View details for ${ingredientName}`}
          onClick={() => router.push(`/dashboard/inventory/${item._id}`)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Edit ${ingredientName}`}
          onClick={() => setEditTarget(item)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete ${ingredientName}`}
          onClick={() => setDeleteTarget(item)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
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
        <TabsContent value="kitchen" className="space-y-3">
          <div className="flex justify-end">
            <AddKitchenIngredientDialog />
          </div>
          <InventoryTabContent
            inventory={kitchenInventory}
            renderRowActions={renderKitchenRowActions}
          />
        </TabsContent>
      </Tabs>

      {editTarget && (
        <EditKitchenIngredientDialog
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          inventory={{
            _id: editTarget._id,
            name: editTarget.menuItemId?.name ?? '',
            category: editTarget.menuItemId?.category ?? '',
            unit: editTarget.unit,
            minimumStock: editTarget.minStock,
            maximumStock: editTarget.maxStock,
          }}
        />
      )}

      {deleteTarget && (
        <DeleteKitchenIngredientDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          inventory={{
            _id: deleteTarget._id,
            name: deleteTarget.menuItemId?.name ?? 'this ingredient',
          }}
        />
      )}
    </>
  );
}
