import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '@/models/user-model';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { ExpenseModel } from '@/models/expense-model';
import { InventorySnapshotModel } from '@/models/inventory-snapshot-model';
import SystemSettingsModel from '@/models/system-settings-model';
import OrderModel from '@/models/order-model';

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

    // ── Profitability report ─────────────────────────────────────────────
    // REQ-094 AC3 must prove the category filter scopes an actual report,
    // rather than only proving that its select control accepts a value.
    // Keep one paid, sale-time-attributed Local Beer order in today's report
    // range. It is replaced by its stable order number on every seed run.
    const localBeer = await MenuItemModel.findOne({ category: 'beer-local' });
    if (!localBeer) {
      throw new Error(
        'No Local Beer menu item found. Run seed-drinks-menu.ts first.'
      );
    }
    const reportOrderNumber = 'E2E-PRF-094';
    const price = localBeer.price ?? 1500;
    const cost = localBeer.costPerUnit ?? 0;
    await OrderModel.deleteOne({ orderNumber: reportOrderNumber });
    await OrderModel.create({
      orderNumber: reportOrderNumber,
      orderType: 'pickup',
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paidAt: new Date(),
      businessDate: new Date(),
      createdByRole: 'admin',
      estimatedWaitTime: 0,
      items: [
        {
          menuItemId: localBeer._id,
          name: localBeer.name,
          price,
          quantity: 1,
          portionSize: 'full',
          subtotal: price,
          costPerUnit: cost,
          totalCost: cost,
          grossProfit: price - cost,
          profitMargin: price > 0 ? ((price - cost) / price) * 100 : 0,
          mainCategoryAtSale: localBeer.mainCategory,
          categoryAtSale: 'beer-local',
          categoryAtSaleSource: 'sale_time',
        },
      ],
      subtotal: price,
      total: price,
      totalCost: cost,
      grossProfit: price - cost,
      profitMargin: price > 0 ? ((price - cost) / price) * 100 : 0,
      operationalCosts: { delivery: 0, packaging: 0, processing: 0 },
    });
    console.log(
      '✓ Seeded 1 paid Local Beer order for REQ-094 profitability evidence'
    );

    // ── trackByLocation inventory ──────────────────────────────────────────
    // REQ-066 AC8 + AC9 specs (sale-point + over-sell) look up an
    // Inventory document with: trackByLocation true + ≥2 locations +
    // total stock ≥ 2. Specs MUTATE the document during their run
    // (force one location empty, set defaultSalesLocation, etc.) — CI
    // runs against a fresh Mongo each time so mutation persistence
    // doesn't matter; the seed only needs to exist on first run.
    //
    // Idempotent via deletion by menuItemId before re-create.
    const E2E_TBL_NAME_HINT = 'E2E-FIXTURE Track-By-Location';

    // Pick (or create) a dedicated menu item so the seeded inventory
    // doesn't conflict with the existing menu's stock-tracked items.
    let trackedMenuItem = await MenuItemModel.findOne({
      name: E2E_TBL_NAME_HINT,
    });
    if (!trackedMenuItem) {
      trackedMenuItem = await MenuItemModel.create({
        kind: 'menu-item',
        name: E2E_TBL_NAME_HINT,
        description: 'E2E fixture menu item for REQ-066 AC8/AC9 specs',
        mainCategory: 'food',
        category: foodMenuItem.category || 'food',
        price: 1000,
        costPerUnit: 400,
        preparationTime: 1,
        isAvailable: false, // hidden from customer menu
        trackInventory: true,
      });
    }

    await InventoryModel.deleteMany({ menuItemId: trackedMenuItem._id });

    await InventoryModel.create({
      menuItemId: trackedMenuItem._id,
      currentStock: 10, // overwritten by pre-save hook from locations sum
      minimumStock: 1,
      maximumStock: 50,
      unit: 'unit',
      costPerUnit: 400, // schema-required (matches trackedMenuItem.costPerUnit)
      supplier: 'E2E Fixture Supplier',
      trackByLocation: true,
      locations: [
        {
          location: 'main-bar',
          locationName: 'Main Bar',
          currentStock: 5,
          minimumStock: 1,
        },
        {
          location: 'kitchen',
          locationName: 'Kitchen',
          currentStock: 5,
          minimumStock: 1,
        },
      ],
      defaultSalesLocation: 'main-bar',
      preventOrdersWhenOutOfStock: false,
    });
    console.log(
      '✓ Seeded 1 trackByLocation inventory (2 locations × 5 stock = 10 total) for REQ-066 AC8/AC9 specs'
    );

    // ── Payment gateway settings (REQ-069 signature-verification specs) ───
    // `PaystackService.getConfig` + `MonnifyService.getConfig` read secrets
    // from the `payment-gateway-config` SystemSettings document, NOT env
    // vars directly. The webhook signature-rejection specs (REQ-069 /
    // SRS REQ-PAY-002) hit `/api/webhooks/{paystack,monnify}` with bad
    // signatures and expect a 401. Without configured secrets, the route
    // handlers throw "Paystack/Monnify secret key is not configured" and
    // surface as 500. Seed from CI env vars so the validation path
    // actually runs.
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
    const paystackPublic = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_e2e';
    if (paystackSecret) {
      await SystemSettingsModel.findOneAndUpdate(
        { key: 'payment-gateway-config' },
        {
          $set: {
            value: {
              activeProvider: 'monnify',
              paystack: {
                enabled: true,
                mode: 'test',
                publicKey: paystackPublic,
                secretKey: paystackSecret,
              },
              monnify: { enabled: true },
            },
            updatedBy: superAdmin._id,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      console.log(
        '✓ Seeded payment-gateway-config (paystack secret from env) for REQ-069 signature specs'
      );
    } else {
      console.log(
        '⚠️  PAYSTACK_SECRET_KEY env var missing — REQ-069 paystack specs will fail with 500 not 401'
      );
    }

    console.log('\n✅ E2E fixtures seeded.');
  } finally {
    await mongoose.connection.close();
  }
}

seedE2eFixtures().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
