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
  console.log('   MONGODB_WAWAGARDENBAR_APP_URI=mongodb://localhost:27017');
  console.log('   MONGODB_DB_NAME=wawagardenbar\n');
  process.exit(1);
}

// Now import modules that depend on environment variables
import { connectDB } from '@/lib/mongodb';
import { AdminService } from '@/services/admin-service';
import { UserModel } from '@/models';

async function createSuperAdmin() {
  try {
    console.log('🔧 Connecting to database...');
    console.log('   MongoDB URI:', process.env.MONGODB_WAWAGARDENBAR_APP_URI ? '✓ Set' : '✗ Not set');
    console.log('   Database Name:', process.env.MONGODB_DB_NAME ? '✓ Set' : '✗ Not set');
    
    // Debug: Show actual values
    if (process.env.MONGODB_WAWAGARDENBAR_APP_URI) {
      console.log('   URI Value:', process.env.MONGODB_WAWAGARDENBAR_APP_URI.substring(0, 30) + '...');
    }
    
    await connectDB();

    // Check if any super-admin already exists
    const existingSuperAdmin = await UserModel.findOne({
      role: 'super-admin',
      accountStatus: 'active',
    });

    if (existingSuperAdmin) {
      console.log('⚠️  A super-admin already exists:');
      console.log(`   Username: ${existingSuperAdmin.username}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log('\n✅ No action needed.');
      process.exit(0);
    }

    // Prompt for super-admin details
    console.log('\n📝 Creating initial super-admin user...\n');

    const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const password = process.env.SUPER_ADMIN_PASSWORD || '7XvuvpUi8d4UR90U';
    const email = process.env.SUPER_ADMIN_EMAIL || 'ade@wawagardenbar.com';
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

    // Create system user for audit trail (if doesn't exist)
    let systemUser = await UserModel.findOne({ email: 'system@wawagardenbar.com' });
    
    if (!systemUser) {
      systemUser = await UserModel.create({
        email: 'system@wawagardenbar.com',
        firstName: 'System',
        lastName: 'User',
        role: 'super-admin',
        isAdmin: false,
        accountStatus: 'active',
        emailVerified: true,
        phoneVerified: false,
        phone: `system_${Date.now()}`,
      });
    }

    // Create super-admin
    await AdminService.createAdmin({
      username,
      password,
      email,
      firstName,
      lastName,
      role: 'super-admin',
      createdBy: systemUser._id.toString(),
    });

    console.log('\n✅ Super-admin created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`\n🔐 Login URL: http://localhost:3000/admin/login`);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error creating super-admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createSuperAdmin();
