'use server';

/**
 * @requirement REQ-034 AC10/AC11/AC13 — Production server actions.
 *
 * Kitchen / admin / super-admin may run batches (makeBatch);
 * super-admin alone may void (the service also enforces this, but
 * the action surfaces the failure earlier with a 403-like reply).
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { ProductionService } from '@/services/production-service';

async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

function requireKitchenOrAbove(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (
    session.role !== 'kitchen' &&
    session.role !== 'admin' &&
    session.role !== 'super-admin'
  ) {
    throw new Error('Insufficient permissions');
  }
}

export async function makeBatchAction(input: {
  recipeId: string;
  batchCount: number;
  actualYield?: number;
  notes?: string;
}) {
  try {
    const session = await getSession();
    requireKitchenOrAbove(session);
    const production = await ProductionService.makeBatch({
      recipeId: input.recipeId,
      batchCount: input.batchCount,
      actualYield: input.actualYield,
      notes: input.notes,
      performedBy: session.userId!,
      performedByName: session.name ?? session.email,
    });
    revalidatePath('/dashboard/kitchen/production');
    revalidatePath('/dashboard/kitchen/recipes');
    return {
      success: true as const,
      production: JSON.parse(JSON.stringify(production)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to run batch',
    };
  }
}

export async function voidProductionAction(input: {
  productionId: string;
  reasonNote?: string;
}) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return { success: false as const, error: 'Unauthorized' };
    }
    if (session.role !== 'super-admin') {
      return {
        success: false as const,
        error: 'Only super-admin can void a production batch',
      };
    }
    const production = await ProductionService.voidBatch({
      productionId: input.productionId,
      voidedBy: session.userId,
      voidedByRole: session.role,
      voidedByName: session.name ?? session.email,
      reasonNote: input.reasonNote,
    });
    revalidatePath('/dashboard/kitchen/production');
    return {
      success: true as const,
      production: JSON.parse(JSON.stringify(production)),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : 'Failed to void production',
    };
  }
}

export async function listRecentProductionsAction(limit = 50) {
  try {
    const session = await getSession();
    requireKitchenOrAbove(session);
    const productions = await ProductionService.listRecentProductions(limit);
    return {
      success: true as const,
      productions: JSON.parse(JSON.stringify(productions)),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : 'Failed to list productions',
      productions: [],
    };
  }
}
