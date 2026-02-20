import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local (or .env as fallback)
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
import InventoryModel from '../models/inventory-model';

/**
 * Migration script to prepare existing inventory items for location tracking
 * This script adds the new location tracking fields with default values
 */
async function migrateLocationTracking() {
  try {
    await connectDB();
    
    console.log('Starting location tracking migration...');
    
    // Find all inventory items that don't have location tracking enabled
    const inventories = await InventoryModel.find({ 
      trackByLocation: { $ne: true } 
    });
    
    console.log(`Found ${inventories.length} inventory items to migrate`);
    
    const defaultLocation = 'store';
    let migrated = 0;
    
    for (const inventory of inventories) {
      // Set default values for location tracking fields
      inventory.trackByLocation = false;
      inventory.locations = [];
      inventory.defaultReceivingLocation = defaultLocation;
      inventory.defaultSalesLocation = defaultLocation;
      
      await inventory.save();
      migrated++;
      
      if (migrated % 10 === 0) {
        console.log(`Migrated ${migrated}/${inventories.length} items...`);
      }
    }
    
    console.log(`✓ Successfully migrated ${migrated} inventory items`);
    console.log('Migration complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateLocationTracking();
