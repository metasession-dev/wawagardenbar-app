/**
 * Seed test logins on the ostendo-server k3s UAT database.
 *
 * Why: `sync-prod-to-ostendo-uat.sh` replaces the UAT database with production
 * (`--drop`), so every staff account on UAT becomes a production account and
 * every UAT test account is lost. This script puts a fixed set of UAT-only
 * logins back so UAT testing (manual, or agent-run) never needs a production
 * password.
 *
 * Accounts (usernames are fixed; passwords live in `.env.uat.local`):
 *   uat-test-admin       role admin
 *   uat-test-csr         role csr
 *   uat-test-superadmin  role super-admin
 *   a verified customer on UAT_CUSTOMER_PHONE (only created if no account has
 *   that number yet; an existing account is never modified). A customer signs
 *   in with the WhatsApp PIN, so there is no password for it.
 *
 * Credentials: read from `.env.uat.local` (gitignored). A missing password is
 * generated and appended to that file; the script never prints a password.
 *   UAT_TEST_ADMIN_USERNAME / UAT_TEST_ADMIN_PASSWORD
 *   UAT_TEST_CSR_USERNAME / UAT_TEST_CSR_PASSWORD
 *   UAT_TEST_SUPERADMIN_USERNAME / UAT_TEST_SUPERADMIN_PASSWORD
 *
 * Safety: refuses to run unless MONGODB_DB_NAME contains "uat", so it cannot
 * create logins in the production database. Idempotent: it deletes and
 * recreates only the three `uat-test-*` usernames.
 *
 * Run (normally called by sync-prod-to-ostendo-uat.sh; standalone through
 * scripts/seed-uat-test-users.sh, which opens the port-forward):
 *   MONGODB_URI=... MONGODB_DB_NAME=wawagardenbar_uat npx tsx scripts/seed-uat-test-users.ts
 *   npx tsx scripts/seed-uat-test-users.ts --creds-only   # only write missing credentials, no database
 */
import { randomBytes } from 'crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ENV_FILE = resolve(__dirname, '..', '.env.uat.local');
const CREDS_ONLY = process.argv.includes('--creds-only');

interface Spec {
  key: 'ADMIN' | 'CSR' | 'SUPERADMIN';
  username: string;
  role: 'admin' | 'csr' | 'super-admin';
  firstName: string;
  lastName: string;
}

const SPECS: Spec[] = [
  {
    key: 'ADMIN',
    username: 'uat-test-admin',
    role: 'admin',
    firstName: 'UAT',
    lastName: 'Admin',
  },
  {
    key: 'CSR',
    username: 'uat-test-csr',
    role: 'csr',
    firstName: 'UAT',
    lastName: 'CSR',
  },
  {
    key: 'SUPERADMIN',
    username: 'uat-test-superadmin',
    role: 'super-admin',
    firstName: 'UAT',
    lastName: 'SuperAdmin',
  },
];

function readEnvFile(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(ENV_FILE)) return out;
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

/** Meets the admin password rules: upper, lower, digit and symbol, 20+ characters. */
function generatePassword(): string {
  return `Uat!${randomBytes(12).toString('base64url')}9a`;
}

/** Make sure every username and password is in `.env.uat.local`; return them. */
function ensureCredentials(): Record<
  string,
  { username: string; password: string }
> {
  const env = readEnvFile();
  const additions: string[] = [];
  const result: Record<string, { username: string; password: string }> = {};
  for (const spec of SPECS) {
    const uKey = `UAT_TEST_${spec.key}_USERNAME`;
    const pKey = `UAT_TEST_${spec.key}_PASSWORD`;
    const username = env[uKey] || spec.username;
    let password = env[pKey];
    if (!env[uKey]) additions.push(`${uKey}=${username}`);
    if (!password) {
      password = generatePassword();
      additions.push(`${pKey}=${password}`);
    }
    result[spec.key] = { username, password };
  }
  if (additions.length > 0) {
    const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
    const lead = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    const header = existing.includes('# UAT test logins')
      ? ''
      : '\n# UAT test logins (seed-uat-test-users.ts; UAT only)\n';
    if (!existsSync(ENV_FILE)) writeFileSync(ENV_FILE, '', { mode: 0o600 });
    appendFileSync(ENV_FILE, `${lead}${header}${additions.join('\n')}\n`);
    console.log(
      `Wrote ${additions.length} missing UAT test login value(s) to .env.uat.local (values not shown).`
    );
  }
  return result;
}

