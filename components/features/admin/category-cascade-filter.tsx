/**
 * @requirement REQ-081 - Shared main-category to sub-category cascade picker
 * @requirement REQ-082 - Progressive category display with grouped items
 */
'use client';

import { ArrowLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface CategoryCascadeMainCategory {
  slug: string;
  label: string;
  subCategories: string[];
}

interface CategoryCascadeFilterProps {
  mainCategories: CategoryCascadeMainCategory[];
  selectedMainCategory: string | null;
  selectedSubCategory: string | null;
  onMainCategoryChange: (mainCategory: string | null) => void;
  onSubCategoryChange: (subCategory: string | null) => void;
  searchQuery?: string;
  onSearchQueryChange?: (searchQuery: string) => void;
  selectedItemsSearchPlaceholder?: string;
  emptyMainCategoriesMessage?: string;
  emptySubCategoriesMessage?: string;
}

function formatCategoryLabel(category: string) {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function CategoryCascadeFilter({
  mainCategories,
  selectedMainCategory,
  selectedSubCategory,
  onMainCategoryChange,
  onSubCategoryChange,
  searchQuery,
  onSearchQueryChange,
  selectedItemsSearchPlaceholder = 'Search menu items...',
  emptyMainCategoriesMessage = 'No main categories available.',
  emptySubCategoriesMessage = 'No sub categories available for this main category.',
}: CategoryCascadeFilterProps) {
  const selectedMain =
    mainCategories.find((category) => category.slug === selectedMainCategory) ??
    null;
  const hasSearch =
    typeof searchQuery === 'string' &&
    typeof onSearchQueryChange === 'function';

  function renderSearchInput() {
    if (!hasSearch) return null;

    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="category-cascade-search"
          value={searchQuery ?? ''}
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
          placeholder={selectedItemsSearchPlaceholder}
          className="pl-10"
        />
      </div>
    );
  }

  function renderBreadcrumb() {
    return (
      <div
        data-testid="category-cascade-selection"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSubCategoryChange(null);
            onMainCategoryChange(null);
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Categories
        </Button>
        {selectedMain && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSubCategoryChange(null)}
            >
              {selectedMain.label}
            </Button>
          </>
        )}
        {selectedMain && selectedSubCategory && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {formatCategoryLabel(selectedSubCategory)}
            </span>
          </>
        )}
      </div>
    );
  }

  function renderMainCategoryButtons() {
    return (
      <div
        data-testid="category-cascade-main-options"
        className="flex flex-wrap gap-2"
      >
        {mainCategories.map((category) => (
          <Button
            key={category.slug}
            variant={
              selectedMainCategory === category.slug ? 'default' : 'outline'
            }
            size="sm"
            onClick={() => {
              if (selectedMainCategory === category.slug) {
                onMainCategoryChange(null);
              } else {
                onMainCategoryChange(category.slug);
                onSubCategoryChange(null);
              }
            }}
          >
            {category.label}
          </Button>
        ))}
      </div>
    );
  }

  function renderSubCategoryButtons() {
    if (!selectedMain) return null;
    if (selectedMain.subCategories.length === 0) {
      return (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {emptySubCategoriesMessage}
        </div>
      );
    }

    return (
      <div
        data-testid="category-cascade-sub-options"
        className="flex flex-wrap gap-2"
      >
        {selectedMain.subCategories.map((category) => (
          <Button
            key={category}
            variant={selectedSubCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (selectedSubCategory === category) {
                onSubCategoryChange(null);
              } else {
                onSubCategoryChange(category);
              }
            }}
          >
            {formatCategoryLabel(category)}
          </Button>
        ))}
      </div>
    );
  }

  if (mainCategories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {emptyMainCategoriesMessage}
      </div>
    );
  }

  return (
    <div
      data-testid="category-cascade"
      className="space-y-3 rounded-lg border bg-muted/20 p-4"
    >
      {renderSearchInput()}
      {renderBreadcrumb()}
      {renderMainCategoryButtons()}
      {selectedMain && renderSubCategoryButtons()}
    </div>
  );
}
