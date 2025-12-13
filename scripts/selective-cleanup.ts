/**
 * Selective Database Cleanup Script
 * 
 * Allows you to choose which collections to clean up
 * 
 * Usage: npx tsx scripts/selective-cleanup.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import * as readline from 'readline';
import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';
import TabModel from '../models/tab-model';
import OrderModel from '../models/order-model';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function selectiveCleanup() {
  try {
    console.log('\n🗑️  Selective Database Cleanup\n');

    await connectDB();
    console.log('✅ Connected to database\n');

    // Get current counts
    const [menuItems, inventory, tabs, orders] = await Promise.all([
      MenuItemModel.countDocuments(),
      InventoryModel.countDocuments(),
      TabModel.countDocuments(),
      OrderModel.countDocuments(),
    ]);

    console.log('📊 Current database contents:');
    console.log(`   1. Menu Items: ${menuItems}`);
    console.log(`   2. Inventory: ${inventory}`);
    console.log(`   3. Tabs: ${tabs}`);
    console.log(`   4. Orders: ${orders}\n`);

    // Ask what to delete
    console.log('What would you like to delete?');
    const deleteMenuItems = await askQuestion('Delete Menu Items? (y/n): ');
    const deleteInventory = await askQuestion('Delete Inventory? (y/n): ');
    const deleteTabs = await askQuestion('Delete Tabs? (y/n): ');
    const deleteOrders = await askQuestion('Delete Orders? (y/n): ');

    const toDelete = [];
    if (deleteMenuItems.toLowerCase() === 'y') toDelete.push('Menu Items');
    if (deleteInventory.toLowerCase() === 'y') toDelete.push('Inventory');
    if (deleteTabs.toLowerCase() === 'y') toDelete.push('Tabs');
    if (deleteOrders.toLowerCase() === 'y') toDelete.push('Orders');

    if (toDelete.length === 0) {
      console.log('\n✅ Nothing selected for deletion.\n');
      rl.close();
      process.exit(0);
    }

    console.log(`\n⚠️  You are about to delete: ${toDelete.join(', ')}`);
    const confirm = await askQuestion('Type "DELETE" to confirm: ');

    if (confirm !== 'DELETE') {
      console.log('\n❌ Cleanup cancelled.\n');
      rl.close();
      process.exit(0);
    }

    console.log('\n🗑️  Deleting...\n');

    let totalDeleted = 0;

    if (deleteMenuItems.toLowerCase() === 'y') {
      const result = await MenuItemModel.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} menu items`);
      totalDeleted += result.deletedCount;
    }

    if (deleteInventory.toLowerCase() === 'y') {
      const result = await InventoryModel.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} inventory items`);
      totalDeleted += result.deletedCount;
    }

    if (deleteTabs.toLowerCase() === 'y') {
      const result = await TabModel.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} tabs`);
      totalDeleted += result.deletedCount;
    }

    if (deleteOrders.toLowerCase() === 'y') {
      const result = await OrderModel.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} orders`);
      totalDeleted += result.deletedCount;
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} total documents.\n`);

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

selectiveCleanup();
