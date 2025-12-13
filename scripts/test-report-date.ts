/**
 * Test what date range the report uses for "today"
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { startOfDay, endOfDay } from 'date-fns';
import { connectDB } from '../lib/mongodb';
import OrderModel from '../models/order-model';

async function testReportDate() {
  try {
    await connectDB();
    
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    console.log('📅 Testing Report Date Range\n');
    console.log(`Current time: ${today.toISOString()}`);
    console.log(`Start of day: ${startDate.toISOString()}`);
    console.log(`End of day: ${endDate.toISOString()}\n`);

    // Query exactly like the report does
    const orders = await OrderModel.find({
      paymentStatus: 'paid',
      paidAt: { $gte: startDate, $lte: endDate },
    })
      .select('orderNumber total paidAt')
      .lean();

    console.log(`📊 Found ${orders.length} orders for today:\n`);

    if (orders.length > 0) {
      orders.forEach((order, index) => {
        console.log(`${index + 1}. Order #${order.orderNumber}`);
        console.log(`   Total: ₦${order.total.toLocaleString()}`);
        console.log(`   Paid At: ${order.paidAt}`);
        console.log(`   Paid At (ISO): ${order.paidAt ? new Date(order.paidAt).toISOString() : 'N/A'}`);
        console.log('');
      });

      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
      console.log(`💰 Total Revenue: ₦${totalRevenue.toLocaleString()}\n`);
    } else {
      console.log('❌ No orders found for this date range\n');
      
      // Check orders paid today in any timezone
      const allPaidToday = await OrderModel.find({
        paymentStatus: 'paid',
        paidAt: { $exists: true }
      })
        .select('orderNumber total paidAt')
        .sort({ paidAt: -1 })
        .limit(5)
        .lean();

      console.log('🔍 Recent paid orders (last 5):\n');
      allPaidToday.forEach((order, index) => {
        const paidDate = order.paidAt ? new Date(order.paidAt) : null;
        console.log(`${index + 1}. Order #${order.orderNumber}`);
        console.log(`   Paid At: ${paidDate ? paidDate.toISOString() : 'N/A'}`);
        console.log(`   Paid At (Local): ${paidDate ? paidDate.toLocaleString() : 'N/A'}`);
        console.log(`   Total: ₦${order.total.toLocaleString()}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testReportDate();
