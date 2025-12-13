/**
 * Fix orders in closed tabs that are missing paidAt
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import OrderModel from '../models/order-model';
import TabModel from '../models/tab-model';

async function fixTabOrders() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find all closed, paid tabs
    const closedTabs = await TabModel.find({
      status: 'closed',
      paymentStatus: 'paid',
      paidAt: { $exists: true }
    }).lean();

    console.log(`📋 Found ${closedTabs.length} closed, paid tabs\n`);

    let totalFixed = 0;

    for (const tab of closedTabs) {
      // Find orders in this tab that are missing paidAt
      const ordersToFix = await OrderModel.find({
        _id: { $in: tab.orders },
        $or: [
          { paidAt: { $exists: false } },
          { paymentStatus: { $ne: 'paid' } }
        ]
      });

      if (ordersToFix.length > 0) {
        console.log(`📦 Tab #${tab.tabNumber} - Fixing ${ordersToFix.length} orders`);
        
        // Update orders with tab's paidAt
        const result = await OrderModel.updateMany(
          { _id: { $in: ordersToFix.map(o => o._id) } },
          {
            $set: {
              paymentStatus: 'paid',
              paidAt: tab.paidAt,
              status: 'confirmed'
            }
          }
        );

        console.log(`   ✅ Updated ${result.modifiedCount} orders\n`);
        totalFixed += result.modifiedCount;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total tabs checked: ${closedTabs.length}`);
    console.log(`   Total orders fixed: ${totalFixed}\n`);

    if (totalFixed > 0) {
      console.log('✅ Orders have been fixed! The financial report should now show correct data.');
    } else {
      console.log('✅ All orders are already correct!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTabOrders();
