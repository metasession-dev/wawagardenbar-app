/**
 * Delete All Inventory Records
 * 
 * Removes all inventory records from the database
 * 
 * Usage: npx tsx scripts/delete-all-inventory.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import InventoryModel from '../models/inventory-model';

async function deleteAllInventory() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will delete ALL inventory records from the database!');
    
    const count = await InventoryModel.countDocuments();
    console.log(`📊 Current inventory record count: ${count}\n`);

    console.log('🗑️  Deleting all inventory records...');
    const result = await InventoryModel.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} inventory records\n`);
    console.log('💡 Note: Inventory will be recreated when seeding menu items');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting inventory:', error);
    process.exit(1);
  }
}

deleteAllInventory();
