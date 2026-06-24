/**
 * @requirement REQ-025 - One-time backfill: derive and set businessDate on existing orders and tabs
 *
 * For every paid order/closed tab that is missing a businessDate, this script
 * derives a businessDate from paidAt (or closedAt) using the configured
 * businessDayCutoff setting (defaulting to "15:00" WAT if not set).
 *
 * This is safe to run multiple times — it only touches documents where
 * businessDate is currently null/undefined.
 *
 * Usage:
 *   npx tsx scripts/backfill-business-dates.ts
 *   npx tsx scripts/backfill-business-dates.ts "mongodb://..."
 *
 * Options:
 *   --dry-run   Print what would be updated without writing to DB
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME in .env.local
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1

function deriveBusinessDate(paidAt: Date, cutoffTime: string): Date {
  const parts = cutoffTime.split(':');
  const cutoffHour = parseInt(parts[0], 10);
  const cutoffMinute = parseInt(parts[1], 10);

  if (isNaN(cutoffHour) || isNaN(cutoffMinute)) {
    return deriveBusinessDate(paidAt, '15:00');
  }

  const nowWAT = new Date(paidAt.getTime() + WAT_OFFSET_MS);
  const watHour = nowWAT.getUTCHours();
  const watMinute = nowWAT.getUTCMinutes();

  const isBeforeCutoff =
    watHour < cutoffHour ||
    (watHour === cutoffHour && watMinute < cutoffMinute);

  const businessWAT = new Date(nowWAT);
  businessWAT.setUTCHours(0, 0, 0, 0);

  if (isBeforeCutoff) {
    businessWAT.setUTCDate(businessWAT.getUTCDate() - 1);
  }

  return new Date(businessWAT.getTime() - WAT_OFFSET_MS);
}

async function main() {
  const uri =
    process.argv.find((a) => a.startsWith('mongodb')) ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  console.log(`Connecting to: ${uri.replace(/\/\/[^@]+@/, '//***@')}...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  // Resolve cutoff from system settings
  const settingDoc = await db
    .collection('systemsettings')
    .findOne({ key: 'business-day-cutoff' });
  const cutoff: string = (settingDoc?.value as string) ?? '15:00';
  console.log(`Using business day cutoff: ${cutoff} WAT`);

  if (DRY_RUN) {
    console.log('DRY RUN — no writes will be performed.\n');
  }

  // ── Backfill Orders ──────────────────────────────────────────────────────────
  const ordersCursor = db.collection('orders').find({
    paymentStatus: 'paid',
    paidAt: { $exists: true, $ne: null },
    businessDate: { $in: [null, undefined] },
    $or: [{ businessDate: { $exists: false } }, { businessDate: null }],
  });

  let ordersUpdated = 0;
  let ordersSkipped = 0;

  for await (const order of ordersCursor) {
    const paidAt = order.paidAt as Date;
    if (!paidAt) {
      ordersSkipped++;
      continue;
    }

    const businessDate = deriveBusinessDate(paidAt, cutoff);

    const updateFields: Record<string, unknown> = { businessDate };
    if (!order.paymentMethod) {
      updateFields.paymentMethod = order.tabId ? 'card' : 'cash';
    }

    if (!DRY_RUN) {
      await db
        .collection('orders')
        .updateOne({ _id: order._id }, { $set: updateFields });
    } else {
      console.log(
        `  Order ${order._id}: paidAt=${paidAt.toISOString()} → businessDate=${businessDate.toISOString()}, paymentMethod=${updateFields.paymentMethod ?? '(already set)'}`
      );
    }
    ordersUpdated++;
  }

  console.log(
    `Orders: ${ordersUpdated} updated, ${ordersSkipped} skipped (no paidAt).`
  );

  // ── Backfill Tabs ────────────────────────────────────────────────────────────
  const tabsCursor = db.collection('tabs').find({
    status: 'closed',
    $or: [{ businessDate: { $exists: false } }, { businessDate: null }],
  });

  let tabsUpdated = 0;
  let tabsSkipped = 0;

  for await (const tab of tabsCursor) {
    const refTime: Date = tab.paidAt ?? tab.closedAt;
    if (!refTime) {
      tabsSkipped++;
      continue;
    }

    const businessDate = deriveBusinessDate(refTime, cutoff);

    const tabUpdateFields: Record<string, unknown> = { businessDate };
    if (!tab.paymentMethod) {
      tabUpdateFields.paymentMethod = 'cash';
    }

    if (!DRY_RUN) {
      await db
        .collection('tabs')
        .updateOne({ _id: tab._id }, { $set: tabUpdateFields });
    } else {
      console.log(
        `  Tab ${tab._id}: refTime=${refTime.toISOString()} → businessDate=${businessDate.toISOString()}, paymentMethod=${tabUpdateFields.paymentMethod ?? '(already set)'}`
      );
    }
    tabsUpdated++;
  }

  console.log(
    `Tabs: ${tabsUpdated} updated, ${tabsSkipped} skipped (no paidAt/closedAt).`
  );

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
