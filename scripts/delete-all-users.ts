/**
 * Delete All Users
 * 
 * Removes all users from the database
 * Super admin will be recreated using create-super-admin.ts
 * 
 * Usage: npx tsx scripts/delete-all-users.ts
 */

import { config } from 'dotenv';
const result = config({ path: '.env.local' });
if (result.error && !process.env.MONGODB_WAWAGARDENBAR_APP_URI) {
  console.error('⚠️  Environment variables not set');
  process.exit(1);
}

import { connectDB } from '../lib/mongodb';
import { UserModel } from '../models';

async function deleteAllUsers() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will delete ALL users from the database!');
    
    const count = await UserModel.countDocuments();
    console.log(`📊 Current user count: ${count}\n`);

    console.log('🗑️  Deleting all users...');
    const result = await UserModel.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} users\n`);
    console.log('💡 Next step: Run create-super-admin.ts to recreate the super admin');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting users:', error);
    process.exit(1);
  }
}

deleteAllUsers();
