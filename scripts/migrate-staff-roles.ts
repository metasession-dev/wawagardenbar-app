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
import { UserModel } from '../models';
import { planStaffRolesMigration } from '../lib/staff-roles-migration';

/**
 * Migration (REQ-119, ADR-009): give every staff user `roles = [role]`.
 *
 * - Dry-run by default. Pass `--apply` to write.
 * - Idempotent: only users whose `roles` is empty or missing are written, and
 *   the write is guarded by the same condition, so a second run (or a run
 *   racing a role edit) changes nothing.
 * - Never changes `role` and never touches customers.
 * - The application reads `[role]` when `roles` is missing, so it is correct
 *   before, during and after this migration.
 * - Writes `staff-roles-migration-<timestamp>.json` (the list of ids and the
 *   roles written) in `--out` (default the current directory) as the
 *   rollback / evidence record. It holds user ids only, no names or numbers.
 *
 * Usage:
 *   npx tsx scripts/migrate-staff-roles.ts            # dry run
 *   npx tsx scripts/migrate-staff-roles.ts --apply    # write changes
 *   npx tsx scripts/migrate-staff-roles.ts --out ./evidence
 */
async function migrateStaffRoles(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const outIndex = process.argv.indexOf('--out');
  const outDir = path.resolve(
    outIndex >= 0 && process.argv[outIndex + 1]
      ? process.argv[outIndex + 1]
      : '.'
  );

  console.log(`🔑 Staff roles migration (${apply ? 'APPLY' : 'dry run'})\n`);
  await connectDB();

  const users = await UserModel.find({})
    .select('_id role roles')
    .lean<
      Array<{ _id: { toString(): string }; role?: string; roles?: string[] }>
    >();

  const plan = planStaffRolesMigration(
    users.map((user) => ({
      id: user._id.toString(),
      role: user.role,
      roles: user.roles,
    }))
  );

  console.log(`   Users scanned:           ${plan.total}`);
  console.log(`   Customers (untouched):   ${plan.customers}`);
  console.log(`   Already have roles:      ${plan.alreadyMigrated}`);
  console.log(`   To write roles = [role]: ${plan.updates.length}`);
  console.log(
    `   Unknown role values:     ${plan.unknown.length} (reported, NOT changed)\n`
  );
  for (const entry of plan.unknown) {
    console.log(`   ⚠️  ${entry.id} has role ${JSON.stringify(entry.role)}`);
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  if (plan.updates.length > 0) {
    const result = await UserModel.bulkWrite(
      plan.updates.map((update) => ({
        updateOne: {
          // Guard: only while roles is still empty, so reruns are no-ops.
          filter: {
            _id: update.id,
            $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }],
          },
          update: { $set: { roles: update.roles } },
        },
      }))
    );
    console.log(`\n✅ Updated ${result.modifiedCount} user(s).`);
  } else {
    console.log('\n✅ Nothing to update.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(outDir, `staff-roles-migration-${stamp}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        appliedAt: new Date().toISOString(),
        updated: plan.updates,
        unknown: plan.unknown,
      },
      null,
      2
    )
  );
  console.log(`   Record written: ${file}`);
}

migrateStaffRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Staff roles migration failed:', error);
    process.exit(1);
  });
