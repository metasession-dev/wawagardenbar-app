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
import { SystemSettingsService } from '../services/system-settings-service';
import mongoose from 'mongoose';

/**
 * Diagnostic and fix script for orphan stock
 * Finds items where trackByLocation=true but locations array doesn't match currentStock
 */
async function fixOrphanStock() {
  try {
    await connectDB();
    console.log('Connected to database');

    // Get system configuration
    const locConfig = await SystemSettingsService.getInventoryLocations();
    const defaultLocationId = locConfig.defaultReceivingLocation || 'store';
    
    // Find the name of the default location
    const defaultLocationObj = locConfig.locations.find(l => l.id === defaultLocationId);
    const defaultLocationName = defaultLocationObj ? defaultLocationObj.name : 'Main Store';

    console.log(`Using default location: ${defaultLocationName} (${defaultLocationId})`);

    // Find all inventory items with location tracking enabled
    const inventories = await InventoryModel.find({ 
      trackByLocation: true 
    });
    
    console.log(`Found ${inventories.length} items with location tracking enabled`);
    
    let fixedCount = 0;
    
    for (const inventory of inventories) {
      const locations = inventory.locations || [];
      const locationTotal = locations.reduce((sum: number, loc: any) => sum + (loc.currentStock || 0), 0);
      const orphanStock = inventory.currentStock - locationTotal;
      
      // Allow for small floating point errors
      if (Math.abs(orphanStock) > 0.001) {
        console.log(`\nItem: ${(inventory as any).menuItemId?.name || inventory._id}`);
        console.log(`  Current Stock: ${inventory.currentStock}`);
        console.log(`  Location Total: ${locationTotal}`);
        console.log(`  Orphan Stock: ${orphanStock}`);
        
        if (orphanStock > 0) {
          // Positive orphan stock means stock exists but isn't in a location
          // Add it to the default location
          
          let targetLocation = locations.find((l: any) => l.location === defaultLocationId);
          
          if (targetLocation) {
            console.log(`  -> Adding ${orphanStock} to existing location: ${defaultLocationName}`);
            targetLocation.currentStock = (targetLocation.currentStock || 0) + orphanStock;
            targetLocation.lastUpdated = new Date();
            // Using a system ID for the update
            targetLocation.updatedBy = new mongoose.Types.ObjectId('000000000000000000000000'); 
            targetLocation.updatedByName = 'System Fix Script';
          } else {
            console.log(`  -> Creating new location entry: ${defaultLocationName} with ${orphanStock}`);
            inventory.locations.push({
              location: defaultLocationId,
              locationName: defaultLocationName,
              currentStock: orphanStock,
              lastUpdated: new Date(),
              updatedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
              updatedByName: 'System Fix Script',
            } as any);
          }
          
          await inventory.save();

          // Write to StockMovement collection
          const StockMovementModel = (await import('../models/stock-movement-model')).default;
          await StockMovementModel.create({
            inventoryId: inventory._id,
            quantity: orphanStock,
            type: 'adjustment',
            reason: `System Fix: Moved orphan stock to ${defaultLocationName}`,
            category: 'adjustment',
            location: defaultLocationId,
            performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
            performedByName: 'System Fix Script',
            timestamp: new Date(),
          });
          console.log('  ✓ Fixed');
          fixedCount++;
        } else {
          // Negative orphan stock means locations have MORE stock than the total
          // This is weirder, but we should probably trust the total? 
          // Or trust the locations and update the total?
          // For safety, let's update the main total to match the locations sum
          // because location data is more granular and likely more accurate if populated
          
          console.log(`  -> WARNING: Location sum exceeds total. Updating main total to match locations.`);
          console.log(`  -> New Total: ${locationTotal}`);
          
          inventory.currentStock = locationTotal;
          
          // Write to StockMovement collection
          const StockMovementModel2 = (await import('../models/stock-movement-model')).default;
          await StockMovementModel2.create({
            inventoryId: inventory._id,
            quantity: Math.abs(orphanStock),
            type: 'adjustment',
            reason: `System Fix: Synced total stock with location sum`,
            category: 'adjustment',
            performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
            performedByName: 'System Fix Script',
            timestamp: new Date(),
          });
          
          await inventory.save();
          console.log('  ✓ Fixed');
          fixedCount++;
        }
      }
    }
    
    console.log(`\nSummary: Fixed ${fixedCount} items with mismatched location data`);
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

fixOrphanStock();
