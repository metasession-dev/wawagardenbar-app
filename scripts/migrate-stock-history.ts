/**
 * Migration Script: Extract embedded stockHistory → StockMovement collection
 *
 * This script reads all Inventory documents, extracts their embedded
 * stockHistory arrays, and writes each entry as a separate StockMovement
 * document. It also backfills inventoryId on InventorySnapshot items.
 *
 * Safe to run multiple times — it skips inventories that already have
 * StockMovement records (idempotent).
 *
 * Usage:
 *   npx tsx scripts/migrate-stock-history.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local (or .env as fallback)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('No .env or .env.local file found!');
  process.exit(1);
}

import { connectDB } from '../lib/mongodb';
import InventoryModel from '../models/inventory-model';
import StockMovementModel from '../models/stock-movement-model';
import { InventorySnapshotModel } from '../models/inventory-snapshot-model';

interface MigrationStats {
  inventoriesProcessed: number;
  inventoriesSkipped: number;
  movementsCreated: number;
  snapshotsUpdated: number;
  errors: string[];
}

async function migrateStockHistory(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    inventoriesProcessed: 0,
    inventoriesSkipped: 0,
    movementsCreated: 0,
    snapshotsUpdated: 0,
    errors: [],
  };

  console.log('🔄 Connecting to database...');
  await connectDB();

  // --- Part 1: Extract stockHistory → StockMovement ---
  console.log('\n📦 Part 1: Extracting stockHistory → StockMovement collection');

  const inventories = await InventoryModel.find({}).lean();
  console.log(`   Found ${inventories.length} inventory records`);

  for (const inventory of inventories) {
    try {
      // Check if already migrated (idempotent)
      const existingCount = await StockMovementModel.countDocuments({
        inventoryId: inventory._id,
      });

      if (existingCount > 0) {
        console.log(`   ⏭️  Inventory ${inventory._id} already has ${existingCount} movements — skipping`);
        stats.inventoriesSkipped++;
        continue;
      }

      const historyEntries = (inventory as any).stockHistory || [];
      if (historyEntries.length === 0) {
        console.log(`   ⏭️  Inventory ${inventory._id} has no stockHistory — skipping`);
        stats.inventoriesSkipped++;
        continue;
      }

      // Build bulk insert operations
      const movements = historyEntries.map((entry: any) => ({
        inventoryId: inventory._id,
        quantity: entry.quantity,
        type: entry.type || 'adjustment',
        reason: entry.reason || 'Legacy migration',
        category: entry.category || 'other',
        performedBy: entry.performedBy,
        performedByName: entry.performedByName || 'Unknown',
        timestamp: entry.timestamp || new Date(),
        orderId: entry.orderId,
        location: entry.location,
        fromLocation: entry.fromLocation,
        toLocation: entry.toLocation,
        transferReference: entry.transferReference,
        costPerUnit: entry.costPerUnit,
        totalCost: entry.totalCost,
        invoiceNumber: entry.invoiceNumber,
        supplier: entry.supplier,
        notes: entry.notes,
      }));

      await StockMovementModel.insertMany(movements, { ordered: false });
      stats.movementsCreated += movements.length;
      stats.inventoriesProcessed++;

      console.log(`   ✅ Inventory ${inventory._id}: migrated ${movements.length} history entries`);
    } catch (error: any) {
      const msg = `Inventory ${inventory._id}: ${error.message}`;
      stats.errors.push(msg);
      console.error(`   ❌ ${msg}`);
    }
  }

  // --- Part 2: Backfill inventoryId on InventorySnapshot items ---
  console.log('\n📋 Part 2: Backfilling inventoryId on InventorySnapshot items');

  const snapshots = await InventorySnapshotModel.find({}).lean();
  console.log(`   Found ${snapshots.length} snapshots`);

  for (const snapshot of snapshots) {
    try {
      const updateOps: any[] = [];

      for (let i = 0; i < snapshot.items.length; i++) {
        const item = snapshot.items[i];
        if (item.inventoryId) continue; // already backfilled

        const inventory = await InventoryModel.findOne({
          menuItemId: item.menuItemId,
        }).lean();

        if (inventory) {
          updateOps.push({
            updateOne: {
              filter: { _id: snapshot._id },
              update: {
                $set: { [`items.${i}.inventoryId`]: inventory._id },
              },
            },
          });
        }
      }

      if (updateOps.length > 0) {
        await InventorySnapshotModel.bulkWrite(updateOps);
        stats.snapshotsUpdated++;
        console.log(`   ✅ Snapshot ${snapshot._id}: backfilled ${updateOps.length} inventoryId fields`);
      }
    } catch (error: any) {
      const msg = `Snapshot ${snapshot._id}: ${error.message}`;
      stats.errors.push(msg);
      console.error(`   ❌ ${msg}`);
    }
  }

  return stats;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  Inventory Normalization Migration');
  console.log('  stockHistory → StockMovement + Snapshot backfill');
  console.log('='.repeat(60));

  const startTime = Date.now();
  const stats = await migrateStockHistory();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('  Migration Summary');
  console.log('='.repeat(60));
  console.log(`  Inventories processed:  ${stats.inventoriesProcessed}`);
  console.log(`  Inventories skipped:    ${stats.inventoriesSkipped}`);
  console.log(`  StockMovements created: ${stats.movementsCreated}`);
  console.log(`  Snapshots updated:      ${stats.snapshotsUpdated}`);
  console.log(`  Errors:                 ${stats.errors.length}`);
  console.log(`  Duration:               ${duration}s`);

  if (stats.errors.length > 0) {
    console.log('\n  Errors:');
    stats.errors.forEach((e) => console.log(`    - ${e}`));
  }

  console.log('='.repeat(60));
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
