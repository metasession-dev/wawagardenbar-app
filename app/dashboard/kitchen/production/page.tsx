/**
 * REQ-034 — Kitchen production page.
 *
 * Shows the Make-a-batch picker (active recipes) and the recent
 * production history with super-admin-only Void buttons.
 */
import { RecipeService } from '@/services/recipe-service';
import { ProductionService } from '@/services/production-service';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { MakeBatchDialog } from '@/components/features/kitchen/make-batch-dialog';
import { ProductionHistory } from '@/components/features/kitchen/production-history';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Production | Kitchen',
};

async function getRole() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  return session.role;
}

export default async function KitchenProductionPage() {
  const [activeRecipes, productions, role] = await Promise.all([
    RecipeService.listActiveRecipes(),
    ProductionService.listRecentProductions(50),
    getRole(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground">
            Run a batch and review recent production history.
          </p>
        </div>
        <MakeBatchDialog recipes={JSON.parse(JSON.stringify(activeRecipes))} />
      </div>
      <ProductionHistory
        productions={JSON.parse(JSON.stringify(productions))}
        currentRole={role}
      />
    </div>
  );
}
