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

import { connectDB, disconnectFromDatabase } from '../lib/mongodb';
import { UserModel } from '../models';
import { maskPhone, planPhoneMigration } from '../lib/phone-migration';

/**
 * Migration (REQ-115, ADR-006): normalise `users.phone` to E.164 with a
 * leading `+` (default country NG).
 *
 * - Dry-run by default. Pass `--apply` to write.
 * - Never merges or deletes accounts. Two accounts that normalise to the same
 *   number are reported as duplicates and left exactly as they are.
 * - Writes a before/after file (`phone-migration-<timestamp>.json`, in the
 *   directory given by `--out`, default the current directory). Keep it: it
 *   is the rollback record. It contains full phone numbers, so store it as
 *   restricted evidence, not in git. The console report masks numbers.
 *
 * Usage:
 *   npx tsx scripts/migrate-normalize-phones.ts            # dry run
 *   npx tsx scripts/migrate-normalize-phones.ts --apply    # write changes
 *   npx tsx scripts/migrate-normalize-phones.ts --out ./evidence
 */
async function migrateNormalizePhones(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const outIndex = process.argv.indexOf('--out');
  const outDir = path.resolve(
    outIndex >= 0 && process.argv[outIndex + 1]
      ? process.argv[outIndex + 1]
      : '.'
  );

  console.log(`📞 Phone normalisation (${apply ? 'APPLY' : 'dry run'})\n`);
  await connectDB();

  const users = await UserModel.find({
    phone: { $exists: true, $nin: [null, ''] },
  })
    .select('_id phone')
    .lean<Array<{ _id: { toString(): string }; phone?: string }>>();

  const plan = planPhoneMigration(
    users.map((user) => ({ id: user._id.toString(), phone: user.phone }))
  );

  console.log(`   Users with a phone:      ${plan.total}`);
  console.log(`   Already canonical:       ${plan.alreadyCanonical}`);
  console.log(`   To rewrite:              ${plan.updates.length}`);
  console.log(
    `   Duplicate groups:        ${plan.duplicates.length} (reported, NOT changed)`
  );
  console.log(
    `   Unusable values:         ${plan.unusable.length} (reported, NOT changed)\n`
  );

  for (const group of plan.duplicates) {
    console.log(
      `   ⚠️  ${maskPhone(group.canonical)} is shared by ${group.accounts.length} accounts:`
    );
    for (const account of group.accounts) {
      console.log(
        `        ${account.id}  stored as ${maskPhone(account.phone)}`
      );
    }
  }
  for (const item of plan.unusable) {
    console.log(`   ⚠️  ${item.id}: unusable phone value`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(outDir, `phone-migration-${stamp}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        ranAt: new Date().toISOString(),
        ...plan,
      },
      null,
      2
    )
  );
  console.log(`\n   Before/after record written to ${file}`);

  if (!apply) {
    console.log('\n   Dry run only. Re-run with --apply to write the changes.');
    return;
  }

  let written = 0;
  let failed = 0;
  for (const update of plan.updates) {
    try {
      // Guard on the old value so a concurrent change is never overwritten.
      const result = await UserModel.updateOne(
        { _id: update.id, phone: update.before },
        { $set: { phone: update.after } }
      );
      if (result.modifiedCount === 1) written++;
    } catch (error) {
      failed++;
      console.error(
        `   ❌ ${update.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  console.log(`\n✅ Rewrote ${written} phone(s); ${failed} failed.`);
}

migrateNormalizePhones()
  .catch((error) => {
    console.error('Phone normalisation failed:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectFromDatabase());
