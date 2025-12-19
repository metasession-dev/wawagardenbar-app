import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Check admin user permissions in database
 * Run with: npx tsx scripts/check-admin-permissions.ts <username>
 */
async function checkAdminPermissions(username: string) {
  try {
    await connectDB();

    if (!username) {
      console.error('❌ Please provide a username as an argument');
      console.log('Usage: npx tsx scripts/check-admin-permissions.ts <username>');
      console.log('Example: npx tsx scripts/check-admin-permissions.ts ade');
      process.exit(1);
    }

    const admin = await UserModel.findOne({
      username: username.toLowerCase(),
      isAdmin: true,
    }).select('username email role permissions');

    if (!admin) {
      console.error(`❌ Admin user "${username}" not found`);
      process.exit(1);
    }

    console.log('\n📋 Admin User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Username: ${admin.username}`);
    console.log(`Email: ${admin.email || 'Not set'}`);
    console.log(`Role: ${admin.role}`);
    console.log('\n🔐 Permissions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!admin.permissions) {
      console.log('⚠️  No permissions set (will use defaults)');
    } else {
      console.log(JSON.stringify(admin.permissions, null, 2));
      
      console.log('\n📊 Permission Summary:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const perms = admin.permissions as any;
      console.log(`Order Management: ${perms.orderManagement ? '✅' : '❌'}`);
      console.log(`Menu Management: ${perms.menuManagement ? '✅' : '❌'}`);
      console.log(`Inventory Management: ${perms.inventoryManagement ? '✅' : '❌'}`);
      console.log(`Rewards & Loyalty: ${perms.rewardsAndLoyalty ? '✅' : '❌'}`);
      console.log(`Reports & Analytics: ${perms.reportsAndAnalytics ? '✅' : '❌'}`);
      console.log(`Expenses Management: ${perms.expensesManagement ? '✅' : '❌'}`);
      console.log(`Settings & Configuration: ${perms.settingsAndConfiguration ? '✅' : '❌'}`);
    }

    console.log('\n✅ Check completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
    process.exit(1);
  }
}

const username = process.argv[2];
checkAdminPermissions(username);
