import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user-model';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { ExpenseModel } from '@/models/expense-model';
import { InventorySnapshotModel } from '@/models/inventory-snapshot-model';

dotenv.config({ path: '.env.local' });

/**
 * E2E fixture seeder — non-empty initial state for tests that depend on
 * existing records (rather than tests that create their own data via the UI).
 *
 * Currently seeds:
 *   - 1 inventory snapshot (food category, pending status) — so the
 *     /dashboard/inventory/snapshots list page renders a `<table>` rather
 *     than the "No snapshots found" empty state, and the snapshot-detail
 *     page has something to navigate to.
 *   - 1 expense — so /dashboard/finance/expenses renders the table with
 *     at least one row, letting the expenses-search "clearing the search
 *     restores the full list" test actually verify that narrowing
 *     changes the count.
 *
 * Both records use a `E2E-FIXTURE-` prefix in their human-readable fields
 * so they're identifiable in the UI and don't collide with records the
 * tests create themselves (which use timestamp suffixes).
 *
 * Idempotent: deletes its prior fixtures by prefix before seeding, so re-
 * running the script in the same fixture is safe.
 *
 * Run with: npx tsx scripts/seed-e2e-fixtures.ts
 */
async function seedE2eFixtures() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) throw new Error('MONGODB_URI environment variable is not set');
  if (!dbName)
    throw new Error('MONGODB_DB_NAME environment variable is not set');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { dbName });
  console.log(`Connected to MongoDB (database: ${dbName})`);

  try {
    // ── Resolve dependencies (super-admin user + a menu item to ref) ──────
    const superAdmin = await UserModel.findOne({ username: 'e2e-superadmin' });
    if (!superAdmin) {
      throw new Error(
        'e2e-superadmin user not found. Run seed-e2e-admins.ts first.'
      );
    }

    const foodMenuItem = await MenuItemModel.findOne({ mainCategory: 'food' });
    if (!foodMenuItem) {
      throw new Error('No food menu item found. Run seed-food-menu.ts first.');
    }

    const inventoryForItem = await InventoryModel.findOne({
      menuItemId: foodMenuItem._id,
    });
    // inventoryForItem is optional — snapshot item's inventoryId is not required.

    // ── Snapshot ──────────────────────────────────────────────────────────
    // Snapshot has a unique compound index on
    // (snapshotDate, mainCategory, submittedBy), so we delete any existing
    // E2E fixture snapshot for this same triple before re-creating.
    const snapshotDate = new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    await InventorySnapshotModel.deleteMany({
      submittedBy: superAdmin._id,
      mainCategory: 'food',
      submittedByName: { $regex: /^E2E-FIXTURE/ },
    });

    await InventorySnapshotModel.create({
      snapshotDate,
      mainCategory: 'food',
      submittedAt: new Date(),
      submittedBy: superAdmin._id,
      submittedByName: 'E2E-FIXTURE Snapshot Seeder',
      status: 'pending',
      items: [
        {
          menuItemId: foodMenuItem._id,
          menuItemName: foodMenuItem.name,
          inventoryId: inventoryForItem?._id,
          mainCategory: 'food',
          category: foodMenuItem.category || 'food',
          systemInventoryCount: 50,
          todaySalesCount: 0,
          staffConfirmed: false,
          discrepancy: 0,
          requiresAdjustment: false,
          locationBreakdown: [],
        },
      ],
    });
    console.log('✓ Seeded 1 inventory snapshot (food / pending)');

    // ── Expense ───────────────────────────────────────────────────────────
    // Idempotent via deletion of the fixture's distinctive description.
    const EXPENSE_DESC = 'E2E-FIXTURE Seed expense';
    await ExpenseModel.deleteMany({ description: EXPENSE_DESC });

    await ExpenseModel.create({
      date: new Date(),
      expenseType: 'operating-expense',
      category: 'Utilities',
      description: EXPENSE_DESC,
      amount: 1000,
      transactionFee: 0,
      createdBy: superAdmin._id,
    });
    console.log('✓ Seeded 1 expense (operating / Utilities / ₦1,000)');

    console.log('\n✅ E2E fixtures seeded.');
  } finally {
    await mongoose.connection.close();
  }
}

seedE2eFixtures().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
