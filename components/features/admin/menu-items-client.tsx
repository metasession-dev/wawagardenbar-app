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

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return menuItems.filter(
      (item) =>
        (!selectedMainCategory || item.mainCategory === selectedMainCategory) &&
        (!selectedCategory || item.category === selectedCategory) &&
        (!normalizedSearchQuery ||
          item.name.toLowerCase().includes(normalizedSearchQuery) ||
          item.description.toLowerCase().includes(normalizedSearchQuery) ||
          item.tags.some((tag) =>
            tag.toLowerCase().includes(normalizedSearchQuery)
          ))
    );
  }, [
    menuItems,
    normalizedSearchQuery,
    selectedMainCategory,
    selectedCategory,
  ]);

  const selectedMain =
    mainCategories.find((category) => category.slug === selectedMainCategory) ??
    null;

  const canBrowseItems = Boolean(
    (selectedMainCategory && selectedCategory) || normalizedSearchQuery
  );

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
      {canBrowseItems ? (
        <MenuItemsTable menuItems={filteredItems} />
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {selectedMain
            ? 'Select a sub category to view menu items.'
            : 'Select a main category to start browsing menu items.'}
        </div>
      )}
    </div>
  );
}
