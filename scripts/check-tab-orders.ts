/**
 * Check orders belonging to closed tabs
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import OrderModel from '../models/order-model';
import TabModel from '../models/tab-model';

async function checkTabOrders() {
  try {
    await connectDB();
    
    // Get the specific tab
    const tab = await TabModel.findOne({ tabNumber: 'TAB-1-543120' }).lean();
    
    if (!tab) {
      console.log('❌ Tab not found');
      process.exit(1);
    }

    console.log(`📋 Tab #${tab.tabNumber}`);
    console.log(`   Status: ${tab.status}`);
    console.log(`   Payment Status: ${tab.paymentStatus}`);
    console.log(`   Total: ₦${tab.total.toLocaleString()}`);
    console.log(`   Closed At: ${tab.closedAt}`);
    console.log(`   Paid At: ${tab.paidAt}`);
    console.log(`   Number of Orders: ${tab.orders.length}\n`);

    // Get the orders
    const orders = await OrderModel.find({
      _id: { $in: tab.orders }
    }).lean();

    console.log(`📦 Orders in this tab:\n`);

    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order #${order.orderNumber}`);
      console.log(`   Total: ₦${order.total.toLocaleString()}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Paid At: ${order.paidAt || '❌ NOT SET'}`);
      console.log(`   Status: ${order.status}`);
      console.log('');
    });

    // Check if orders have paidAt
    const ordersWithoutPaidAt = orders.filter(o => !o.paidAt);
    
    if (ordersWithoutPaidAt.length > 0) {
      console.log(`\n⚠️  ${ordersWithoutPaidAt.length} orders in this tab are missing paidAt!`);
      console.log('This is why they don\'t appear in the financial report.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTabOrders();
