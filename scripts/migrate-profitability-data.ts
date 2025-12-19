// IMPORTANT: Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const result = config({ path: envPath });

if (result.error) {
  console.error('⚠️  Warning: Could not load .env.local file');
  console.error('   Path:', envPath);
  console.error('   Error:', result.error.message);
  console.log('\n💡 Make sure .env.local exists in the project root with:');
  console.log('   MONGODB_WAWAGARDENBAR_APP_URI=mongodb://...');
  console.log('   MONGODB_DB_NAME=wawagardenbar\n');
  process.exit(1);
}

// Now import modules that depend on environment variables
import { connectDB } from '@/lib/mongodb';
import MenuItem from '@/models/menu-item-model';
import Order from '@/models/order-model';
import MenuItemPriceHistory from '@/models/menu-item-price-history-model';
import { Types } from 'mongoose';

/**
 * Migration script to initialize profitability tracking
 * 
 * This script:
 * 1. Creates initial price history records for all menu items
 * 2. Backfills existing orders with estimated cost data
 * 3. Marks backfilled data appropriately
 * 
 * Run with: npx tsx scripts/migrate-profitability-data.ts
 */

async function migrateMenuItemPriceHistory() {
  console.log('\n📊 Step 1: Creating price history for menu items...');
  
  const menuItems = await MenuItem.find({});
  let created = 0;
  let skipped = 0;

  for (const item of menuItems) {
    // Check if price history already exists
    const existing = await MenuItemPriceHistory.findOne({
      menuItemId: item._id,
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Create initial price history record
    await MenuItemPriceHistory.create({
      menuItemId: item._id,
      price: item.price,
      costPerUnit: item.costPerUnit || 0,
      effectiveFrom: item.createdAt || new Date(),
      effectiveTo: null,
      reason: 'initial_price',
      changedBy: new Types.ObjectId('000000000000000000000000'), // System user
    });

    created++;
  }

  console.log(`✅ Created ${created} price history records`);
  console.log(`⏭️  Skipped ${skipped} items (already have history)`);
}

async function backfillOrderProfitability() {
  console.log('\n📦 Step 2: Backfilling order profitability data...');
  
  // Find orders without profitability data
  const orders = await Order.find({
    $or: [
      { totalCost: { $exists: false } },
      { totalCost: 0 },
    ],
  }).limit(1000); // Process in batches

  let updated = 0;
  let errors = 0;

  for (const order of orders) {
    try {
      // Enrich items with cost data
      const enrichedItems = order.items.map((item: any) => {
        // Use current cost as estimate (best we can do for historical data)
        const costPerUnit = item.costPerUnit || 0;
        const totalCost = costPerUnit * item.quantity;
        const grossProfit = item.subtotal - totalCost;
        const profitMargin = item.subtotal > 0 ? (grossProfit / item.subtotal) * 100 : 0;

        return {
          ...item.toObject(),
          costPerUnit,
          totalCost,
          grossProfit,
          profitMargin,
        };
      });

      // Calculate order-level profitability
      const totalCost = enrichedItems.reduce((sum: number, item: any) => sum + item.totalCost, 0);
      
      // Estimate operational costs
      const operationalCosts = {
        delivery: order.orderType === 'delivery' ? order.deliveryFee * 0.6 : 0,
        packaging: order.orderType === 'delivery' ? 100 : order.orderType === 'pickup' ? 50 : 0,
        processing: order.total * 0.03,
      };

      const totalOperationalCosts =
        operationalCosts.delivery + operationalCosts.packaging + operationalCosts.processing;
      const grossProfit = order.total - totalCost - totalOperationalCosts;
      const profitMargin = order.total > 0 ? (grossProfit / order.total) * 100 : 0;

      // Update order
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            items: enrichedItems,
            totalCost,
            grossProfit,
            profitMargin,
            operationalCosts,
          },
        }
      );

      updated++;

      if (updated % 100 === 0) {
        console.log(`   Processed ${updated} orders...`);
      }
    } catch (error) {
      console.error(`   Error processing order ${order.orderNumber}:`, error);
      errors++;
    }
  }

  console.log(`✅ Updated ${updated} orders with profitability data`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} orders had errors`);
  }
  
  if (orders.length === 1000) {
    console.log(`\n⚠️  More orders to process. Run script again to continue.`);
  }
}

async function validateMigration() {
  console.log('\n🔍 Step 3: Validating migration...');
  
  // Check menu items
  const totalMenuItems = await MenuItem.countDocuments();
  const itemsWithPriceHistory = await MenuItemPriceHistory.distinct('menuItemId');
  const itemsWithCost = await MenuItem.countDocuments({ costPerUnit: { $gt: 0 } });
  
  console.log(`   Menu Items: ${totalMenuItems}`);
  console.log(`   Items with price history: ${itemsWithPriceHistory.length}`);
  console.log(`   Items with cost data: ${itemsWithCost}`);
  
  if (itemsWithCost === 0) {
    console.log(`   ⚠️  WARNING: No menu items have cost data. Please update costPerUnit field.`);
  }
  
  // Check orders
  const totalOrders = await Order.countDocuments();
  const ordersWithProfitability = await Order.countDocuments({
    totalCost: { $exists: true, $gt: 0 },
  });
  
  console.log(`   Total Orders: ${totalOrders}`);
  console.log(`   Orders with profitability: ${ordersWithProfitability}`);
  
  const coverage = totalOrders > 0 ? (ordersWithProfitability / totalOrders) * 100 : 0;
  console.log(`   Coverage: ${coverage.toFixed(2)}%`);
  
  if (coverage < 100) {
    console.log(`   ℹ️  Run migration again to process remaining orders`);
  }
}

async function main() {
  console.log('🚀 Starting Profitability Data Migration\n');
  console.log('This script will:');
  console.log('1. Create price history records for all menu items');
  console.log('2. Backfill existing orders with profitability data');
  console.log('3. Validate the migration\n');

  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Step 1: Create price history
    await migrateMenuItemPriceHistory();

    // Step 2: Backfill orders
    await backfillOrderProfitability();

    // Step 3: Validate
    await validateMigration();

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Review the migration results');
    console.log('2. Update menu items with accurate costPerUnit values');
    console.log('3. Run migration again if needed for remaining orders');
    console.log('4. Deploy price management features\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();
