/**
 * Migration Script: Add mainCategory to Inventory Snapshots
 * 
 * This script:
 * 1. Drops the old unique index (snapshotDate + submittedBy)
 * 2. Adds mainCategory field to existing snapshots (defaults to 'food')
 * 3. Creates new unique index (snapshotDate + mainCategory + submittedBy)
 * 
 * Run with: npx tsx scripts/migrate-inventory-snapshots.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function migrateInventorySnapshots() {
  try {
    console.log('🔄 Starting inventory snapshots migration...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the collection
    const collection = mongoose.connection.collection('inventorysnapshots');

    // Step 1: Drop old unique index
    console.log('📋 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name).join(', '));

    const oldIndexName = 'snapshotDate_1_submittedBy_1';
    const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);

    if (hasOldIndex) {
      console.log(`\n🗑️  Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log('✅ Old index dropped successfully');
    } else {
      console.log(`\nℹ️  Old index ${oldIndexName} not found (already dropped)`);
    }

    // Step 2: Add mainCategory to existing documents
    console.log('\n📝 Updating existing snapshots with mainCategory field...');
    
    const snapshotsWithoutCategory = await collection.countDocuments({
      mainCategory: { $exists: false }
    });

    if (snapshotsWithoutCategory > 0) {
      console.log(`Found ${snapshotsWithoutCategory} snapshots without mainCategory`);
      
      // Update all existing snapshots to have mainCategory: 'food' as default
      const updateResult = await collection.updateMany(
        { mainCategory: { $exists: false } },
        { $set: { mainCategory: 'food' } }
      );

      console.log(`✅ Updated ${updateResult.modifiedCount} snapshots with mainCategory: 'food'`);
    } else {
      console.log('ℹ️  All snapshots already have mainCategory field');
    }

    // Step 3: Create new unique index
    console.log('\n🔧 Creating new unique index (snapshotDate + mainCategory + submittedBy)...');
    
    try {
      await collection.createIndex(
        { snapshotDate: 1, mainCategory: 1, submittedBy: 1 },
        { unique: true }
      );
      console.log('✅ New unique index created successfully');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️  Index already exists');
      } else {
        throw error;
      }
    }

    // Verify final state
    console.log('\n📊 Final verification...');
    const finalIndexes = await collection.indexes();
    console.log('Current indexes:');
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    const totalSnapshots = await collection.countDocuments();
    const snapshotsWithCategory = await collection.countDocuments({
      mainCategory: { $exists: true }
    });

    console.log(`\n📈 Statistics:`);
    console.log(`  Total snapshots: ${totalSnapshots}`);
    console.log(`  Snapshots with mainCategory: ${snapshotsWithCategory}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  Note: If you have duplicate snapshots for the same date/user,');
    console.log('   you may need to manually review and delete duplicates before');
    console.log('   the new unique index can be enforced properly.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateInventorySnapshots()
  .then(() => {
    console.log('\n🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
