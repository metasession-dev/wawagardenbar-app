/**
 * REQ-034 — Kitchen recipe list page.
 */
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { RecipeService } from '@/services/recipe-service';
import { RecipeList } from '@/components/features/kitchen/recipe-list';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Recipes | Kitchen',
};

export default async function KitchenRecipesPage() {
  const recipes = await RecipeService.listAllRecipes();
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-muted-foreground">
            Define what kitchen ingredients each menu item consumes.
          </p>
        </div>
        <Link
          href="/dashboard/kitchen/recipes/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Recipe
        </Link>
      </div>
      <RecipeList recipes={JSON.parse(JSON.stringify(recipes))} />
    </div>
  );
}
