/**
 * @requirement REQ-035 — One-time idempotent backfill: for every Order
 * with `tipAmount > 0` and no `tipPaymentMethod`, set
 * `tipPaymentMethod = paymentMethod`.
 *
 * Why: legacy customer-checkout orders captured a tip but didn't store
 * the tip's payment method as a distinct field. The new daily-report
 * tipsBreakdown falls back to `paymentMethod` for orders missing
 * `tipPaymentMethod`, so this backfill is *not* required for correct
 * reporting — but it migrates existing rows to the new shape so future
 * reads are unambiguous.
 *
 * Behaviour:
 *   - Skips rows where `tipPaymentMethod` is already set (idempotent).
 *   - Skips rows where `tipAmount <= 0` or `paymentMethod` is missing.
 *   - Writes an audit JSON to CWD before mutating, so the change can
 *     be reversed by a script reading that file.
 *
 * Usage:
 *   npx tsx scripts/backfill-tip-payment-method.ts
 *   npx tsx scripts/backfill-tip-payment-method.ts --dry-run
 *   npx tsx scripts/backfill-tip-payment-method.ts "mongodb://..."
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME in .env.local
 * (same env keys the rest of the scripts use).
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import OrderModel from '../models/order-model';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

interface BackfillEntry {
  orderId: string;
  tipAmount: number;
  paymentMethod: string;
  setTo: string;
}

async function main() {
  const uri =
    process.argv.find((a) => a.startsWith('mongodb')) ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  if (!uri || uri.startsWith('undefined')) {
    console.error(
      'No MongoDB URI provided. Set MONGODB_WAWAGARDENBAR_APP_URI + MONGODB_DB_NAME, or pass a URI as an argument.'
    );
    process.exit(2);
  }

  console.log(`[REQ-035] backfill starting (dry-run=${DRY_RUN}); connecting…`);
  await mongoose.connect(uri);

  // Candidates: tipAmount > 0 AND tipPaymentMethod is missing/null.
  const candidates = await OrderModel.find({
    tipAmount: { $gt: 0 },
    $or: [{ tipPaymentMethod: { $exists: false } }, { tipPaymentMethod: null }],
  })
    .select('_id tipAmount paymentMethod')
    .lean();

  console.log(
    `[REQ-035] candidates with tipAmount > 0 and no tipPaymentMethod: ${candidates.length}`
  );

  const entries: BackfillEntry[] = [];
  const skipped: { orderId: string; reason: string }[] = [];
  for (const o of candidates) {
    const method = (o as { paymentMethod?: string }).paymentMethod;
    if (!method) {
      skipped.push({
        orderId: String(o._id),
        reason: 'no paymentMethod to fall back to',
      });
      continue;
    }
    entries.push({
      orderId: String(o._id),
      tipAmount: (o as { tipAmount?: number }).tipAmount ?? 0,
      paymentMethod: method,
      setTo: method,
    });
  }

  // Write audit file before mutation.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const auditPath = path.resolve(process.cwd(), `_tip-pm-backfill-${ts}.json`);
  if (!DRY_RUN) {
    fs.writeFileSync(
      auditPath,
      JSON.stringify({ ranAt: ts, entries, skipped }, null, 2)
    );
    console.log(`[REQ-035] audit written: ${auditPath}`);
  }

  // Per-method counts for log readability.
  const perMethod: Record<string, number> = {};
  for (const e of entries) {
    perMethod[e.setTo] = (perMethod[e.setTo] || 0) + 1;
  }
  console.log(
    `[REQ-035] would update ${entries.length} orders` +
      (Object.keys(perMethod).length
        ? ` (per-method: ${JSON.stringify(perMethod)})`
        : '')
  );
  if (skipped.length) {
    console.log(
      `[REQ-035] skipped ${skipped.length} orders without paymentMethod fallback:`
    );
    for (const s of skipped.slice(0, 20)) {
      console.log(`  - ${s.orderId}: ${s.reason}`);
    }
    if (skipped.length > 20) {
      console.log(`  ... +${skipped.length - 20} more`);
    }
  }

  if (DRY_RUN) {
    console.log('[REQ-035] dry-run: no writes performed.');
    await mongoose.disconnect();
    return;
  }

  // Bulk update — one updateOne per entry. The set is small (these are
  // legacy rows; expected count is in the dozens).
  let updated = 0;
  for (const e of entries) {
    const res = await OrderModel.updateOne(
      {
        _id: e.orderId,
        $or: [
          { tipPaymentMethod: { $exists: false } },
          { tipPaymentMethod: null },
        ],
      },
      { $set: { tipPaymentMethod: e.setTo } }
    );
    if (res.modifiedCount > 0) updated += 1;
  }
  console.log(`[REQ-035] updated ${updated} orders.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
