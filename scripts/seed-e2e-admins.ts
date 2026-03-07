/**
 * Seed dedicated E2E test admin users.
 *
 * Creates two users (idempotent — deletes and recreates each run):
 *   - e2e-admin      (role: admin, all permissions)
 *   - e2e-superadmin  (role: super-admin)
 *
 * Run with:  npx tsx scripts/seed-e2e-admins.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { connectDB } from '../lib/mongodb';
import { AdminService } from '../services/admin-service';
import { UserModel } from '../models';

const E2E_CSR = {
  username: 'e2e-csr',
  password: 'E2eTest@2026!',
  email: 'e2e-csr@test.wawagardenbar.com',
  firstName: 'E2E',
  lastName: 'CSR',
  role: 'csr' as const,
};

const E2E_ADMIN = {
  username: 'e2e-admin',
  password: 'E2eTest@2026!',
  email: 'e2e-admin@test.wawagardenbar.com',
  firstName: 'E2E',
  lastName: 'Admin',
  role: 'admin' as const,
};

const E2E_SUPER_ADMIN = {
  username: 'e2e-superadmin',
  password: 'E2eTest@2026!',
  email: 'e2e-superadmin@test.wawagardenbar.com',
  firstName: 'E2E',
  lastName: 'SuperAdmin',
  role: 'super-admin' as const,
};

async function seed() {
  try {
    await connectDB();

    // Find or create a system user for the audit trail
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
    const createdBy = systemUser._id.toString();

    for (const spec of [E2E_CSR, E2E_ADMIN, E2E_SUPER_ADMIN]) {
      // Remove existing user if present (idempotent)
      await UserModel.deleteMany({ username: spec.username });

      await AdminService.createAdmin({
        ...spec,
        createdBy,
        ...(spec.role === 'admin'
          ? {
              permissions: {
                orderManagement: true,
                menuManagement: true,
                inventoryManagement: true,
                rewardsAndLoyalty: true,
                reportsAndAnalytics: true,
                expensesManagement: true,
                settingsAndConfiguration: true,
              },
            }
          : {}),
        ...(spec.role === 'csr'
          ? {
              permissions: {
                orderManagement: true,
                menuManagement: false,
                inventoryManagement: false,
                rewardsAndLoyalty: true,
                reportsAndAnalytics: false,
                expensesManagement: false,
                settingsAndConfiguration: false,
              },
            }
          : {}),
      });

      console.log(`Created ${spec.role}: ${spec.username} (${spec.email})`);
    }

    console.log('\nE2E admin users seeded successfully.');
    console.log('Add these to .env.local:\n');
    console.log(`E2E_CSR_USERNAME=${E2E_CSR.username}`);
    console.log(`E2E_CSR_PASSWORD=${E2E_CSR.password}`);
    console.log(`E2E_ADMIN_USERNAME=${E2E_ADMIN.username}`);
    console.log(`E2E_ADMIN_PASSWORD=${E2E_ADMIN.password}`);
    console.log(`E2E_SUPER_ADMIN_USERNAME=${E2E_SUPER_ADMIN.username}`);
    console.log(`E2E_SUPER_ADMIN_PASSWORD=${E2E_SUPER_ADMIN.password}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error seeding E2E admins:', error.message);
    process.exit(1);
  }
}

seed();
