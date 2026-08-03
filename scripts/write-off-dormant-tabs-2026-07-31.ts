/**
 * @requirement REQ-098 AC7 — One-time, scoped remediation for the
 * 2026-07-31 bulk manual tab-closure contamination event.
 *
 * On 2026-07-31, a bulk manual tab-closure event
 * (`TabService.completeTabPaymentManually`) retroactively marked 51
 * dormant dine-in tabs — originally opened 2025-12-25 through
 * 2026-04-27, some dormant 4+ months — as `paymentStatus: 'paid'`, all
 * stamped `paidAt` in a ~2-hour burst (12:12:49-14:09:27 UTC) and
 * attributed to the 2026-07-31 business day. This script reclassifies
 * exactly those tabs (and no others) as written-off bad debt via
 * `TabService.writeOffTab`, so the audit trail and report exclusion
 * behave identically to a manually-triggered write-off.
 *
 * NOT a general-purpose bulk write-off tool — see issue #626's
 * "Out of scope" section and `compliance/risk-register.md` R-020.
 *
 * Selection criteria (matches the known 51-order contamination profile):
 *   - Order.tabId is set (dine-in tab order)
 *   - Order.paymentStatus === 'paid'
 *   - Order.businessDate falls in the 2026-07-31 business-day window
 *     (`businessDateQueryRange('2026-07-31', '2026-07-31', cutoffTime)`)
 *   - Order.createdAt is 30+ days before Order.paidAt (operator-confirmed
 *     threshold, 2026-08-03 — comfortably below the actual 3-7+ month
 *     gaps in the known profile; see risk-register.md R-020)
 *
 * Candidates are grouped by `tabId` and the whole TAB is written off via
 * `TabService.writeOffTab` (never raw Mongo writes), so every linked
 * order on the tab is included even if an individual order's own
 * createdAt/paidAt gap happens to fall marginally outside the threshold.
 *
 * Safety:
 *   - --dry-run prints the exact candidate tab/order list + amounts
 *     without writing anything.
 *   - The confirmed-write mode takes a `mongodump` backup of the
 *     `tabs`/`orders` collections to a timestamped directory first.
 *   - Requires an explicit typed "yes" confirmation before any write.
 *   - Idempotent: a tab already `'written-off'` is skipped, not
 *     re-processed, so a second invocation is a no-op for already-done
 *     tabs.
 *
 * Usage:
 *   npx tsx scripts/write-off-dormant-tabs-2026-07-31.ts --dry-run --actor <userId>
 *   npx tsx scripts/write-off-dormant-tabs-2026-07-31.ts --actor <userId>
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI + MONGODB_DB_NAME in .env.local
 * (same as every other script in this directory). `--actor <userId>` is
 * required — the admin/super-admin user ID recorded as `writtenOffBy` on
 * every write-off (see `TabService.writeOffTab`).
 */
import { config } from 'dotenv';
import path from 'path';
import * as readline from 'readline';
import { execFileSync } from 'child_process';

config({ path: path.resolve(__dirname, '../.env.local') });

import { connectDB, disconnectFromDatabase } from '../lib/mongodb';
import OrderModel from '../models/order-model';
import TabModel from '../models/tab-model';
import { TabService } from '../services/tab-service';
import { SystemSettingsService } from '../services/system-settings-service';
import { businessDateQueryRange } from '../lib/business-date';

const DRY_RUN = process.argv.includes('--dry-run');
const CONTAMINATION_BUSINESS_DATE = '2026-07-31';
const GAP_DAYS_THRESHOLD = 30;
const WRITE_OFF_REASON =
  'Bulk manual tab-closure contamination event (2026-07-31) — retroactive ' +
  'bad-debt write-off per REQ-098 remediation. Tab was dormant (opened ' +
  'well before the contaminating close) and force-closed as paid in a ' +
  'bulk operation, not by genuine same-day customer payment.';

