import Link from 'next/link';
import { ChefHat, Boxes } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * REQ-034 D9 — Kitchen management hub.
 *
 * Lightweight landing page that links to the two kitchen surfaces.
 * Gated by the parent layout's `requirePermission('kitchenManagement')`.
 * The legacy full-screen order-grid kitchen display moved to
 * `/dashboard/kitchen-display`.
 */
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kitchen' };

export default function KitchenLandingPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kitchen</h1>
        <p className="text-muted-foreground">
          Author recipes and record production batches.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/kitchen/recipes" className="group">
          <Card className="h-full transition-colors group-hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ChefHat className="h-6 w-6 text-primary" />
                <CardTitle>Recipes</CardTitle>
              </div>
              <CardDescription>
                Define what kitchen ingredients each menu item consumes.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Create, edit, activate, or deactivate recipes.
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/kitchen/production" className="group">
          <Card className="h-full transition-colors group-hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Boxes className="h-6 w-6 text-primary" />
                <CardTitle>Production</CardTitle>
              </div>
              <CardDescription>
                Run a batch and review recent production history.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Each batch deducts ingredients and adds the yield to the target
              menu item.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
