/**
 * @requirement REQ-108 - One-time backfill: set Order.tabId for tab-linked
 * orders that are missing it, and surface orders that were falsely
 * auto-marked cash-paid by the bug this REQ fixes.
 *
 * Background: `TabService.addOrderToTab` previously only pushed the order
 * id into `tab.orders[]` and never set `order.tabId` on the Order document.
 * `updateOrderStatusAction`'s auto-cash-mark guard (`!order.tabId`) relied
 * on that field to exclude tab orders from being auto-marked paid on
 * kitchen completion — so any order attached to a tab via a path that
 * didn't separately set `tabId` (the public ordering API, the express/POS
 * add-to-tab flow) could be falsely marked `paymentStatus: 'paid'`,
 * `paymentMethod: 'cash'` while its tab was still open and unpaid.
 *
 * This script:
 *   1. Sets `tabId` on any order present in a tab's `orders[]` array but
 *      missing (or mismatched) `tabId` — safe, mechanical, always applied.
 *   2. Separately reports (never auto-reverts by default) orders that look
 *      like they were actually corrupted by the bug: tab-linked, `tabId`
 *      was missing/wrong, AND already carry the auto-mark-cash fingerprint
 *      (`paymentMethod: 'cash'`, `paymentReference` matching `CASH-<ts>`).
 *   3. Only with the explicit `--revert-false-positives` flag, reverts the
 *      payment fields on those reported orders — and only for orders whose
 *      tab is still `open` and not `paymentStatus: 'paid'` at the tab
 *      level. Orders on already-closed/paid tabs are left for manual
 *      reconciliation — reverting there could disagree with money already
 *      collected through the normal tab-close flow.
 *
 * This is safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/backfill-order-tabid.ts [--dry-run] [--revert-false-positives]
 *   npx tsx scripts/backfill-order-tabid.ts "mongodb://..." [--dry-run] [--revert-false-positives]
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME in .env.local
 * (or a connection URI passed as the first positional argument).
 */
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const REVERT_FALSE_POSITIVES = process.argv.includes(
  '--revert-false-positives'
);
const CASH_REFERENCE_PATTERN = /^CASH-\d+$/;

async function main() {
  const uri =
    process.argv.find((a) => a.startsWith('mongodb')) ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  console.log(`Connecting to: ${uri.replace(/\/\/[^@]+@/, '//***@')}...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  if (DRY_RUN) {
    console.log('DRY RUN — no writes will be performed.\n');
  }
  if (REVERT_FALSE_POSITIVES) {
    console.log(
      '--revert-false-positives is set — matching orders on open/unpaid tabs will be reverted.\n'
    );
  }

  // ── Step 1: backfill missing/wrong Order.tabId ─────────────────────────
  const tabsCursor = db
    .collection('tabs')
    .find({}, { projection: { orders: 1 } });

  let tabIdsFixed = 0;
  let tabsScanned = 0;
  const falsePositiveCandidates: {
    orderId: ObjectId;
    tabId: ObjectId;
    tabStatus: string;
    tabPaymentStatus: string;
    paymentReference: string;
  }[] = [];

  for await (const tab of tabsCursor) {
    tabsScanned++;
    const orderIds: ObjectId[] = Array.isArray(tab.orders) ? tab.orders : [];
    if (orderIds.length === 0) continue;

    const mismatched = await db
      .collection('orders')
      .find({
        _id: { $in: orderIds },
        $or: [
          { tabId: { $exists: false } },
          { tabId: null },
          { tabId: { $ne: tab._id } },
        ],
      })
      .toArray();

    for (const order of mismatched) {
      if (!DRY_RUN) {
        await db
          .collection('orders')
          .updateOne({ _id: order._id }, { $set: { tabId: tab._id } });
      } else {
        console.log(`  Order ${order._id}: tabId -> ${tab._id}`);
      }
      tabIdsFixed++;

      // Step 2: does this order also show the auto-mark-cash fingerprint?
      // That means it was genuinely corrupted by the bug (falsely marked
      // paid while tab-linked) before this script ran.
      if (
        order.paymentMethod === 'cash' &&
        typeof order.paymentReference === 'string' &&
        CASH_REFERENCE_PATTERN.test(order.paymentReference)
      ) {
        const tabDoc = await db
          .collection('tabs')
          .findOne(
            { _id: tab._id },
            { projection: { status: 1, paymentStatus: 1 } }
          );
        falsePositiveCandidates.push({
          orderId: order._id,
          tabId: tab._id,
          tabStatus: (tabDoc?.status as string) ?? 'unknown',
          tabPaymentStatus: (tabDoc?.paymentStatus as string) ?? 'unknown',
          paymentReference: order.paymentReference,
        });
      }
    }
  }

  console.log(
    `\nScanned ${tabsScanned} tab(s). Fixed tabId on ${tabIdsFixed} order(s).`
  );

  // ── Step 2 (report): orders that look genuinely corrupted by the bug ──
  console.log(
    `\nFound ${falsePositiveCandidates.length} order(s) matching the auto-mark-cash fingerprint while genuinely tab-linked:`
  );
  for (const c of falsePositiveCandidates) {
    console.log(
      `  Order ${c.orderId} — tab ${c.tabId} (status=${c.tabStatus}, paymentStatus=${c.tabPaymentStatus}), paymentReference=${c.paymentReference}`
    );
  }

  const revertEligible = falsePositiveCandidates.filter(
    (c) => c.tabStatus === 'open' && c.tabPaymentStatus !== 'paid'
  );
  const revertIneligible =
    falsePositiveCandidates.length - revertEligible.length;

  if (revertIneligible > 0) {
    console.log(
      `\n${revertIneligible} candidate(s) are on a closed/paid tab — excluded from any revert; needs manual reconciliation.`
    );
  }

  if (!REVERT_FALSE_POSITIVES) {
    console.log(
      `\n${revertEligible.length} candidate(s) are eligible for revert. Re-run with --revert-false-positives to apply (after reviewing the list above).`
    );
  } else {
    console.log(`\nReverting ${revertEligible.length} eligible order(s)...`);
    for (const c of revertEligible) {
      if (!DRY_RUN) {
        await db.collection('orders').updateOne(
          { _id: c.orderId },
          {
            $set: { paymentStatus: 'pending' },
            $unset: {
              paymentMethod: '',
              paymentReference: '',
              paidAt: '',
              businessDate: '',
            },
          }
        );
      } else {
        console.log(`  Would revert order ${c.orderId}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
