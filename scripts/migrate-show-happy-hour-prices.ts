import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';

/**
 * REQ-102 migration: backfill `showPrice` and `happyHourPrice` on every
 * existing MenuItem document so both required fields are populated before
 * any read path (order creation, public menu display) relies on them.
 *
 * Each field is independently backfilled to the item's current `price` —
 * matching the "no window enabled yet" default behaviour (default price
 * used everywhere until an operator explicitly sets show/happy-hour
 * pricing and enables a window in Settings).
 *
 * Run with: npx tsx scripts/migrate-show-happy-hour-prices.ts
 */
async function migrate() {
  console.log('🚀 Starting show/happy-hour price backfill (REQ-102)...\n');

  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    console.log('📋 Backfilling menu items missing showPrice...');
    const showPriceItems = await MenuItemModel.find({
      showPrice: { $exists: false },
    }).lean();
    for (const item of showPriceItems) {
      await MenuItemModel.updateOne(
        { _id: item._id },
        { $set: { showPrice: item.price } }
      );
    }
    console.log(
      `✅ Backfilled showPrice on ${showPriceItems.length} menu items\n`
    );

    console.log('📋 Backfilling menu items missing happyHourPrice...');
    const happyHourItems = await MenuItemModel.find({
      happyHourPrice: { $exists: false },
    }).lean();
    for (const item of happyHourItems) {
      await MenuItemModel.updateOne(
        { _id: item._id },
        { $set: { happyHourPrice: item.price } }
      );
    }
    console.log(
      `✅ Backfilled happyHourPrice on ${happyHourItems.length} menu items\n`
    );

    console.log('📋 Verifying migration...');
    const totalMenuItems = await MenuItemModel.countDocuments();
    const withShowPrice = await MenuItemModel.countDocuments({
      showPrice: { $exists: true },
    });
    const withHappyHourPrice = await MenuItemModel.countDocuments({
      happyHourPrice: { $exists: true },
    });
    console.log(
      `Menu Items: ${withShowPrice}/${totalMenuItems} have showPrice`
    );
    console.log(
      `Menu Items: ${withHappyHourPrice}/${totalMenuItems} have happyHourPrice`
    );

    if (
      withShowPrice !== totalMenuItems ||
      withHappyHourPrice !== totalMenuItems
    ) {
      throw new Error(
        'Migration incomplete: some menu items still missing showPrice/happyHourPrice.'
      );
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - showPrice backfilled: ${showPriceItems.length}`);
    console.log(`   - happyHourPrice backfilled: ${happyHourItems.length}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
