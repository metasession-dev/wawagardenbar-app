/**
 * @requirement REQ-081 - Sellable inventory category cascade
 * @requirement REQ-082 - Progressive category display with grouped items
 */
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import {
  CategoryCascadeFilter,
  type CategoryCascadeMainCategory,
} from './category-cascade-filter';
import {
  InventoryTable,
  type InventoryItem as TableInventoryItem,
} from './inventory-table';
import { AddKitchenIngredientDialog } from './add-kitchen-ingredient-dialog';
import { EditKitchenIngredientDialog } from './edit-kitchen-ingredient-dialog';
import { ArchiveKitchenIngredientDialog } from './archive-kitchen-ingredient-dialog';
import { restoreKitchenIngredientAction } from '@/app/actions/admin/kitchen-ingredient-actions';
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
  mainCategories: CategoryCascadeMainCategory[];
  archivedKitchenInventory?: InventoryItem[];
}

function InventoryTabContent({
  inventory,
  mainCategories,
  enableCategoryCascade = false,
  renderRowActions,
}: {
  inventory: InventoryItem[];
  mainCategories?: CategoryCascadeMainCategory[];
  enableCategoryCascade?: boolean;
  renderRowActions?: (item: TableInventoryItem) => React.ReactNode;
}) {
  const [selectedMainCategory, setSelectedMainCategory] = useState<
    string | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!enableCategoryCascade) return inventory;

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return inventory.filter((item) => {
      const itemName = item.menuItemId?.name ?? '';
      const itemCategory = item.menuItemId?.category ?? '';
      const itemMainCategory = item.menuItemId?.mainCategory ?? '';

      return (
        (!selectedMainCategory || itemMainCategory === selectedMainCategory) &&
        (!selectedCategory || itemCategory === selectedCategory) &&
        (!normalizedSearchQuery ||
          itemName.toLowerCase().includes(normalizedSearchQuery) ||
          itemCategory.toLowerCase().includes(normalizedSearchQuery) ||
          itemMainCategory.toLowerCase().includes(normalizedSearchQuery))
      );
    });
  }, [
    enableCategoryCascade,
    inventory,
    searchQuery,
    selectedCategory,
    selectedMainCategory,
  ]);

  const groupedItems = useMemo(() => {
    if (!enableCategoryCascade) return {};
    const groups: Record<string, Record<string, InventoryItem[]>> = {};
    for (const item of filteredItems) {
      const main = item.menuItemId?.mainCategory ?? 'uncategorized';
      const sub = item.menuItemId?.category ?? 'uncategorized';
      if (!groups[main]) groups[main] = {};
      if (!groups[main][sub]) groups[main][sub] = [];
      groups[main][sub].push(item);
    }
    return groups;
  }, [filteredItems, enableCategoryCascade]);

  const mainCategoryLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of mainCategories ?? []) {
      map[cat.slug] = cat.label;
    }
    return map;
  }, [mainCategories]);

  if (!enableCategoryCascade) {
    return (
      <InventoryTable
        inventory={filteredItems}
        renderRowActions={renderRowActions}
      />
    );
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  function formatLabel(slug: string) {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return (
    <div className="space-y-4">
      <CategoryCascadeFilter
        mainCategories={mainCategories ?? []}
        selectedMainCategory={selectedMainCategory}
        selectedSubCategory={selectedCategory}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedItemsSearchPlaceholder="Search inventory items..."
        onMainCategoryChange={(mainCategory) => {
          setSelectedMainCategory(mainCategory);
          setSelectedCategory(null);
        }}
        onSubCategoryChange={(subCategory) => {
          setSelectedCategory(subCategory);
        }}
      />
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {normalizedSearchQuery
            ? 'No inventory items match your search.'
            : 'No inventory items found.'}
        </div>
      ) : selectedCategory ? (
        <InventoryTable
          inventory={filteredItems}
          renderRowActions={renderRowActions}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([mainSlug, subGroups]) => (
            <div key={mainSlug} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {mainCategoryLabels[mainSlug] ?? formatLabel(mainSlug)}
              </h3>
              {Object.entries(subGroups).map(([subSlug, items]) => (
                <div key={subSlug} className="space-y-2">
                  {!selectedMainCategory && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatLabel(subSlug)}
                    </p>
                  )}
                  <InventoryTable
                    inventory={items}
                    renderRowActions={renderRowActions}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InventoryItemsClient({
  sellableInventory,
  kitchenInventory,
  archivedKitchenInventory = [],
  mainCategories,
}: InventoryItemsClientProps) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('sellable');
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<TableInventoryItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TableInventoryItem | null>(
    null
  );
  const [showArchived, setShowArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function onRestore(item: TableInventoryItem) {
    setRestoringId(item._id);
    const result = await restoreKitchenIngredientAction(item._id);
    setRestoringId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

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
          aria-label={`Archive ${ingredientName}`}
          onClick={() => setArchiveTarget(item)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Archive className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  function renderArchivedRowActions(item: TableInventoryItem) {
    const ingredientName = item.menuItemId?.name ?? 'ingredient';
    const busy = restoringId === item._id;
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
          aria-label={`Restore ${ingredientName}`}
          onClick={() => onRestore(item)}
          disabled={busy}
        >
          <ArchiveRestore className="h-4 w-4" />
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
          <InventoryTabContent
            inventory={sellableInventory}
            mainCategories={mainCategories}
            enableCategoryCascade
          />
        </TabsContent>
        <TabsContent value="kitchen" className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((s) => !s)}
              aria-pressed={showArchived}
            >
              {showArchived ? 'Hide archived' : 'Show archived'} (
              {archivedKitchenInventory.length})
            </Button>
            <AddKitchenIngredientDialog />
          </div>
          <InventoryTabContent
            inventory={kitchenInventory}
            renderRowActions={renderKitchenRowActions}
          />
          {showArchived && (
            <div
              className="space-y-2 border-t pt-4"
              data-testid="archived-kitchen-section"
            >
              <h3 className="text-sm font-medium text-muted-foreground">
                Archived ingredients ({archivedKitchenInventory.length})
              </h3>
              {archivedKitchenInventory.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  No archived ingredients.
                </p>
              ) : (
                <InventoryTabContent
                  inventory={archivedKitchenInventory}
                  renderRowActions={renderArchivedRowActions}
                />
              )}
            </div>
          )}
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
            currentStock: editTarget.currentStock,
            minimumStock: editTarget.minStock,
            maximumStock: editTarget.maxStock,
          }}
        />
      )}

      {archiveTarget && (
        <ArchiveKitchenIngredientDialog
          open={!!archiveTarget}
          onOpenChange={(o) => !o && setArchiveTarget(null)}
          inventory={{
            _id: archiveTarget._id,
            name: archiveTarget.menuItemId?.name ?? 'this ingredient',
          }}
        />
      )}
    </>
  );
}