async function main() {
  const creds = ensureCredentials();
  if (CREDS_ONLY) {
    console.log(
      'Credentials are in .env.uat.local; database not touched (--creds-only).'
    );
    return;
  }

  const dbName = process.env.MONGODB_DB_NAME ?? '';
  if (!/uat/i.test(dbName)) {
    throw new Error(
      `Refusing to run: MONGODB_DB_NAME "${dbName}" does not look like a UAT database.`
    );
  }

  const { connectDB } = await import('../lib/mongodb');
  const { AdminService } = await import('../services/admin-service');
  const { UserModel } = await import('../models');
  const { normalizePhone, phoneLookupVariants } = await import(
    '../lib/auth-utils'
  );

  await connectDB();

  let system = await UserModel.findOne({ email: 'system@wawagardenbar.com' });
  if (!system) {
    system = await UserModel.create({
      email: 'system@wawagardenbar.com',
      firstName: 'System',
      lastName: 'User',
      role: 'super-admin',
      isAdmin: false,
      accountStatus: 'active',
      emailVerified: true,
      phoneVerified: false,
      phone: `system_${Date.now()}`,
    });
  }
  const createdBy = system._id.toString();

  for (const spec of SPECS) {
    const { username, password } = creds[spec.key];
    await UserModel.deleteMany({ username });
    await AdminService.createAdmin({
      username,
      password,
      email: `${username}@test.wawagardenbar.com`,
      firstName: spec.firstName,
      lastName: spec.lastName,
      role: spec.role,
      createdBy,
      ...(spec.role === 'admin'
        ? {
            permissions: {
              orderManagement: true,
              menuManagement: true,
              inventoryManagement: true,
              rewardsAndLoyalty: true,
              reportsAndAnalytics: true,
              expensesManagement: true,
              settingsAndConfiguration: true,
              kitchenManagement: true,
              incidentsAccess: true,
            },
          }
        : {}),
      ...(spec.role === 'csr'
        ? {
            permissions: {
              orderManagement: true,
              menuManagement: false,
              inventoryManagement: false,
              rewardsAndLoyalty: true,
              reportsAndAnalytics: false,
              expensesManagement: false,
              settingsAndConfiguration: false,
              kitchenManagement: false,
              incidentsAccess: true,
            },
          }
        : {}),
    });
    // A test login must be usable straight away, with no forced password change.
    await UserModel.updateOne(
      { username },
      { $set: { mustChangePassword: false, failedLoginAttempts: 0 } }
    );
    console.log(`Seeded ${spec.role}: ${username}`);
  }

  // The test customer: created only if nobody has this number yet.
  const rawPhone = readEnvFile().UAT_CUSTOMER_PHONE;
  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    const existing = await UserModel.findOne({
      phone: { $in: phoneLookupVariants(phone) },
    });
    if (existing) {
      console.log(
        'Test customer number already has an account; left unchanged.'
      );
    } else {
      await UserModel.collection.insertOne({
        phone,
        email: 'uat-test-customer@test.wawagardenbar.com',
        name: 'UAT Test Customer',
        firstName: 'UAT',
        lastName: 'Customer',
        role: 'customer',
        isAdmin: false,
        isGuest: false,
        phoneVerified: true,
        emailVerified: true,
        isVerified: true,
        accountStatus: 'active',
        lastLoginAt: new Date(),
        totalSpent: 0,
        totalOrders: 0,
        rewardsEarned: 0,
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(
        'Seeded customer on UAT_CUSTOMER_PHONE (signs in with the WhatsApp PIN).'
      );
    }
  } else {
    console.log(
      'UAT_CUSTOMER_PHONE not set in .env.uat.local; no test customer seeded.'
    );
  }

  console.log(
    'UAT test users seeded. Logins are in .env.uat.local (UAT_TEST_*).'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      'Error seeding UAT test users:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
