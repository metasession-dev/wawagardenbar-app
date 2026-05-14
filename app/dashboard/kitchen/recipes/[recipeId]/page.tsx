/**
 * REQ-034 — Recipe builder (create + edit).
 *
 * `/dashboard/kitchen/recipes/new` renders the builder with an empty
 * recipe; `/dashboard/kitchen/recipes/<id>` loads the existing recipe.
 */
import { notFound } from 'next/navigation';
import { RecipeService } from '@/services/recipe-service';
import { listRecipeFormOptionsAction } from '@/app/actions/kitchen/recipe-actions';
import { RecipeBuilder } from '@/components/features/kitchen/recipe-builder';

export const dynamic = 'force-dynamic';

export default async function RecipeBuilderPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  const isNew = recipeId === 'new';

  const optionsResult = await listRecipeFormOptionsAction();
  const targets = optionsResult.success ? optionsResult.targets : [];
  const ingredients = optionsResult.success ? optionsResult.ingredients : [];

  let initialRecipe = null;
  if (!isNew) {
    const recipe = await RecipeService.getRecipeById(recipeId);
    if (!recipe) notFound();
    initialRecipe = JSON.parse(JSON.stringify(recipe));
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isNew ? 'New Recipe' : 'Edit Recipe'}
        </h1>
        <p className="text-muted-foreground">
          Recipes bind a sellable menu item to the kitchen ingredients consumed
          per batch.
        </p>
      </div>
      <RecipeBuilder
        initialRecipe={initialRecipe}
        targets={targets}
        ingredients={ingredients}
      />
    </div>
  );
}
