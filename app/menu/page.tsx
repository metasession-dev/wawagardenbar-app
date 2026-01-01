import { Suspense } from 'react';
import { Metadata } from 'next';
import { MainLayout } from '@/components/shared/layout';
import { Container } from '@/components/shared/layout';
import { MenuContent } from '@/components/features/menu/menu-content';
import { MenuSkeleton } from '@/components/features/menu/menu-skeleton';
import { TableNumberSetter } from '@/components/features/menu/table-number-setter';
import { CategoryService } from '@/services/category-service';
import { SystemSettingsService } from '@/services/system-settings-service';

export const metadata: Metadata = {
  title: 'Menu - Wawa Garden Bar',
  description: 'Browse our delicious food and drinks',
};

// Revalidate every 5 minutes
export const revalidate = 300;

interface MenuPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    tableNumber?: string;
  }>;
}

export default async function MenuPage({ searchParams }: MenuPageProps) {
  // Await searchParams (Next.js 15+ requirement)
  const params = await searchParams;

  // Parallel data fetching
  const [categoriesPromise, menuSettings] = await Promise.all([
    CategoryService.getCategories(),
    SystemSettingsService.getMenuCategories(),
  ]);

  // Generate label map from settings
  const categoryLabels: Record<string, string> = {};
  
  menuSettings.food.forEach(cat => {
    categoryLabels[cat.value] = cat.label;
  });
  
  menuSettings.drinks.forEach(cat => {
    categoryLabels[cat.value] = cat.label;
  });

  return (
    <MainLayout>
      <TableNumberSetter tableNumber={params.tableNumber} />
      <Container size="xl" className="py-8">
        <Suspense fallback={<MenuSkeleton />}>
          <MenuContent
            initialCategories={categoriesPromise}
            selectedCategory={params.category}
            searchQuery={params.search}
            categoryLabels={categoryLabels}
          />
        </Suspense>
      </Container>
    </MainLayout>
  );
}
