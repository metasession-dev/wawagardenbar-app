/**
 * Delete All Orders
 * 
 * Removes all orders from the database
 * 
 * Usage: npx tsx scripts/delete-all-orders.ts
 */

import { config } from 'dotenv';
const result = config({ path: '.env.local' });
if (result.error && !process.env.MONGODB_WAWAGARDENBAR_APP_URI) {
  console.error('⚠️  Environment variables not set');
  process.exit(1);
}

import { connectDB } from '../lib/mongodb';
import OrderModel from '../models/order-model';

async function deleteAllOrders() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will delete ALL orders from the database!');
    
    const count = await OrderModel.countDocuments();
    console.log(`📊 Current order count: ${count}\n`);

    console.log('🗑️  Deleting all orders...');
    const result = await OrderModel.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} orders\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting orders:', error);
    process.exit(1);
  }
}

deleteAllOrders();
