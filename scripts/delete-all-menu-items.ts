/**
 * Delete All Menu Items
 * 
 * Removes all menu items from the database
 * 
 * Usage: npx tsx scripts/delete-all-menu-items.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';

async function deleteAllMenuItems() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will delete ALL menu items from the database!');
    
    const count = await MenuItemModel.countDocuments();
    console.log(`📊 Current menu item count: ${count}\n`);

    console.log('🗑️  Deleting all menu items...');
    const result = await MenuItemModel.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} menu items\n`);
    console.log('💡 Next step: Run seed-drinks-menu.ts and seed-food-menu.ts to repopulate');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting menu items:', error);
    process.exit(1);
  }
}

deleteAllMenuItems();
