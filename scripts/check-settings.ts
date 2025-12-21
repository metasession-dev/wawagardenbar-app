import { config } from 'dotenv';
config({ path: '.env.local' });

import { connectDB } from '../lib/mongodb';
import SettingsModel from '../models/settings-model';

async function checkSettings() {
  await connectDB();
  
  const settings = await SettingsModel.findOne();
  
  if (settings) {
    console.log('Current Settings:');
    console.log('  Service Fee Percentage:', settings.serviceFeePercentage, `(${(settings.serviceFeePercentage * 100).toFixed(2)}%)`);
    console.log('  Delivery Fee Base:', settings.deliveryFeeBase);
    console.log('  Delivery Fee Reduced:', settings.deliveryFeeReduced);
    console.log('  Free Delivery Threshold:', settings.freeDeliveryThreshold);
    console.log('  Tax Percentage:', settings.taxPercentage, `(${(settings.taxPercentage * 100).toFixed(2)}%)`);
    console.log('  Tax Enabled:', settings.taxEnabled);
  } else {
    console.log('No settings found in database');
  }
  
  process.exit(0);
}

checkSettings();
