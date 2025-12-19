/**
 * Delete Food Menu Items
 * 
 * Removes all food menu items and their inventory records
 * 
 * Usage: npx tsx scripts/delete-food-menu.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';

const foodItemNames = [
  'Efo',
  'Ogbono',
  'Egusi',
  'Obe Ata and Goat',
  'Obe Ata and Beef',
  'Semo',
  'Amala',
  'Eba',
  'Rice',
  'Indomie',
  'Peppered Beef',
  'Peppered Pomo',
  'Asun',
  'Cowtail Peppersoup',
  'Goat meat pepper soup',
  'Catfish Peppersoup',
];

async function deleteFoodMenu() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    console.log('\n🗑️  Deleting food menu items...');

    for (const name of foodItemNames) {
      const menuItem = await MenuItemModel.findOne({ name });
      
      if (menuItem) {
        // Delete associated inventory
        if (menuItem.inventoryId) {
          await InventoryModel.findByIdAndDelete(menuItem.inventoryId);
          console.log(`  📦 Deleted inventory for ${name}`);
        }
        
        // Delete menu item
        await MenuItemModel.findByIdAndDelete(menuItem._id);
        console.log(`✅ Deleted ${name}`);
      } else {
        console.log(`⏭️  ${name} not found`);
      }
    }

    console.log('\n✨ Food menu deletion completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting food menu:', error);
    process.exit(1);
  }
}

deleteFoodMenu();
