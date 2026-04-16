/**
 * Bulk backfill: derive and set businessDate on existing orders and tabs.
 * Uses bulkWrite for speed — processes all records in a single round trip.
 *
 * Usage:
 *   npx tsx scripts/backfill-business-dates-bulk.ts <mongodb-uri/dbname>
 *   npx tsx scripts/backfill-business-dates-bulk.ts <mongodb-uri/dbname> --dry-run
 */
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const WAT_OFFSET_MS = 60 * 60 * 1000;

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
  const uri = process.argv.find((a) => a.startsWith('mongodb'));
  if (!uri) {
    console.error(
      'Usage: npx tsx scripts/backfill-business-dates-bulk.ts <mongodb-uri/dbname> [--dry-run]'
    );
    process.exit(1);
  }

  console.log(`Connecting to: ${uri.replace(/\/\/[^@]+@/, '//***@')}...`);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log(`Database: ${db.databaseName}`);

  const settingDoc = await db
    .collection('systemsettings')
    .findOne({ key: 'business-day-cutoff' });
  const cutoff: string = (settingDoc?.value as string) ?? '15:00';
  console.log(`Using business day cutoff: ${cutoff} WAT`);

  if (DRY_RUN) console.log('DRY RUN — no writes.\n');

  // ── Orders ──────────────────────────────────────────────────────────────
  const orders = await db
    .collection('orders')
    .find({
      paymentStatus: 'paid',
      paidAt: { $exists: true, $ne: null },
      $or: [{ businessDate: { $exists: false } }, { businessDate: null }],
    })
    .project({ _id: 1, paidAt: 1 })
    .toArray();

  console.log(`Orders to backfill: ${orders.length}`);

  if (orders.length > 0 && !DRY_RUN) {
    const ops = orders.map((o) => ({
      updateOne: {
        filter: { _id: o._id },
        update: {
          $set: { businessDate: deriveBusinessDate(o.paidAt, cutoff) },
        },
      },
    }));
    const result = await db
      .collection('orders')
      .bulkWrite(ops, { ordered: false });
    console.log(`Orders updated: ${result.modifiedCount}`);
  } else if (DRY_RUN && orders.length > 0) {
    for (const o of orders.slice(0, 5)) {
      const bd = deriveBusinessDate(o.paidAt, cutoff);
      console.log(
        `  ${o._id}: paidAt=${o.paidAt.toISOString()} → businessDate=${bd.toISOString()}`
      );
    }
    if (orders.length > 5) console.log(`  ... and ${orders.length - 5} more`);
  }

  // ── Tabs ────────────────────────────────────────────────────────────────
  const tabs = await db
    .collection('tabs')
    .find({
      status: 'closed',
      $or: [{ businessDate: { $exists: false } }, { businessDate: null }],
    })
    .project({ _id: 1, paidAt: 1, closedAt: 1 })
    .toArray();

  console.log(`Tabs to backfill: ${tabs.length}`);

  if (tabs.length > 0 && !DRY_RUN) {
    const ops = tabs
      .filter((t) => t.paidAt || t.closedAt)
      .map((t) => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              businessDate: deriveBusinessDate(t.paidAt ?? t.closedAt, cutoff),
            },
          },
        },
      }));
    const result = await db
      .collection('tabs')
      .bulkWrite(ops, { ordered: false });
    console.log(`Tabs updated: ${result.modifiedCount}`);
  }

  await client.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
