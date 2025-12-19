/**
 * Clean Orphaned Inventory Records
 * 
 * Removes inventory records that don't have a corresponding menu item
 * 
 * Usage: npx tsx scripts/clean-orphaned-inventory.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';

async function cleanOrphanedInventory() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    console.log('\n🔍 Finding orphaned inventory records...');

    const allInventory = await InventoryModel.find({});
    console.log(`📦 Total inventory records: ${allInventory.length}`);

    let deletedCount = 0;
    let validCount = 0;

    for (const inventory of allInventory) {
      // Check if the menu item exists
      const menuItem = await MenuItemModel.findById(inventory.menuItemId);

      if (!menuItem) {
        console.log(`🗑️  Deleting orphaned inventory (menuItemId: ${inventory.menuItemId}, inventoryId: ${inventory._id})`);
        await InventoryModel.findByIdAndDelete(inventory._id);
        deletedCount++;
      } else {
        console.log(`✅ Valid: ${menuItem.name}`);
        validCount++;
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Valid inventory records: ${validCount}`);
    console.log(`🗑️  Deleted orphaned records: ${deletedCount}`);
    console.log(`📦 Total processed: ${allInventory.length}`);

    console.log('\n✨ Cleanup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning orphaned inventory:', error);
    process.exit(1);
  }
}

cleanOrphanedInventory();
