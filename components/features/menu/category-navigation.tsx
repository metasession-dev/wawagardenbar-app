'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * REQ-075 — `categories` now exposes the configurable main-category
 * registry envelope from `/api/public/menu/categories`. The hardcoded
 * Food / Drinks tabs are replaced by an iteration over every enabled
 * main category.
 */
export interface CategoryNavigationCategories {
  mainCategories: Array<{
    slug: string;
    label: string;
    order: number;
    subCategories: string[];
  }>;
}

interface CategoryNavigationProps {
  categories: CategoryNavigationCategories;
  selectedCategory?: string;
  categoryLabels?: Record<string, string>;
}

export function CategoryNavigation({
  categories,
  selectedCategory,
  categoryLabels = {},
}: CategoryNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const knownSlugs = new Set(categories.mainCategories.map((m) => m.slug));

  function handleCategoryChange(category: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');

    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }

    params.delete('search');
    router.push(`/menu?${params.toString()}`);
  }

  function handleMainCategoryChange(mainCategorySlug: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.delete('category');
    params.delete('search');

    if (mainCategorySlug !== 'all') {
      params.set('mainCategory', mainCategorySlug);
    } else {
      params.delete('mainCategory');
    }

    router.push(`/menu?${params.toString()}`);
  }

  const rawMain = searchParams?.get('mainCategory') ?? null;
  const mainCategory = rawMain && knownSlugs.has(rawMain) ? rawMain : null;

  const subcategoriesToShow = mainCategory
    ? (categories.mainCategories.find((m) => m.slug === mainCategory)
        ?.subCategories ?? [])
    : categories.mainCategories.flatMap((m) => m.subCategories);

  const formatLabel = (slug: string): string =>
    categoryLabels[slug] ||
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div className="space-y-4">
      <Tabs
        value={mainCategory || 'all'}
        onValueChange={handleMainCategoryChange}
      >
        <TabsList
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${categories.mainCategories.length + 1}, minmax(0, 1fr))`,
          }}
        >
          <TabsTrigger value="all">All Items</TabsTrigger>
          {categories.mainCategories.map((m) => (
            <TabsTrigger key={m.slug} value={m.slug}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleCategoryChange('all')}
        >
          All
        </Button>

        {subcategoriesToShow.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange(category)}
          >
            {formatLabel(category)}
          </Button>
        ))}
      </div>

      {selectedCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary">{formatLabel(selectedCategory)}</Badge>
        </div>
      )}
    </div>
  );
}
