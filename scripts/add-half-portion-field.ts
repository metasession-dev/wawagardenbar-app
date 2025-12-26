// IMPORTANT: Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const result = config({ path: envPath });

if (result.error) {
  console.error('⚠️  Warning: Could not load .env.local file');
  console.error('   Path:', envPath);
  console.error('   Error:', result.error.message);
  process.exit(1);
}

// Now import modules that depend on environment variables
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';

/**
 * Migration script to add halfPortionEnabled field to existing menu items
 * This script adds the new field with a default value of false
 */
async function addHalfPortionField() {
  try {
    console.log('🔧 Connecting to database...');
    await connectDB();

    console.log('📝 Adding halfPortionEnabled field to menu items...');

    // Update all menu items that don't have the halfPortionEnabled field
    const result = await MenuItemModel.updateMany(
      { halfPortionEnabled: { $exists: false } },
      { $set: { halfPortionEnabled: false } }
    );

    console.log(`✅ Updated ${result.modifiedCount} menu items`);

    // Show summary of menu items by category
    const foodItems = await MenuItemModel.countDocuments({ mainCategory: 'food' });
    const drinkItems = await MenuItemModel.countDocuments({ mainCategory: 'drinks' });

    console.log('\n📊 Summary:');
    console.log(`   Food items: ${foodItems} (eligible for half-portion)`);
    console.log(`   Drink items: ${drinkItems} (not eligible)`);
    console.log(`   Total items: ${foodItems + drinkItems}`);

    console.log('\n✨ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Admins can now enable half-portion for food items via dashboard');
    console.log('   2. Customers will see portion selector for enabled items');
    console.log('   3. Inventory will track fractional quantities (0.5 for half portions)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addHalfPortionField();
