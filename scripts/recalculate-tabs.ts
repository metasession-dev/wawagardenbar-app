import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import TabModel from '../models/tab-model';
import { TabService } from '../services/tab-service';

/**
 * Recalculate all open tabs with current settings
 * This is useful after changing service fee or tax settings
 */
async function recalculateTabs() {
  try {
    await connectDB();

    // Find all open tabs
    const openTabs = await TabModel.find({ status: 'open' });

    console.log(`Found ${openTabs.length} open tabs to recalculate`);

    for (const tab of openTabs) {
      console.log(`\nRecalculating Tab #${tab.tabNumber} (${tab._id})`);
      console.log(`  Before: Subtotal=₦${tab.subtotal}, ServiceFee=₦${tab.serviceFee}, Tax=₦${tab.tax}, Total=₦${tab.total}`);

      try {
        await TabService.recalculateTabTotals(tab._id.toString());
        
        // Fetch updated tab
        const updatedTab = await TabModel.findById(tab._id);
        if (updatedTab) {
          console.log(`  After:  Subtotal=₦${updatedTab.subtotal}, ServiceFee=₦${updatedTab.serviceFee}, Tax=₦${updatedTab.tax}, Total=₦${updatedTab.total}`);
          console.log(`  ✅ Successfully recalculated`);
        }
      } catch (error: any) {
        console.error(`  ❌ Error recalculating tab: ${error.message}`);
      }
    }

    console.log(`\n✅ Finished recalculating ${openTabs.length} tabs`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recalculateTabs();
