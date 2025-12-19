import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../lib/mongodb';
import MenuItemModel from '../models/menu-item-model';
import InventoryModel from '../models/inventory-model';

async function linkMenuToInventory() {
  try {
    console.log('🔗 Linking menu items to inventory records...\n');

    await connectToDatabase();

    // Get all inventory records
    const inventoryRecords = await InventoryModel.find();
    console.log(`📦 Found ${inventoryRecords.length} inventory records\n`);

    let linked = 0;
    let alreadyLinked = 0;
    let errors = 0;

    for (const inventory of inventoryRecords) {
      try {
        // Find the menu item
        const menuItem = await MenuItemModel.findById(inventory.menuItemId);

        if (!menuItem) {
          console.log(`❌ No menu item found for inventory ${inventory._id}`);
          errors++;
          continue;
        }

        // Check if already linked
        if (
          menuItem.trackInventory === true &&
          menuItem.inventoryId?.toString() === inventory._id.toString()
        ) {
          console.log(`✅ ${menuItem.name}: Already linked`);
          alreadyLinked++;
          continue;
        }

        // Link the menu item to inventory
        menuItem.trackInventory = true;
        menuItem.inventoryId = inventory._id.toString();
        await menuItem.save();

        console.log(`🔗 ${menuItem.name}: Linked to inventory (${inventory.currentStock} ${inventory.unit})`);
        linked++;
      } catch (error) {
        console.error(`❌ Error processing inventory ${inventory._id}:`, error);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Newly linked: ${linked}`);
    console.log(`   Already linked: ${alreadyLinked}`);
    console.log(`   Errors: ${errors}`);

    console.log('\n✅ Linking complete!');
    console.log('   Menu items are now configured to track inventory.');
    console.log('   Future orders will automatically deduct stock.\n');

    await disconnectFromDatabase();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

linkMenuToInventory();
