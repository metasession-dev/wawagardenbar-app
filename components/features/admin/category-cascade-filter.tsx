/**
 * @requirement REQ-081 - Shared main-category to sub-category cascade picker
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

function matchesSearchTerm(value: string, searchQuery: string) {
  return value.toLowerCase().includes(searchQuery);
}

export function CategoryCascadeFilter({
  mainCategories,
  selectedMainCategory,
  selectedSubCategory,
  onMainCategoryChange,
  onSubCategoryChange,
  searchQuery,
  onSearchQueryChange,
  selectedItemsSearchPlaceholder = 'Search selected items...',
  emptyMainCategoriesMessage = 'No main categories available.',
  emptySubCategoriesMessage = 'No sub categories available for this main category.',
}: CategoryCascadeFilterProps) {
  const selectedMain =
    mainCategories.find((category) => category.slug === selectedMainCategory) ??
    null;
  const hasSearch =
    typeof searchQuery === 'string' &&
    typeof onSearchQueryChange === 'function';
  const normalizedSearchQuery = searchQuery?.trim().toLowerCase() ?? '';
  const filteredMainCategories = mainCategories.filter(
    (category) =>
      !normalizedSearchQuery ||
      matchesSearchTerm(category.label, normalizedSearchQuery) ||
      matchesSearchTerm(category.slug, normalizedSearchQuery)
  );
  const filteredSubCategories = (selectedMain?.subCategories ?? []).filter(
    (category) =>
      !normalizedSearchQuery ||
      matchesSearchTerm(formatCategoryLabel(category), normalizedSearchQuery) ||
      matchesSearchTerm(category, normalizedSearchQuery)
  );

  function renderSearchInput(placeholder: string) {
    if (!hasSearch) return null;

    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="category-cascade-search"
          value={searchQuery ?? ''}
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
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

  if (!selectedMain) {
    return (
      <div
        data-testid="category-cascade"
        className="space-y-3 rounded-lg border bg-muted/20 p-4"
      >
        {renderSearchInput(
          normalizedSearchQuery
            ? 'Search menu items...'
            : 'Search main categories...'
        )}
        {!normalizedSearchQuery && (
          <>
            <div>
              <p className="text-sm font-medium">Main Menu Categories</p>
              <p className="text-xs text-muted-foreground">
                Choose a main category to continue.
              </p>
            </div>
            <div
              data-testid="category-cascade-main-options"
              className="flex flex-wrap gap-2"
            >
              {filteredMainCategories.map((category) => (
                <Button
                  key={category.slug}
                  variant="outline"
                  size="sm"
                  onClick={() => onMainCategoryChange(category.slug)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!selectedSubCategory) {
    return (
      <div
        data-testid="category-cascade"
        className="space-y-3 rounded-lg border bg-muted/20 p-4"
      >
        {renderSearchInput('Search sub categories...')}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{selectedMain.label}</p>
            <p className="text-xs text-muted-foreground">
              Select a sub category.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMainCategoryChange(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Main Categories
          </Button>
        </div>
        {selectedMain.subCategories.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {emptySubCategoriesMessage}
          </div>
        ) : (
          <div
            data-testid="category-cascade-sub-options"
            className="flex flex-wrap gap-2"
          >
            {filteredSubCategories.map((category) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => onSubCategoryChange(category)}
              >
                {formatCategoryLabel(category)}
              </Button>
            ))}
          </div>
        )}
        {selectedMain.subCategories.length > 0 &&
          filteredSubCategories.length === 0 && (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No sub categories match your search.
            </div>
          )}
      </div>
    );
  }

  return (
    <div
      data-testid="category-cascade-selection"
      className="space-y-3 rounded-lg border bg-muted/20 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSubCategoryChange(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sub Categories
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSubCategoryChange(null);
              onMainCategoryChange(null);
            }}
          >
            Main Categories
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">
              {selectedMain.label}
            </span>
            <ChevronRight className="h-4 w-4" />
            <span>{formatCategoryLabel(selectedSubCategory)}</span>
          </div>
        </div>
      </div>
      {renderSearchInput(selectedItemsSearchPlaceholder)}
    </div>
  );
}
