'use client';

import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  allLabel?: string;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  allLabel = 'All',
}: CategoryFilterProps) {
  const formatCategoryLabel = (category: string) => {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === '' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onCategoryChange('')}
        className="rounded-full"
      >
        {allLabel}
      </Button>
      {categories.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(category)}
          className="rounded-full"
        >
          {formatCategoryLabel(category)}
        </Button>
      ))}
    </div>
  );
}
