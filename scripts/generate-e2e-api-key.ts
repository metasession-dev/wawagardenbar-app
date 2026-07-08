/**
 * Generate a PUBLIC_API_KEY for E2E tests.
 *
 * Creates an API key with customer-level scopes (orders:write, menu:read, etc.)
 * and prints the plain key to stdout. Add the printed key to .env.local as:
 *
 *   PUBLIC_API_KEY=<printed key>
 *
 * Run with:  npx tsx scripts/generate-e2e-api-key.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { connectDB } from '../lib/mongodb';
import { ApiKeyService } from '../services/api-key-service';
import { UserModel } from '../models';

async function generate(): Promise<void> {
  try {
    await connectDB();

    const systemUser = await UserModel.findOne({
      email: 'system@wawagardenbar.com',
    });

    if (!systemUser) {
      console.error(
        'System user not found. Run scripts/seed-e2e-admins.ts first.'
      );
      process.exit(1);
    }

    const existing = await ApiKeyService.listKeys({
      createdBy: systemUser._id.toString(),
      includeInactive: true,
    });

    const e2eKey = existing.find((k) => k.name === 'E2E Public API Key');

    if (e2eKey) {
      await ApiKeyService.revokeKey(e2eKey._id, systemUser._id.toString());
      await ApiKeyService.deleteKey(e2eKey._id);
      console.log('Revoked existing E2E Public API Key.');
    }

    const { plainKey } = await ApiKeyService.createKey(
      {
        name: 'E2E Public API Key',
        role: 'customer',
        scopes: [
          'menu:read',
          'orders:read',
          'orders:write',
          'payments:read',
          'rewards:read',
          'tabs:read',
        ],
        rateLimit: 200,
      },
      systemUser._id.toString()
    );

    console.log('\nAdd this to .env.local:\n');
    console.log(`PUBLIC_API_KEY=${plainKey}\n`);

    process.exit(0);
  } catch (error: unknown) {
    console.error(
      'Error generating E2E API key:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

generate();
