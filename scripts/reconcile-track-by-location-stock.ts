/**
 * @requirement REQ-050 — Reconcile `trackByLocation` inventory rows
 *
 * One-shot operational tool. Finds rows whose top-level `currentStock`
 * disagrees with the replay of their `StockMovement` history and proposes
 * a per-location adjustment to make them consistent. The code fix in
 * REQ-050 prevents future drift; this script recovers from pre-existing
 * drift caused by the bug.
 *
 * Usage:
 *   npx tsx scripts/reconcile-track-by-location-stock.ts <MONGO_URI> [flags]
 *
 *   --inventory-id <id>   Limit to one row (default: all trackByLocation rows).
 *   --dry-run             Default. Prints the plan; writes nothing.
 *   --apply               Actually save the proposed adjustments.
 *   --db-name <name>      Override the dbName from the URI (defaults to URI's path).
 *
 * Honest limitation: the replay assumes the item's initial stock at creation
 * was 0. Items created with seeded initial stock (not via a StockMovement)
 * will replay to a negative expected value — those rows are flagged for
 * **manual review**, not auto-applied. See #175 for context.
 */
import mongoose from 'mongoose';

// ─── Pure helpers (exported for unit tests) ─────────────────────────────────

export interface MovementRow {
  quantity: number;
  type: 'addition' | 'deduction' | 'adjustment';
  timestamp?: Date;
}

/**
 * Sum signed deltas across StockMovement rows: additions count positive,
 * deductions count negative regardless of how `quantity` is signed in the
 * DB (some legacy rows store deductions as positive quantities), and
 * adjustments are taken at face value (the sign in the row IS the delta).
 */
export function replayMovements(movements: MovementRow[]): number {
  let running = 0;
  for (const m of movements) {
    const q = Number(m.quantity);
    if (m.type === 'deduction') {
      running -= Math.abs(q);
    } else if (m.type === 'addition') {
      running += Math.abs(q);
    } else {
      running += q; // adjustment — preserve sign
    }
  }
  return running;
}

export interface InventoryForReconcile {
  _id: { toString(): string };
  currentStock: number;
  trackByLocation: boolean;
  defaultReceivingLocation?: string;
  locations: Array<{ location: string; currentStock: number }>;
}

export type ReconcilePlan =
  | { action: 'skip-no-drift'; drift: 0 }
  | {
      action: 'manual-review-required';
      drift: number;
      expected: number;
      reason: 'unrecorded-initial-stock';
    }
  | {
      action: 'apply';
      drift: number;
      expected: number;
      target: 'top-level' | { location: string; before: number; after: number };
    };

export function computeDriftPlan(
  inv: InventoryForReconcile,
  expected: number
): ReconcilePlan {
  const drift = expected - inv.currentStock;
  if (drift === 0) {
    return { action: 'skip-no-drift', drift: 0 };
  }
  if (expected < 0) {
    return {
      action: 'manual-review-required',
      drift,
      expected,
      reason: 'unrecorded-initial-stock',
    };
  }
  if (inv.trackByLocation && inv.locations.length > 0) {
    const receivingId =
      inv.defaultReceivingLocation ?? inv.locations[0].location;
    const loc =
      inv.locations.find((l) => l.location === receivingId) ?? inv.locations[0];
    const before = loc.currentStock;
    const after = Math.max(0, before + drift);
    return {
      action: 'apply',
      drift,
      expected,
      target: { location: loc.location, before, after },
    };
  }
  return { action: 'apply', drift, expected, target: 'top-level' };
}

// ─── CLI bootstrap ──────────────────────────────────────────────────────────

interface CliFlags {
  uri: string;
  inventoryId?: string;
  apply: boolean;
  dbName?: string;
}

function parseFlags(argv: string[]): CliFlags {
  const [uri, ...rest] = argv.slice(2);
  if (!uri) {
    throw new Error(
      'Usage: npx tsx scripts/reconcile-track-by-location-stock.ts <MONGO_URI> [--inventory-id <id>] [--dry-run|--apply] [--db-name <n>]'
    );
  }
  const flags: CliFlags = { uri, apply: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--inventory-id') flags.inventoryId = rest[++i];
    else if (a === '--apply') flags.apply = true;
    else if (a === '--dry-run') flags.apply = false;
    else if (a === '--db-name') flags.dbName = rest[++i];
    else throw new Error(`Unknown flag: ${a}`);
  }
  return flags;
}

