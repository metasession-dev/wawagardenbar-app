import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import Order from '@/models/order-model';

/**
 * Migration script to add price override fields to existing data
 * 
 * This script:
 * 1. Adds allowManualPriceOverride field to all existing menu items (default: false)
 * 2. Adds price override fields to all existing order items (default: priceOverridden = false)
 * 
 * Run with: npx tsx scripts/migrate-price-override-fields.ts
 */
async function migrate() {
  console.log('🚀 Starting price override fields migration...\n');

  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Step 1: Migrate Menu Items
    console.log('📋 Step 1: Migrating menu items...');
    const menuItemsResult = await MenuItemModel.updateMany(
      { allowManualPriceOverride: { $exists: false } },
      { $set: { allowManualPriceOverride: false } }
    );
    console.log(`✅ Updated ${menuItemsResult.modifiedCount} menu items with allowManualPriceOverride field\n`);

    // Step 2: Migrate Order Items
    console.log('📋 Step 2: Migrating order items...');
    
    // Get all orders
    const orders = await Order.find({}).lean();
    console.log(`Found ${orders.length} orders to process`);

    let updatedOrdersCount = 0;
    let updatedItemsCount = 0;

    for (const order of orders) {
      let needsUpdate = false;
      const updatedItems = order.items.map((item: any) => {
        // Check if item already has price override fields
        if (item.priceOverridden === undefined) {
          needsUpdate = true;
          updatedItemsCount++;
          return {
            ...item,
            priceOverridden: false,
          };
        }
        return item;
      });

      if (needsUpdate) {
        await Order.updateOne(
          { _id: order._id },
          { $set: { items: updatedItems } }
        );
        updatedOrdersCount++;
      }
    }

    console.log(`✅ Updated ${updatedItemsCount} order items across ${updatedOrdersCount} orders\n`);

    // Step 3: Verify migration
    console.log('📋 Step 3: Verifying migration...');
    
    const menuItemsWithField = await MenuItemModel.countDocuments({
      allowManualPriceOverride: { $exists: true }
    });
    const totalMenuItems = await MenuItemModel.countDocuments();
    
    console.log(`Menu Items: ${menuItemsWithField}/${totalMenuItems} have allowManualPriceOverride field`);

    const ordersWithPriceOverrideFields = await Order.countDocuments({
      'items.priceOverridden': { $exists: true }
    });
    const totalOrders = await Order.countDocuments();
    
    console.log(`Orders: ${ordersWithPriceOverrideFields}/${totalOrders} have price override fields on items`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Menu items updated: ${menuItemsResult.modifiedCount}`);
    console.log(`   - Order items updated: ${updatedItemsCount}`);
    console.log(`   - Orders updated: ${updatedOrdersCount}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
