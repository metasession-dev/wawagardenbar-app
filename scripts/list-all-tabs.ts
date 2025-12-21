import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import TabModel from '../models/tab-model';

async function listAllTabs() {
  try {
    await connectDB();

    const tabs = await TabModel.find().sort({ createdAt: -1 }).limit(10);

    console.log(`Found ${tabs.length} recent tabs:\n`);

    for (const tab of tabs) {
      console.log(`Tab #${tab.tabNumber} (${tab._id})`);
      console.log(`  Status: ${tab.status}`);
      console.log(`  Table: ${tab.tableNumber}`);
      console.log(`  Subtotal: ₦${tab.subtotal}`);
      console.log(`  Service Fee: ₦${tab.serviceFee}`);
      console.log(`  Tax: ₦${tab.tax}`);
      console.log(`  Total: ₦${tab.total}`);
      console.log(`  Orders: ${tab.orders.length}`);
      console.log(`  Created: ${tab.createdAt}`);
      console.log('');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAllTabs();
