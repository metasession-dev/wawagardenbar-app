import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user-model';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * Seed test users with different roles
 * Run with: npx tsx scripts/seed-test-users.ts
 */
async function seedTestUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    if (!dbName) {
      throw new Error('MONGODB_DB_NAME environment variable is not set');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName });
    console.log(`Connected to MongoDB (database: ${dbName})`);

    console.log('\n🌱 Seeding test users...');

    // Test users data
    const testUsers = [
      {
        email: 'adekunle@gmail.com',
        name: 'Test Customer',
        role: 'customer',
        emailVerified: true,
        phone: '+234 800 000 0001',
      },
      {
        email: 'ade@wawagardenbar.com',
        name: 'Test Admin',
        role: 'admin',
        emailVerified: true,
        phone: '+234 800 000 0002',
      },
      {
        email: 'william@ostendo.io',
        name: 'Test Super Admin',
        role: 'super-admin',
        emailVerified: true,
        phone: '+234 800 000 0003',
      },
    ];

    // Delete existing test users
    await UserModel.deleteMany({
      email: { $in: testUsers.map((u) => u.email) },
    });

    // Create test users
    for (const userData of testUsers) {
      const user = await UserModel.create({
        ...userData,
        // REQ-119 — staff users carry `roles` as well as the legacy `role`.
        roles: userData.role === 'customer' ? [] : [userData.role],
      });
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
      console.log(`   User ID: ${user._id}`);
    }

    console.log('\n✨ Test users created successfully!');
    console.log('\n📝 Login Instructions:');
    console.log('1. Go to /login');
    console.log('2. Enter one of these emails:');
    console.log('   - customer@test.com (Customer role)');
    console.log('   - admin@test.com (Admin role)');
    console.log('   - superadmin@test.com (Super Admin role)');
    console.log('3. Request verification PIN');
    console.log('4. Check console for PIN (in development)');
    console.log('5. Enter PIN to login\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedTestUsers();
