/**
 * Delete Specific Order Script
 * 
 * Deletes a specific order and properly cleans up:
 * - Order record
 * - Inventory restoration (returns items to stock)
 * - Customer statistics (totalSpent, totalOrders)
 * - Payment records
 * - Tab associations (if applicable)
 * 
 * Usage: npx tsx scripts/delete-order.ts <orderId>
 * Example: npx tsx scripts/delete-order.ts 507f1f77bcf86cd799439011
 */

import { config } from 'dotenv';
const result = config({ path: '.env.local' });
if (result.error && !process.env.MONGODB_WAWAGARDENBAR_APP_URI) {
  console.error('⚠️  Environment variables not set');
  process.exit(1);
}

import { connectDB } from '../lib/mongodb';
import OrderModel from '../models/order-model';
import { UserModel } from '../models';
import InventoryModel from '../models/inventory-model';
import PaymentModel from '../models/payment-model';
import TabModel from '../models/tab-model';
import { Types } from 'mongoose';

interface DeleteOrderResult {
  success: boolean;
  message: string;
  details?: {
    orderDeleted: boolean;
    inventoryRestored: number;
    customerStatsUpdated: boolean;
    paymentDeleted: boolean;
    tabUpdated: boolean;
  };
}

async function deleteOrder(orderId: string): Promise<DeleteOrderResult> {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    // Validate orderId format
    if (!Types.ObjectId.isValid(orderId)) {
      return {
        success: false,
        message: 'Invalid order ID format',
      };
    }

    // Fetch the order
    console.log(`🔍 Fetching order: ${orderId}`);
    const order = await OrderModel.findById(orderId);

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    console.log(`📦 Order found: ${order.orderNumber}`);
    console.log(`   Customer: ${order.guestName || 'N/A'}`);
    console.log(`   Type: ${order.orderType}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: ₦${order.total.toLocaleString()}`);
    console.log(`   Items: ${order.items.length}`);
    console.log(`   Created: ${order.createdAt}\n`);

    // Warning for completed orders
    if (order.status === 'completed' || order.status === 'delivered') {
      console.log('⚠️  WARNING: This order is marked as completed/delivered');
      console.log('   Deleting it will affect historical reports and customer records\n');
    }

    const details = {
      orderDeleted: false,
      inventoryRestored: 0,
      customerStatsUpdated: false,
      paymentDeleted: false,
      tabUpdated: false,
    };

    // Step 1: Restore inventory for each item
    console.log('📦 Restoring inventory...');
    for (const item of order.items) {
      try {
        const inventory = await InventoryModel.findOne({ menuItemId: item.menuItemId });
        
        if (inventory && inventory.preventOrdersWhenOutOfStock) {
          // Only restore if inventory tracking is enabled
          const quantityToRestore = item.quantity;
          
          inventory.currentStock += quantityToRestore;
          inventory.stockHistory.push({
            quantity: quantityToRestore,
            type: 'addition',
            reason: `Order ${order.orderNumber} deleted - inventory restored`,
            category: 'adjustment',
            performedBy: new Types.ObjectId('000000000000000000000000'),
            timestamp: new Date(),
          });

          await inventory.save();
          details.inventoryRestored++;
          console.log(`   ✓ Restored ${quantityToRestore}x ${item.name}`);
        }
      } catch (invError) {
        console.warn(`   ⚠️  Could not restore inventory for ${item.name}:`, invError);
      }
    }
    console.log(`✅ Restored inventory for ${details.inventoryRestored} items\n`);

    // Step 2: Update customer statistics
    if (order.userId && !order.guestEmail) {
      console.log('👤 Updating customer statistics...');
      try {
        const user = await UserModel.findById(order.userId);
        
        if (user) {
          // Subtract order total from totalSpent
          user.totalSpent = Math.max(0, (user.totalSpent || 0) - order.total);
          
          // Decrement order count
          user.totalOrders = Math.max(0, (user.totalOrders || 0) - 1);
          
          await user.save();
          details.customerStatsUpdated = true;
          console.log(`   ✓ Updated stats for ${user.email}`);
          console.log(`   - Total spent: ₦${user.totalSpent.toLocaleString()}`);
          console.log(`   - Total orders: ${user.totalOrders}\n`);
        }
      } catch (userError) {
        console.warn('   ⚠️  Could not update customer statistics:', userError);
      }
    }

    // Step 3: Delete associated payment record
    if (order.paymentId) {
      console.log('💳 Deleting payment record...');
      try {
        const payment = await PaymentModel.findByIdAndDelete(order.paymentId);
        if (payment) {
          details.paymentDeleted = true;
          console.log(`   ✓ Deleted payment: ${payment.paymentReference}\n`);
        }
      } catch (paymentError) {
        console.warn('   ⚠️  Could not delete payment record:', paymentError);
      }
    }

    // Step 4: Update tab if order is associated with a tab
    if (order.tabId) {
      console.log('🏷️  Updating tab...');
      try {
        const tab = await TabModel.findById(order.tabId);
        
        if (tab) {
          // Remove order from tab's orders array
          tab.orders = tab.orders.filter(
            (orderId) => orderId.toString() !== order._id.toString()
          );
          
          // Recalculate tab total
          tab.total = Math.max(0, tab.total - order.total);
          
          await tab.save();
          details.tabUpdated = true;
          console.log(`   ✓ Updated tab: ${tab.tabNumber}`);
          console.log(`   - New total: ₦${tab.total.toLocaleString()}\n`);
        }
      } catch (tabError) {
        console.warn('   ⚠️  Could not update tab:', tabError);
      }
    }

    // Step 5: Delete the order
    console.log('🗑️  Deleting order...');
    await OrderModel.findByIdAndDelete(orderId);
    details.orderDeleted = true;
    console.log(`✅ Order ${order.orderNumber} deleted successfully\n`);

    return {
      success: true,
      message: `Order ${order.orderNumber} deleted successfully`,
      details,
    };
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Main execution
async function main() {
  const orderId = process.argv[2];

  if (!orderId) {
    console.error('❌ Error: Order ID is required');
    console.log('\nUsage: npx tsx scripts/delete-order.ts <orderId>');
    console.log('Example: npx tsx scripts/delete-order.ts 507f1f77bcf86cd799439011\n');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('           DELETE ORDER SCRIPT');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`🎯 Target Order ID: ${orderId}\n`);

  const result = await deleteOrder(orderId);

  console.log('═══════════════════════════════════════════════════════');
  console.log('                    SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  
  if (result.success) {
    console.log('✅ Status: SUCCESS');
    console.log(`📝 Message: ${result.message}\n`);
    
    if (result.details) {
      console.log('Details:');
      console.log(`   Order Deleted: ${result.details.orderDeleted ? '✓' : '✗'}`);
      console.log(`   Inventory Restored: ${result.details.inventoryRestored} items`);
      console.log(`   Customer Stats Updated: ${result.details.customerStatsUpdated ? '✓' : '✗'}`);
      console.log(`   Payment Deleted: ${result.details.paymentDeleted ? '✓' : '✗'}`);
      console.log(`   Tab Updated: ${result.details.tabUpdated ? '✓' : 'N/A'}`);
    }
    
    console.log('\n💡 The order has been completely removed from the system.');
    console.log('   Reports and analytics will reflect this change.');
    process.exit(0);
  } else {
    console.log('❌ Status: FAILED');
    console.log(`📝 Message: ${result.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
