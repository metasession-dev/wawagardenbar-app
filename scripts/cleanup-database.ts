/**
 * Database Cleanup Script
 * 
 * ⚠️  WARNING: This script will DELETE ALL data from:
 * - Menu Items
 * - Inventory
 * - Tabs
 * - Orders
 * 
 * Usage: npx tsx scripts/cleanup-database.ts
 * 
 * For safety, you must confirm before deletion.
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

async function getCollectionCounts() {
  const [menuItems, inventory, tabs, orders] = await Promise.all([
    MenuItemModel.countDocuments(),
    InventoryModel.countDocuments(),
    TabModel.countDocuments(),
    OrderModel.countDocuments(),
  ]);

  return { menuItems, inventory, tabs, orders };
}

async function cleanupDatabase() {
  try {
    console.log('\n🗑️  Database Cleanup Script\n');
    console.log('⚠️  WARNING: This will DELETE ALL data!\n');

    await connectDB();
    console.log('✅ Connected to database\n');

    // Get current counts
    const counts = await getCollectionCounts();

    console.log('📊 Current database contents:');
    console.log(`   Menu Items: ${counts.menuItems}`);
    console.log(`   Inventory: ${counts.inventory}`);
    console.log(`   Tabs: ${counts.tabs}`);
    console.log(`   Orders: ${counts.orders}`);
    console.log(`   TOTAL: ${counts.menuItems + counts.inventory + counts.tabs + counts.orders} documents\n`);

    if (counts.menuItems + counts.inventory + counts.tabs + counts.orders === 0) {
      console.log('✅ Database is already empty. Nothing to delete.\n');
      rl.close();
      process.exit(0);
    }

    // Confirmation
    const answer = await askQuestion('⚠️  Are you sure you want to DELETE ALL this data? Type "DELETE" to confirm: ');

    if (answer !== 'DELETE') {
      console.log('\n❌ Cleanup cancelled. No data was deleted.\n');
      rl.close();
      process.exit(0);
    }

    console.log('\n🗑️  Starting cleanup...\n');

    // Delete all data
    const results = await Promise.all([
      MenuItemModel.deleteMany({}),
      InventoryModel.deleteMany({}),
      TabModel.deleteMany({}),
      OrderModel.deleteMany({}),
    ]);

    console.log('✅ Cleanup complete!\n');
    console.log('📊 Deleted:');
    console.log(`   Menu Items: ${results[0].deletedCount}`);
    console.log(`   Inventory: ${results[1].deletedCount}`);
    console.log(`   Tabs: ${results[2].deletedCount}`);
    console.log(`   Orders: ${results[3].deletedCount}`);
    console.log(`   TOTAL: ${results.reduce((sum, r) => sum + r.deletedCount, 0)} documents\n`);

    // Verify cleanup
    const finalCounts = await getCollectionCounts();
    const remaining = finalCounts.menuItems + finalCounts.inventory + finalCounts.tabs + finalCounts.orders;

    if (remaining === 0) {
      console.log('✅ Database is now clean!\n');
    } else {
      console.log(`⚠️  Warning: ${remaining} documents still remain in database\n`);
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    rl.close();
    process.exit(1);
  }
}

// Run cleanup
cleanupDatabase();
