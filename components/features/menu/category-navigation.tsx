'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryNavigationProps {
  categories: {
    drinks: string[];
    food: string[];
  };
  selectedCategory?: string;
  categoryLabels?: Record<string, string>;
}

export function CategoryNavigation({ categories, selectedCategory, categoryLabels = {} }: CategoryNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleCategoryChange(category: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    
    // Clear search when changing category
    params.delete('search');
    
    router.push(`/menu?${params.toString()}`);
  }

  function handleMainCategoryChange(mainCategory: 'all' | 'drinks' | 'food') {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('category');
    params.delete('search');
    
    if (mainCategory !== 'all') {
      params.set('mainCategory', mainCategory);
    } else {
      params.delete('mainCategory');
    }
    
    router.push(`/menu?${params.toString()}`);
  }

  const mainCategory = (searchParams?.get('mainCategory') ?? null) as 'drinks' | 'food' | null;

  return (
    <div className="space-y-4">
      {/* Main Category Tabs */}
      <Tabs
        value={mainCategory || 'all'}
        onValueChange={(value) => handleMainCategoryChange(value as 'all' | 'drinks' | 'food')}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="drinks">Drinks</TabsTrigger>
          <TabsTrigger value="food">Food</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Subcategory Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleCategoryChange('all')}
        >
          All
        </Button>

        {(mainCategory === 'drinks' || !mainCategory) &&
          categories.drinks.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(category)}
            >
              {categoryLabels[category] || category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Button>
          ))}

        {(mainCategory === 'food' || !mainCategory) &&
          categories.food.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(category)}
            >
              {categoryLabels[category] || category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Button>
          ))}
      </div>

      {selectedCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary">
            {categoryLabels[selectedCategory] || selectedCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </Badge>
        </div>
      )}
    </div>
  );
}
