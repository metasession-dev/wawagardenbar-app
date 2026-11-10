import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(
    'No .env or .env.local file found — relying on process env vars'
  );
}

import { connectDB } from '../lib/mongodb';
import Order from '../models/order-model';
import { runOrderOriginMigration } from '../lib/order-origin-migration';

/**
 * Migration (REQ-120, ADR-010): set `origin` on existing orders.
 *
 * - Dry-run by default. Pass `--apply` to write.
 * - Idempotent: only orders with no `origin` are written.
 * - `createdByRole: customer` (or missing) → `customer`; anything else → `staff`.
 * - The application treats a missing `origin` as unknown and the schema
 *   defaults new documents to `staff`, so it is correct before, during and
 *   after this migration.
 *
 * Usage:
 *   npx tsx scripts/migrate-order-origin.ts            # dry run
 *   npx tsx scripts/migrate-order-origin.ts --apply    # write changes
 */
async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  console.log(`🧾 Order origin migration (${apply ? 'APPLY' : 'dry run'})\n`);
  await connectDB();

  const result = await runOrderOriginMigration(Order.collection as never, {
    apply,
  });
  console.log(
    `${apply ? 'Updated' : 'Would update'}: ${result.customer} customer, ${result.staff} staff orders`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
