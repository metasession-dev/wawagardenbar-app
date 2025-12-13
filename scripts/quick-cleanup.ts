/**
 * Quick Database Cleanup (No Confirmation)
 * 
 * ⚠️  WARNING: This script will DELETE ALL data immediately without confirmation!
 * Only use this for automated testing or when you're absolutely sure.
 * 
 * Usage: npx tsx scripts/quick-cleanup.ts
 * 
 * For safer cleanup with confirmation, use: npx tsx scripts/cleanup-database.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';
import TabModel from '../models/tab-model';
import OrderModel from '../models/order-model';

async function quickCleanup() {
  try {
    console.log('\n⚡ Quick Database Cleanup (No Confirmation)\n');

    await connectDB();

    // Get counts before deletion
    const [menuItemsBefore, inventoryBefore, tabsBefore, ordersBefore] = await Promise.all([
      MenuItemModel.countDocuments(),
      InventoryModel.countDocuments(),
      TabModel.countDocuments(),
      OrderModel.countDocuments(),
    ]);

    console.log('📊 Before cleanup:');
    console.log(`   Menu Items: ${menuItemsBefore}`);
    console.log(`   Inventory: ${inventoryBefore}`);
    console.log(`   Tabs: ${tabsBefore}`);
    console.log(`   Orders: ${ordersBefore}\n`);

    // Delete all data
    console.log('🗑️  Deleting all data...\n');

    const [menuResult, inventoryResult, tabsResult, ordersResult] = await Promise.all([
      MenuItemModel.deleteMany({}),
      InventoryModel.deleteMany({}),
      TabModel.deleteMany({}),
      OrderModel.deleteMany({}),
    ]);

    console.log('✅ Deleted:');
    console.log(`   Menu Items: ${menuResult.deletedCount}`);
    console.log(`   Inventory: ${inventoryResult.deletedCount}`);
    console.log(`   Tabs: ${tabsResult.deletedCount}`);
    console.log(`   Orders: ${ordersResult.deletedCount}`);

    const totalDeleted = 
      menuResult.deletedCount + 
      inventoryResult.deletedCount + 
      tabsResult.deletedCount + 
      ordersResult.deletedCount;

    console.log(`\n✅ Total deleted: ${totalDeleted} documents\n`);

    // Verify cleanup
    const [menuItemsAfter, inventoryAfter, tabsAfter, ordersAfter] = await Promise.all([
      MenuItemModel.countDocuments(),
      InventoryModel.countDocuments(),
      TabModel.countDocuments(),
      OrderModel.countDocuments(),
    ]);

    const remaining = menuItemsAfter + inventoryAfter + tabsAfter + ordersAfter;

    if (remaining === 0) {
      console.log('✅ Database is now clean!\n');
    } else {
      console.log(`⚠️  Warning: ${remaining} documents still remain\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

quickCleanup();
