/**
 * Migration script to convert halfPortionEnabled to portionOptions structure
 * Run this once to migrate existing menu items
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('No .env or .env.local file found!');
  process.exit(1);
}

import { connectDB } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';

async function migratePortionOptions() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Find all menu items that have the old halfPortionEnabled field
    const menuItems = await MenuItemModel.find({});
    console.log(`Found ${menuItems.length} menu items to check`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const item of menuItems) {
      // Check if item already has portionOptions structure
      if (item.portionOptions) {
        skippedCount++;
        continue;
      }

      // Migrate old halfPortionEnabled to new portionOptions structure
      const halfPortionEnabled = (item as any).halfPortionEnabled || false;
      
      await MenuItemModel.updateOne(
        { _id: item._id },
        {
          $set: {
            portionOptions: {
              halfPortionEnabled,
              quarterPortionEnabled: false, // Default to false for existing items
            },
          },
          $unset: {
            halfPortionEnabled: '', // Remove old field
          },
        }
      );

      migratedCount++;
      console.log(`Migrated: ${item.name} (halfPortionEnabled: ${halfPortionEnabled})`);
    }

    console.log('\nMigration complete!');
    console.log(`Migrated: ${migratedCount} items`);
    console.log(`Skipped: ${skippedCount} items (already migrated)`);
    console.log(`Total: ${menuItems.length} items`);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePortionOptions();