function parseActorArg(): string {
  const idx = process.argv.indexOf('--actor');
  const actor = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!actor) {
    console.error(
      'Error: --actor <userId> is required (the admin/super-admin user ID recorded as writtenOffBy).'
    );
    process.exit(2);
  }
  return actor;
}

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function runMongodumpBackup(): string {
  const uri = process.env.MONGODB_WAWAGARDENBAR_APP_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  if (!uri || !dbName) {
    throw new Error(
      'MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME must be set to take a backup before writing.'
    );
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(
    __dirname,
    '..',
    'backups',
    `write-off-dormant-tabs-2026-07-31-${timestamp}`
  );
  console.log(`[REQ-098] Taking mongodump backup to ${backupDir} ...`);
  execFileSync(
    'mongodump',
    [
      `--uri=${uri}`,
      `--db=${dbName}`,
      `--out=${backupDir}`,
      '--gzip',
      '--collection=tabs',
      '--collection=orders',
    ],
    { stdio: 'inherit' }
  );
  console.log(`[REQ-098] Backup complete: ${backupDir}`);
  return backupDir;
}

export interface CandidateOrder {
  _id: { toString(): string };
  tabId: { toString(): string };
  total: number;
  createdAt: Date;
  paidAt: Date | null | undefined;
}

export interface CandidateTabRow {
  _id: { toString(): string };
  tabNumber: string;
  tableNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
}

export interface CandidateTab {
  tabId: string;
  tabNumber: string;
  tableNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  orders: CandidateOrder[];
}

/**
 * Pure predicate — matches the known 51-order contamination profile: a
 * `createdAt`-to-`paidAt` gap of `gapDays`+ (operator-confirmed 30 days,
 * comfortably below the actual 3-7+ month gaps; see risk-register.md
 * R-020). Exported for direct unit testing without any Mongo dependency.
 */
export function isContaminationGapCandidate(
  order: { createdAt: Date | string; paidAt: Date | string | null | undefined },
  gapDays: number
): boolean {
  if (!order.paidAt || !order.createdAt) return false;
  const gapMs = gapDays * 24 * 60 * 60 * 1000;
  const gap =
    new Date(order.paidAt).getTime() - new Date(order.createdAt).getTime();
  return gap >= gapMs;
}

/**
 * Pure — filters `orders` to those matching `isContaminationGapCandidate`
 * and groups the survivors by `tabId`. No Mongo dependency; takes
 * already-fetched plain order rows.
 */
export function groupCandidateOrdersByTab(
  orders: CandidateOrder[],
  gapDays: number
): Map<string, CandidateOrder[]> {
  const ordersByTabId = new Map<string, CandidateOrder[]>();
  for (const order of orders) {
    if (!isContaminationGapCandidate(order, gapDays)) continue;
    const tabId = order.tabId.toString();
    const bucket = ordersByTabId.get(tabId) ?? [];
    bucket.push(order);
    ordersByTabId.set(tabId, bucket);
  }
  return ordersByTabId;
}

/**
 * Pure — joins already-fetched tab rows with their grouped candidate
 * orders into the final `CandidateTab[]` shape used for the dry-run
 * printout and the confirmed-write loop.
 */
export function buildCandidateTabs(
  tabs: CandidateTabRow[],
  ordersByTabId: Map<string, CandidateOrder[]>
): CandidateTab[] {
  return tabs.map((tab) => {
    const tabId = tab._id.toString();
    return {
      tabId,
      tabNumber: tab.tabNumber,
      tableNumber: tab.tableNumber,
      status: tab.status,
      paymentStatus: tab.paymentStatus,
      total: tab.total,
      orders: ordersByTabId.get(tabId) ?? [],
    };
  });
}

async function findCandidates(): Promise<CandidateTab[]> {
  const cutoff = await SystemSettingsService.getBusinessDayCutoff();
  const { businessDateStart, businessDateEnd } = businessDateQueryRange(
    CONTAMINATION_BUSINESS_DATE,
    CONTAMINATION_BUSINESS_DATE,
    cutoff
  );

  const orders = await OrderModel.find({
    tabId: { $exists: true, $ne: null },
    paymentStatus: 'paid',
    businessDate: { $gte: businessDateStart, $lte: businessDateEnd },
  }).lean<CandidateOrder[]>();

  const ordersByTabId = groupCandidateOrdersByTab(orders, GAP_DAYS_THRESHOLD);
  if (ordersByTabId.size === 0) return [];

  const tabs = await TabModel.find({
    _id: { $in: Array.from(ordersByTabId.keys()) },
  }).lean<CandidateTabRow[]>();

  return buildCandidateTabs(tabs, ordersByTabId);
}

async function main(): Promise<void> {
  const actor = parseActorArg();

  console.log(
    `[REQ-098] Dormant-tab write-off remediation starting (dry-run=${DRY_RUN}); connecting...`
  );
  await connectDB();

  const candidates = await findCandidates();

  console.log(
    `[REQ-098] Found ${candidates.length} candidate tab(s) matching the 2026-07-31 contamination profile:`
  );
  let totalAmount = 0;
  for (const tab of candidates) {
    const alreadyWrittenOff = tab.paymentStatus === 'written-off';
    totalAmount += tab.total;
    console.log(
      `  - Tab ${tab.tabNumber} (table ${tab.tableNumber}, id=${tab.tabId}) — ` +
        `${tab.orders.length} order(s), total=₦${tab.total.toLocaleString()}` +
        (alreadyWrittenOff ? ' [ALREADY WRITTEN OFF — will skip]' : '')
    );
    for (const order of tab.orders) {
      // Safe — groupCandidateOrdersByTab only admits orders with a truthy
      // paidAt (isContaminationGapCandidate's guard).
      console.log(
        `      order ${order._id.toString()} — total=₦${order.total.toLocaleString()} ` +
          `createdAt=${new Date(order.createdAt).toISOString()} paidAt=${new Date(order.paidAt as Date).toISOString()}`
      );
    }
  }
  console.log(
    `[REQ-098] Candidate summary: ${candidates.length} tab(s), total amount ₦${totalAmount.toLocaleString()}`
  );

  if (DRY_RUN) {
    console.log('[REQ-098] Dry-run: no writes performed.');
    await disconnectFromDatabase();
    return;
  }

  if (candidates.length === 0) {
    console.log('[REQ-098] Nothing to do — no matching candidates.');
    await disconnectFromDatabase();
    return;
  }

  runMongodumpBackup();

  const answer = await askQuestion(
    `\n⚠️  This will write off ${candidates.length} tab(s) totalling ₦${totalAmount.toLocaleString()} as bad debt. Type 'yes' to proceed: `
  );
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('[REQ-098] Aborted — confirmation not given.');
    await disconnectFromDatabase();
    process.exit(0);
  }

  let processed = 0;
  let skippedAlreadyWrittenOff = 0;
  let failed = 0;

  for (const tab of candidates) {
    if (tab.paymentStatus === 'written-off') {
      skippedAlreadyWrittenOff += 1;
      console.log(`  - Tab ${tab.tabNumber} already written off — skipping.`);
      continue;
    }
    try {
      await TabService.writeOffTab(tab.tabId, {
        reason: WRITE_OFF_REASON,
        writtenOffBy: actor,
      });
      processed += 1;
      console.log(`  - Tab ${tab.tabNumber} written off successfully.`);
    } catch (error) {
      failed += 1;
      console.error(`  - Tab ${tab.tabNumber} FAILED:`, error);
    }
  }

  console.log('');
  console.log('[REQ-098] Remediation summary:');
  console.log(`  processed:                 ${processed}`);
  console.log(`  skipped (already written off): ${skippedAlreadyWrittenOff}`);
  console.log(`  failed:                     ${failed}`);

  await disconnectFromDatabase();
}

// Only run if invoked directly, not when imported by tests.
if (require.main === module) {
  main().catch(async (err) => {
    console.error('[REQ-098] Remediation script failed:', err);
    try {
      await disconnectFromDatabase();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
}