interface InventoryDoc extends InventoryForReconcile {
  _id: mongoose.Types.ObjectId;
  locations: Array<{
    location: string;
    locationName?: string;
    currentStock: number;
    lastUpdated?: Date;
    updatedBy?: mongoose.Types.ObjectId;
    updatedByName?: string;
  }>;
}

async function reconcileOne(
  inv: InventoryDoc,
  apply: boolean
): Promise<ReconcilePlan> {
  const movements = (await mongoose.connection
    .collection('stockmovements')
    .find({ inventoryId: inv._id })
    .sort({ timestamp: 1 })
    .toArray()) as unknown as MovementRow[];
  const expected = replayMovements(movements);
  const plan = computeDriftPlan(inv, expected);

  const id = inv._id.toString();
  switch (plan.action) {
    case 'skip-no-drift':
      console.log(
        `  ${id}  no drift (expected=${expected}, actual=${inv.currentStock})`
      );
      break;
    case 'manual-review-required':
      console.warn(
        `  ${id}  MANUAL REVIEW — replay yields ${expected} (negative; initial stock unrecorded). ` +
          `Drift would be ${plan.drift}; not auto-applied.`
      );
      break;
    case 'apply': {
      const targetDesc =
        plan.target === 'top-level'
          ? `top-level currentStock += ${plan.drift}`
          : `${plan.target.location}: ${plan.target.before} → ${plan.target.after}`;
      console.log(
        `  ${id}  ${apply ? 'APPLY ' : 'PROPOSE'}  expected=${expected} actual=${inv.currentStock} drift=${plan.drift}  ${targetDesc}`
      );
      if (apply) {
        const newLocations = inv.locations.map((l) => {
          if (plan.target === 'top-level') return l;
          if (l.location === plan.target.location) {
            return {
              ...l,
              currentStock: plan.target.after,
              lastUpdated: new Date(),
              updatedByName: 'System (REQ-050 reconcile)',
            };
          }
          return l;
        });
        const newCurrentStock =
          plan.target === 'top-level'
            ? Math.max(0, inv.currentStock + plan.drift)
            : newLocations.reduce((s, l) => s + (l.currentStock || 0), 0);
        await mongoose.connection.collection('inventories').updateOne(
          { _id: inv._id, currentStock: inv.currentStock },
          {
            $set: {
              locations: newLocations,
              currentStock: newCurrentStock,
            },
          }
        );
      }
      break;
    }
  }
  return plan;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv);
  console.log(
    `=== reconcile-track-by-location-stock (mode=${flags.apply ? 'APPLY' : 'DRY-RUN'}) ===`
  );
  await mongoose.connect(
    flags.uri,
    flags.dbName ? { dbName: flags.dbName } : {}
  );

  const filter: Record<string, unknown> = flags.inventoryId
    ? { _id: new mongoose.Types.ObjectId(flags.inventoryId) }
    : { trackByLocation: true };

  const docs = (await mongoose.connection
    .collection('inventories')
    .find(filter)
    .toArray()) as unknown as InventoryDoc[];

  console.log(`Scanning ${docs.length} inventory row(s)…`);

  const totals = {
    'skip-no-drift': 0,
    'manual-review-required': 0,
    apply: 0,
  };
  for (const d of docs) {
    const plan = await reconcileOne(d, flags.apply);
    totals[plan.action]++;
  }

  console.log('\n=== summary ===');
  console.log(`  in sync: ${totals['skip-no-drift']}`);
  console.log(`  manual review needed: ${totals['manual-review-required']}`);
  console.log(`  ${flags.apply ? 'applied' : 'would apply'}: ${totals.apply}`);

  await mongoose.disconnect();
}

// Only run if invoked directly, not when imported by tests.
if (require.main === module) {
  main().catch((err) => {
    console.error('failed:', err);
    process.exit(1);
  });
}
