/**
 * @requirement REQ-018 - One-time backfill: add inventoryId to approved snapshot items
 *
 * Fixes existing approved snapshots where inventoryId was not persisted
 * because the snapshot submission form omitted it (fixed in 24936a3).
 *
 * Usage:
 *   npx tsx scripts/backfill-snapshot-inventory-ids.ts
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME in .env.local
 * or pass a connection string as the first argument:
 *   npx tsx scripts/backfill-snapshot-inventory-ids.ts "mongodb://..."
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const uri =
    process.argv[2] ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  console.log(`Connecting to: ${uri.replace(/\/\/[^@]+@/, '//***@')}...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  // Build menuItemId → inventoryId map from inventories collection
  const inventories = await db
    .collection('inventories')
    .find({}, { projection: { _id: 1, menuItemId: 1 } })
    .toArray();

  const inventoryByMenuItemId = new Map<string, mongoose.Types.ObjectId>();
  for (const inv of inventories) {
    if (inv.menuItemId) {
      inventoryByMenuItemId.set(inv.menuItemId.toString(), inv._id);
    }
  }
  console.log(`Loaded ${inventoryByMenuItemId.size} inventory records.`);

  // Find approved snapshots with items missing inventoryId
  const snapshots = await db
    .collection('inventorysnapshots')
    .find({ status: 'approved' })
    .toArray();

  let snapshotsUpdated = 0;
  let itemsFixed = 0;

  for (const snap of snapshots) {
    let changed = false;
    for (const item of snap.items || []) {
      if (!item.inventoryId && item.menuItemId) {
        const invId = inventoryByMenuItemId.get(item.menuItemId.toString());
        if (invId) {
          item.inventoryId = invId;
          changed = true;
          itemsFixed++;
        }
      }
    }
    if (changed) {
      await db
        .collection('inventorysnapshots')
        .updateOne({ _id: snap._id }, { $set: { items: snap.items } });
      snapshotsUpdated++;
      console.log(
        `  Updated snapshot ${snap._id} (${snap.mainCategory}, ${snap.snapshotDate}): ` +
          `${snap.items.filter((i: any) => !i.inventoryId).length} items still missing`
      );
    }
  }

  console.log(
    `\nDone. Updated ${snapshotsUpdated} snapshots, fixed ${itemsFixed} items.`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
