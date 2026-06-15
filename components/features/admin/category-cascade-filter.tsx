/**
 * @requirement REQ-081 - Shared main-category to sub-category cascade picker
 */
'use client';

import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  emptyMainCategoriesMessage = 'No main categories available.',
  emptySubCategoriesMessage = 'No sub categories available for this main category.',
}: CategoryCascadeFilterProps) {
  const selectedMain =
    mainCategories.find((category) => category.slug === selectedMainCategory) ??
    null;

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
          {mainCategories.map((category) => (
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
      </div>
    );
  }

  if (!selectedSubCategory) {
    return (
      <div
        data-testid="category-cascade"
        className="space-y-3 rounded-lg border bg-muted/20 p-4"
      >
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
            {selectedMain.subCategories.map((category) => (
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
      </div>
    );
  }

  return (
    <div
      data-testid="category-cascade-selection"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4"
    >
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
  );
}
