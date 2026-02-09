'use client';

import { useState, useMemo } from 'react';
import { CategoryFilter } from './category-filter';
import { MenuItemsTable } from './menu-items-table';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  mainCategory: string;
  category: string;
  price: number;
  preparationTime: number;
  isAvailable: boolean;
  tags: string[];
  images: string[];
}

interface MenuItemsClientProps {
  menuItems: MenuItem[];
}

export function MenuItemsClient({ menuItems }: MenuItemsClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = useMemo(() => {
    const uniqueCategories = new Set(menuItems.map((item) => item.category));
    return Array.from(uniqueCategories).sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  return (
    <div className="space-y-4">
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <MenuItemsTable menuItems={filteredItems} />
    </div>
  );
}
