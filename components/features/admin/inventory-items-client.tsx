'use client';

import { useState, useMemo } from 'react';
import { CategoryFilter } from './category-filter';
import { InventoryTable } from './inventory-table';

interface InventoryItem {
  _id: string;
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
}

interface InventoryItemsClientProps {
  inventory: InventoryItem[];
}

export function InventoryItemsClient({ inventory }: InventoryItemsClientProps) {
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
