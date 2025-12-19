import 'dotenv/config';
import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import Order from '../models/order-model';

async function verifyData() {
  try {
    await connectDB();
    console.log('Connected to database\n');

    // Check menu items
    console.log('📋 Checking Menu Items:');
    const menuItems = await MenuItemModel.find({}).select('name price costPerUnit').limit(5);
    menuItems.forEach((item) => {
      console.log(
        `  - ${item.name}: Price=₦${item.price}, Cost=₦${item.costPerUnit || 0}`
      );
    });

    const itemsWithCost = await MenuItemModel.countDocuments({ costPerUnit: { $gt: 0 } });
    const totalItems = await MenuItemModel.countDocuments();
    console.log(`\n  Total items: ${totalItems}`);
    console.log(`  Items with cost data: ${itemsWithCost}\n`);

    // Check orders
    console.log('📦 Checking Recent Orders:');
    const orders = await Order.find({ paymentStatus: 'paid' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber total totalCost items createdAt');

    if (orders.length === 0) {
      console.log('  No paid orders found\n');
    } else {
      orders.forEach((order) => {
        console.log(`  Order ${order.orderNumber}:`);
        console.log(`    Total: ₦${order.total}`);
        console.log(`    Total Cost: ₦${order.totalCost || 0}`);
        console.log(`    Items: ${order.items.length}`);
        console.log(`    Created: ${order.createdAt}`);
        
        // Check if items have cost data
        const itemsWithCostData = order.items.filter((item: any) => item.totalCost > 0);
        console.log(`    Items with cost data: ${itemsWithCostData.length}/${order.items.length}\n`);
      });
    }

    // Summary
    console.log('💡 Summary:');
    if (itemsWithCost === 0) {
      console.log('  ❌ No menu items have cost data - run seed script first');
    } else if (orders.length === 0 || orders.every((o) => !o.totalCost || o.totalCost === 0)) {
      console.log('  ⚠️  Menu items have cost data, but orders do not');
      console.log('  ✅ Solution: Create new orders to see profitability data');
    } else {
      console.log('  ✅ Both menu items and orders have cost data');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyData();
