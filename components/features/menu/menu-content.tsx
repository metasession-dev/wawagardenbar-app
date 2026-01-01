import { CategoryService } from '@/services/category-service';
import { CategoryNavigation } from './category-navigation';
import { MenuGrid } from './menu-grid';
import { PageHeader } from '@/components/shared/ui';

interface MenuContentProps {
  initialCategories: {
    drinks: string[];
    food: string[];
  };
  selectedCategory?: string;
  searchQuery?: string;
  categoryLabels?: Record<string, string>;
}

export async function MenuContent({
  initialCategories,
  selectedCategory,
  searchQuery,
  categoryLabels,
}: MenuContentProps) {
  // Fetch menu items based on filters
  let items;

  if (searchQuery) {
    items = await CategoryService.searchItems(searchQuery);
  } else if (selectedCategory) {
    items = await CategoryService.getItemsByCategory(selectedCategory);
  } else {
    items = await CategoryService.getAllMenuItems();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Menu"
        description="Browse our delicious food and drinks"
      />

      <CategoryNavigation
        categories={initialCategories}
        selectedCategory={selectedCategory}
        categoryLabels={categoryLabels}
      />

      <MenuGrid items={items} searchQuery={searchQuery} />
    </div>
  );
}
