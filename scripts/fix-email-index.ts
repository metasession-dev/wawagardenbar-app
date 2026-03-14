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
import UserModel from '../models/user-model';
import mongoose from 'mongoose';

async function fixEmailIndex() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    
    console.log('Cleaning up null emails...');
    // Unset email field where it is null
    const result = await UserModel.updateMany(
      { email: null },
      { $unset: { email: "" } }
    );
    
    console.log(`Unset email for ${result.modifiedCount} users.`);

    console.log('Dropping email index...');
    try {
      await mongoose.connection.collection('users').dropIndex('email_1');
      console.log('Email index dropped.');
    } catch (e: any) {
        if (e.codeName === 'IndexNotFound') {
            console.log('Index email_1 not found, skipping drop.');
        } else {
            console.error('Error dropping index:', e);
        }
    }

    console.log('Recreating indexes...');
    // This will trigger Mongoose to recreate indexes based on schema
    await UserModel.syncIndexes();
    console.log('Indexes synced.');

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing email index:', error);
    process.exit(1);
  }
}

fixEmailIndex();
