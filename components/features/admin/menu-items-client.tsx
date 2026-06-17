/**
 * @requirement REQ-081 - Menu management category cascade
 */
'use client';

import { useMemo, useState } from 'react';
import {
  CategoryCascadeFilter,
  type CategoryCascadeMainCategory,
} from './category-cascade-filter';
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
  mainCategories: CategoryCascadeMainCategory[];
}

export function MenuItemsClient({
  menuItems,
  mainCategories,
}: MenuItemsClientProps) {
  const [selectedMainCategory, setSelectedMainCategory] = useState<
    string | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!selectedMainCategory || !selectedCategory) return [];

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return menuItems.filter(
      (item) =>
        item.mainCategory === selectedMainCategory &&
        item.category === selectedCategory &&
        (!normalizedSearchQuery ||
          item.name.toLowerCase().includes(normalizedSearchQuery) ||
          item.description.toLowerCase().includes(normalizedSearchQuery) ||
          item.tags.some((tag) =>
            tag.toLowerCase().includes(normalizedSearchQuery)
          ))
    );
  }, [menuItems, searchQuery, selectedMainCategory, selectedCategory]);

  const selectedMain =
    mainCategories.find((category) => category.slug === selectedMainCategory) ??
    null;

  return (
    <div className="space-y-4">
      <CategoryCascadeFilter
        mainCategories={mainCategories}
        selectedMainCategory={selectedMainCategory}
        selectedSubCategory={selectedCategory}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedItemsSearchPlaceholder="Search selected menu items..."
        onMainCategoryChange={(mainCategory) => {
          setSelectedMainCategory(mainCategory);
          setSelectedCategory(null);
          setSearchQuery('');
        }}
        onSubCategoryChange={(subCategory) => {
          setSelectedCategory(subCategory);
          setSearchQuery('');
        }}
        emptySubCategoriesMessage={
          selectedMain
            ? `No enabled sub categories are configured under ${selectedMain.label}.`
            : undefined
        }
      />
      {selectedMainCategory && selectedCategory ? (
        <MenuItemsTable menuItems={filteredItems} />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {selectedMainCategory
            ? 'Select a sub category to view menu items.'
            : 'Select a main category to start browsing menu items.'}
        </div>
      )}
    </div>
  );
}
