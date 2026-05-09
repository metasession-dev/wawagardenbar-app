/**
 * @requirement REQ-034 — One-time idempotent backfill: every existing
 * Inventory + MenuItem row gets `kind: 'menu-item'`.
 *
 * Why: REQ-034 splits both Inventory AND MenuItem rows into 'menu-item'
 * (sellable) vs 'kitchen-ingredient' (raw recipe input). Pre-existing
 * rows are all sellable items by definition, so they default to
 * 'menu-item'. Kitchen-ingredient rows are created fresh after the
 * migration via the Expense → Inventory link or by admin entry. The
 * MenuItem kind is mirrored so customer-menu queries can filter via a
 * single condition without joining to Inventory.
 *
 * Behaviour:
 *   - Skips rows where `kind` is already set (idempotent on both
 *     collections).
 *   - --dry-run prints the candidate counts without writing.
 *
 * Usage:
 *   npx tsx scripts/backfill-inventory-kind.ts
 *   npx tsx scripts/backfill-inventory-kind.ts --dry-run
 *   npx tsx scripts/backfill-inventory-kind.ts "mongodb://..."
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME in .env.local
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import InventoryModel from '../models/inventory-model';
import MenuItemModel from '../models/menu-item-model';
import { INVENTORY_KIND_BACKFILL_FILTER } from '../lib/inventory-kind-backfill';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri =
    process.argv.find((a) => a.startsWith('mongodb')) ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  if (!uri || uri.startsWith('undefined')) {
    console.error(
      'No MongoDB URI provided. Set MONGODB_WAWAGARDENBAR_APP_URI + MONGODB_DB_NAME, or pass a URI as an argument.'
    );
    process.exit(2);
  }

  console.log(
    `[REQ-034] kind backfill starting (dry-run=${DRY_RUN}); connecting…`
  );
  await mongoose.connect(uri);

  const inventoryCandidates = await InventoryModel.countDocuments(
    INVENTORY_KIND_BACKFILL_FILTER
  );
  const menuItemCandidates = await MenuItemModel.countDocuments(
    INVENTORY_KIND_BACKFILL_FILTER
  );
  console.log(
    `[REQ-034] candidates without kind — inventory: ${inventoryCandidates}, menu-items: ${menuItemCandidates}`
  );

  if (DRY_RUN) {
    console.log('[REQ-034] dry-run: no writes performed.');
    await mongoose.disconnect();
    return;
  }

  const invRes = await InventoryModel.updateMany(
    INVENTORY_KIND_BACKFILL_FILTER,
    { $set: { kind: 'menu-item' } }
  );
  console.log(
    `[REQ-034] updated ${invRes.modifiedCount} inventory rows (matched ${invRes.matchedCount}).`
  );

  const miRes = await MenuItemModel.updateMany(INVENTORY_KIND_BACKFILL_FILTER, {
    $set: { kind: 'menu-item' },
  });
  console.log(
    `[REQ-034] updated ${miRes.modifiedCount} menu-item rows (matched ${miRes.matchedCount}).`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
