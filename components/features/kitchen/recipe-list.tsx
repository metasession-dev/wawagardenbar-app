'use client';

/**
 * REQ-034 — Recipe list (kitchen surface).
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  deactivateRecipeAction,
  reactivateRecipeAction,
} from '@/app/actions/kitchen/recipe-actions';

interface RecipeRow {
  _id: string;
  name: string;
  yieldPortions: number;
  ingredients: Array<{ inventoryId: string; quantity: number; unitId: string }>;
  isActive: boolean;
}

export function RecipeList({ recipes }: { recipes: RecipeRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(recipe: RecipeRow) {
    setBusyId(recipe._id);
    const result = recipe.isActive
      ? await deactivateRecipeAction(recipe._id)
      : await reactivateRecipeAction(recipe._id);
    setBusyId(null);
    if (!result.success) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Recipes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Yield (portions / batch)</TableHead>
              <TableHead>Ingredients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No recipes yet — create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              recipes.map((r) => (
                <TableRow key={r._id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.yieldPortions}</TableCell>
                  <TableCell>{r.ingredients.length}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? 'default' : 'secondary'}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Link href={`/dashboard/kitchen/recipes/${r._id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === r._id}
                      onClick={() => toggleActive(r)}
                    >
                      {r.isActive ? (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-1" /> Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4 mr-1" /> Reactivate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
