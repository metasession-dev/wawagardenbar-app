/**
 * @requirement REQ-066 AC8 — One-time idempotent backfill: every
 * trackByLocation Inventory row without a `defaultSalesLocation` gets one
 * derived from its locations array per
 * `lib/sale-point-location-backfill.ts`.
 *
 * Why: pre-REQ-066, deductions silently absorbed when `locations[0]` was
 * empty. The new `applyOrderStockDelta` routes deductions to
 * `defaultSalesLocation` when set, with a "first non-empty" fallback for
 * legacy rows. This script populates `defaultSalesLocation` for existing
 * rows so the routing matches the operator's real-world workflow (sales
 * come from the bar chiller, restocks from the back).
 *
 * Behaviour:
 *   - Only touches rows where `trackByLocation === true` AND
 *     `defaultSalesLocation` is missing/null.
 *   - For each candidate, derives the sale-point via
 *     `deriveSalePointLocation` (chiller* > freezer* > unset).
 *   - --dry-run prints the per-row mapping decision without writing.
 *   - Idempotent: a second run skips rows already populated.
 *
 * Usage:
 *   npx tsx scripts/backfill-sale-point-location.ts            # writes
 *   npx tsx scripts/backfill-sale-point-location.ts --dry-run  # preview
 *   npx tsx scripts/backfill-sale-point-location.ts "mongodb://..." # override URI
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI + MONGODB_DB_NAME in .env.local,
 * unless a URI is passed as an argument.
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import InventoryModel from '../models/inventory-model';
import {
  SALE_POINT_LOCATION_BACKFILL_FILTER,
  deriveSalePointLocation,
  isSalePointBackfillCandidate,
} from '../lib/sale-point-location-backfill';
import { assertMongoUriHasDatabase } from '../lib/mongo-uri';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

interface BackfillSummary {
  scanned: number;
  setChillerFresh: number;
  setFreezerFresh: number;
  rewriteFromStore: number;
  rewriteOther: number;
  leftUnsetNoSalePoint: number;
  skippedAlreadyCorrect: number;
}

async function main(): Promise<void> {
  const uri =
    process.argv.find((a) => a.startsWith('mongodb')) ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  if (!uri || uri.startsWith('undefined')) {
    console.error(
      'No MongoDB URI provided. Set MONGODB_WAWAGARDENBAR_APP_URI + MONGODB_DB_NAME, or pass a URI as an argument.'
    );
    process.exit(2);
  }

  let resolved: { uri: string; database: string };
  try {
    resolved = assertMongoUriHasDatabase(uri);
  } catch (err) {
    console.error(`[REQ-040] ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(
    `[REQ-066] defaultSalesLocation backfill starting (dry-run=${DRY_RUN}); connecting…`
  );
  console.log(`Connecting to database: ${resolved.database}`);
  await mongoose.connect(uri);

  // Load all trackByLocation rows — the predicate decides per-row whether
  // to act. Includes rows that already have `defaultSalesLocation` set to
  // an incorrect value (legacy migration bulk-set everything to 'store').
  const rows = await InventoryModel.find(SALE_POINT_LOCATION_BACKFILL_FILTER)
    .select({ _id: 1, menuItemId: 1, locations: 1, defaultSalesLocation: 1 })
    .lean();

  console.log(`[REQ-066] scanning ${rows.length} trackByLocation rows…`);

  const summary: BackfillSummary = {
    scanned: rows.length,
    setChillerFresh: 0,
    setFreezerFresh: 0,
    rewriteFromStore: 0,
    rewriteOther: 0,
    leftUnsetNoSalePoint: 0,
    skippedAlreadyCorrect: 0,
  };

  for (const row of rows) {
    const inv = {
      trackByLocation: true,
      locations: row.locations as Array<{
        location: string;
        currentStock?: number;
      }>,
      defaultSalesLocation: row.defaultSalesLocation as
        | string
        | null
        | undefined,
    };
    const derived = deriveSalePointLocation(inv);
    const codes = (row.locations || []).map((l) => l.location).join(',');
    const current = row.defaultSalesLocation ?? 'unset';

    if (!isSalePointBackfillCandidate(inv)) {
      if (derived === null) {
        summary.leftUnsetNoSalePoint++;
        console.log(
          `  - ${row._id} locations=[${codes}] current='${current}' → LEFT (no chiller/freezer present)`
        );
      } else {
        summary.skippedAlreadyCorrect++;
        console.log(
          `  - ${row._id} locations=[${codes}] current='${current}' → SKIP (already correct)`
        );
      }
      continue;
    }

    // Candidate — derived is non-null and differs from current.
    const action = current === 'unset' ? 'SET' : 'REWRITE';
    const verb = DRY_RUN ? 'would' : '';
    if (DRY_RUN) {
      console.log(
        `  - ${row._id} locations=[${codes}] current='${current}' → ${action} → '${derived}' (dry)`
      );
    } else {
      await InventoryModel.updateOne(
        { _id: row._id },
        { $set: { defaultSalesLocation: derived } }
      );
      console.log(
        `  - ${row._id} locations=[${codes}] current='${current}' → ${action} → '${derived}'`
      );
    }
    if (current === 'unset') {
      if (/chiller/i.test(derived!)) summary.setChillerFresh++;
      else if (/freezer/i.test(derived!)) summary.setFreezerFresh++;
    } else if (current === 'store') {
      summary.rewriteFromStore++;
    } else {
      summary.rewriteOther++;
    }
    void verb;
  }

  console.log('');
  console.log('[REQ-066] backfill summary:');
  console.log(`  scanned trackByLocation rows:   ${summary.scanned}`);
  console.log(`  set fresh (chiller*):           ${summary.setChillerFresh}`);
  console.log(`  set fresh (freezer*):           ${summary.setFreezerFresh}`);
  console.log(`  rewrite from 'store':           ${summary.rewriteFromStore}`);
  console.log(`  rewrite from other value:       ${summary.rewriteOther}`);
  console.log(
    `  skipped (already correct):      ${summary.skippedAlreadyCorrect}`
  );
  console.log(
    `  left (no clear sale point):     ${summary.leftUnsetNoSalePoint}`
  );
  if (DRY_RUN) console.log('  (dry-run: no writes performed)');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[REQ-066] backfill failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
