import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';

async function checkInventoryTracking() {
  try {
    console.log('🔍 Checking inventory tracking setup...\n');

    await connectToDatabase();

    // Get all menu items
    const menuItems = await MenuItemModel.find().lean();
    console.log(`📋 Total menu items: ${menuItems.length}\n`);

    // Get all inventory records
    const inventoryRecords = await InventoryModel.find().lean();
    console.log(`📦 Total inventory records: ${inventoryRecords.length}\n`);

    // Check each menu item
    let trackingEnabled = 0;
    let hasInventoryId = 0;
    let fullyConfigured = 0;
    const issues: string[] = [];

    for (const item of menuItems) {
      const hasTracking = item.trackInventory === true;
      const hasInvId = !!item.inventoryId;

      if (hasTracking) trackingEnabled++;
      if (hasInvId) hasInventoryId++;
      if (hasTracking && hasInvId) fullyConfigured++;

      // Report issues
      if (hasTracking && !hasInvId) {
        issues.push(`❌ ${item.name}: trackInventory=true but inventoryId is missing`);
      }
      if (!hasTracking && hasInvId) {
        issues.push(`⚠️  ${item.name}: has inventoryId but trackInventory=false`);
      }
      if (!hasTracking && !hasInvId) {
        // Check if inventory exists for this item
        const inv = inventoryRecords.find(
          (i: any) => i.menuItemId?.toString() === item._id.toString()
        );
        if (inv) {
          issues.push(
            `🔧 ${item.name}: Inventory exists but menu item not linked (inventoryId missing, trackInventory=false)`
          );
        }
      }
    }

    console.log('📊 Summary:');
    console.log(`   Items with trackInventory=true: ${trackingEnabled}`);
    console.log(`   Items with inventoryId set: ${hasInventoryId}`);
    console.log(`   Fully configured (both): ${fullyConfigured}`);
    console.log(`   Issues found: ${issues.length}\n`);

    if (issues.length > 0) {
      console.log('⚠️  Issues:\n');
      issues.forEach((issue) => console.log(`   ${issue}`));
      console.log('\n');
    }

    // Show inventory records without menu item link
    console.log('🔗 Checking inventory → menu item links:\n');
    for (const inv of inventoryRecords) {
      const menuItem = menuItems.find(
        (m: any) => m._id.toString() === inv.menuItemId?.toString()
      );

      if (!menuItem) {
        console.log(`   ❌ Inventory record ${inv._id} has invalid menuItemId: ${inv.menuItemId}`);
      } else {
        const isLinked = menuItem.inventoryId?.toString() === inv._id.toString();
        const isTracking = menuItem.trackInventory === true;

        if (!isLinked || !isTracking) {
          console.log(
            `   ⚠️  ${menuItem.name}: inventory exists but menu item not properly configured`
          );
          console.log(`      - inventoryId matches: ${isLinked}`);
          console.log(`      - trackInventory: ${isTracking}`);
        }
      }
    }

    console.log('\n✅ Check complete!');
    console.log('\n💡 To fix issues:');
    console.log('   1. Go to Dashboard → Menu');
    console.log('   2. Edit each menu item');
    console.log('   3. Enable "Track Inventory"');
    console.log('   4. Link to the correct inventory record');

    await disconnectFromDatabase();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInventoryTracking();
