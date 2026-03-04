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
  console.warn('No .env or .env.local file found — relying on process env vars');
}

import { connectDB, disconnectFromDatabase } from '../lib/mongodb';
import ApiKeyModel from '../models/api-key-model';

/**
 * Migration: Add tabs:read and tabs:write scopes to existing API keys.
 *
 * This migration adds the new tab management scopes to API keys that already
 * have broad read/write access. Specifically:
 *
 * - Keys with `orders:read` get `tabs:read` (if not already present)
 * - Keys with `orders:write` get `tabs:write` (if not already present)
 * - Keys with `analytics:read` get `tabs:read` (if not already present)
 *
 * This is additive only — no scopes are removed.
 */
async function migrateApiKeyScopes(): Promise<void> {
  console.log('🔑 Starting API key scope migration...\n');

  await connectDB();

  const allKeys = await ApiKeyModel.find({ isActive: true }).select('+keyHash');
  console.log(`   Found ${allKeys.length} active API key(s)\n`);

  let updatedCount = 0;

  for (const key of allKeys) {
    const scopesBefore = [...key.scopes];
    let modified = false;

    // Keys with orders:read or analytics:read should get tabs:read
    if (
      (key.scopes.includes('orders:read') || key.scopes.includes('analytics:read')) &&
      !key.scopes.includes('tabs:read')
    ) {
      key.scopes.push('tabs:read');
      modified = true;
    }

    // Keys with orders:write should get tabs:write
    if (key.scopes.includes('orders:write') && !key.scopes.includes('tabs:write')) {
      key.scopes.push('tabs:write');
      modified = true;
    }

    if (modified) {
      await key.save();
      updatedCount++;
      console.log(`   ✅ Updated key "${key.name}" (${key.keyPrefix}...)`);
      console.log(`      Before: [${scopesBefore.join(', ')}]`);
      console.log(`      After:  [${key.scopes.join(', ')}]\n`);
    } else {
      console.log(`   ⏭️  Skipped key "${key.name}" (${key.keyPrefix}...) — no changes needed`);
    }
  }

  console.log(`\n🏁 Migration complete. Updated ${updatedCount} of ${allKeys.length} key(s).`);

  await disconnectFromDatabase();
}

migrateApiKeyScopes().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
