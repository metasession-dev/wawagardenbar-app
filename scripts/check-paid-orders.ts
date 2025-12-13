/**
 * Script to check paid orders and their paidAt field
 * Run with: npx tsx scripts/check-paid-orders.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import OrderModel from '../models/order-model';
import TabModel from '../models/tab-model';

async function checkPaidOrders() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Check all paid orders
    const paidOrders = await OrderModel.find({ paymentStatus: 'paid' })
      .select('orderNumber total paidAt createdAt paymentStatus orderType')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`📊 Found ${paidOrders.length} paid orders (showing last 10):\n`);

    paidOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order #${order.orderNumber}`);
      console.log(`   Type: ${order.orderType}`);
      console.log(`   Total: ₦${order.total.toLocaleString()}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Paid At: ${order.paidAt || '❌ NOT SET'}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log('');
    });

    // Check orders without paidAt
    const ordersWithoutPaidAt = await OrderModel.countDocuments({
      paymentStatus: 'paid',
      paidAt: { $exists: false }
    });

    console.log(`\n⚠️  Orders marked as paid but missing paidAt: ${ordersWithoutPaidAt}`);

    // Check closed tabs
    const closedTabs = await TabModel.find({
      status: 'closed',
      paymentStatus: 'paid'
    })
      .select('tabNumber total paidAt closedAt orders')
      .sort({ closedAt: -1 })
      .limit(5)
      .lean();

    console.log(`\n📋 Found ${closedTabs.length} closed tabs (showing last 5):\n`);

    closedTabs.forEach((tab, index) => {
      console.log(`${index + 1}. Tab #${tab.tabNumber}`);
      console.log(`   Total: ₦${tab.total.toLocaleString()}`);
      console.log(`   Closed At: ${tab.closedAt}`);
      console.log(`   Paid At: ${tab.paidAt || '❌ NOT SET'}`);
      console.log(`   Orders: ${tab.orders.length}`);
      console.log('');
    });

    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Total paid orders: ${paidOrders.length}`);
    console.log(`   Orders with paidAt: ${paidOrders.filter(o => o.paidAt).length}`);
    console.log(`   Orders missing paidAt: ${ordersWithoutPaidAt}`);
    console.log(`   Closed tabs: ${closedTabs.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPaidOrders();
