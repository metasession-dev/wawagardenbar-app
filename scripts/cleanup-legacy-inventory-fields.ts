/**
 * Cleanup Script: Remove legacy fields from MongoDB documents
 *
 * Removes:
 * - `inventoryId` from all MenuItem documents
 * - `stockHistory` from all Inventory documents
 *
 * These fields were removed from the Mongoose schemas but still exist
 * in the database. Removing them prevents raw ObjectIds from leaking
 * through `.lean()` queries into Client Components.
 *
 * Safe to run multiple times (idempotent — $unset is a no-op on missing fields).
 *
 * Usage:
 *   npx tsx scripts/cleanup-legacy-inventory-fields.ts
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
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  Legacy Field Cleanup');
  console.log('  Remove inventoryId from MenuItems');
  console.log('  Remove stockHistory from Inventories');
  console.log('='.repeat(60));

  console.log('\n🔄 Connecting to database...');
  await connectDB();

  // 1. Remove inventoryId from MenuItem documents
  console.log('\n📋 Removing inventoryId from MenuItem documents...');
  const menuResult = await MenuItemModel.updateMany(
    { inventoryId: { $exists: true } },
    { $unset: { inventoryId: '' } }
  );
  console.log(`   ✅ Modified ${menuResult.modifiedCount} MenuItem documents`);

  // 2. Remove stockHistory from Inventory documents
  console.log('\n📦 Removing stockHistory from Inventory documents...');
  const invResult = await InventoryModel.updateMany(
    { stockHistory: { $exists: true } },
    { $unset: { stockHistory: '' } }
  );
  console.log(`   ✅ Modified ${invResult.modifiedCount} Inventory documents`);

  console.log('\n' + '='.repeat(60));
  console.log('  Cleanup Complete');
  console.log('='.repeat(60));
  process.exit(0);
}

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
