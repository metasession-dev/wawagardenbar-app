/**
 * @requirement REQ-081 - Menu management category cascade
 * @requirement REQ-082 - Progressive category display with grouped items
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

  const groupedItems = useMemo(() => {
    const groups: Record<string, Record<string, MenuItem[]>> = {};
    for (const item of filteredItems) {
      const main = item.mainCategory;
      const sub = item.category;
      if (!groups[main]) groups[main] = {};
      if (!groups[main][sub]) groups[main][sub] = [];
      groups[main][sub].push(item);
    }
    return groups;
  }, [filteredItems]);

  const mainCategoryLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of mainCategories) {
      map[cat.slug] = cat.label;
    }
    return map;
  }, [mainCategories]);

  function formatLabel(slug: string) {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return (
    <div className="space-y-4">
      <CategoryCascadeFilter
        mainCategories={mainCategories}
        selectedMainCategory={selectedMainCategory}
        selectedSubCategory={selectedCategory}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedItemsSearchPlaceholder="Search menu items..."
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
            ? 'No menu items match your search.'
            : 'No menu items found.'}
        </div>
      ) : selectedCategory ? (
        <MenuItemsTable menuItems={filteredItems} />
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
                  <MenuItemsTable menuItems={items} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
