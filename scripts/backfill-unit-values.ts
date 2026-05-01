/**
 * @requirement REQ-033 - One-time idempotent backfill: normalise free-text
 * `unit` strings on Expense and Inventory rows to canonical UoM registry IDs.
 *
 * Behaviour:
 *   - Walks Expense.unit and Inventory.unit fields.
 *   - For every row whose `unit` already matches a canonical registry id,
 *     no write is performed (skip-already-migrated; safe to re-run).
 *   - For every row whose `unit` matches a known LEGACY_UNIT_ALIASES key,
 *     normalises to the canonical id and writes the row.
 *   - For every row whose `unit` is genuinely unrecognised, the row is
 *     reported to stdout for manual review and NOT mutated.
 *   - Writes a JSON audit file `_uom-backfill-{timestamp}.json` in CWD
 *     with the original→new mappings before any mutation, so the change
 *     can be replayed in reverse if a rollback is needed.
 *
 * Usage:
 *   npx tsx scripts/backfill-unit-values.ts
 *   npx tsx scripts/backfill-unit-values.ts "mongodb://..."
 *
 * Options:
 *   --dry-run   Print what would change without writing to DB or audit file.
 *
 * Requires MONGODB_WAWAGARDENBAR_APP_URI and MONGODB_DB_NAME in .env.local.
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import {
  DEFAULT_UNITS_OF_MEASUREMENT,
  LEGACY_UNIT_ALIASES,
} from '../interfaces/unit-of-measurement.interface';
import { normaliseLegacyUnit } from '../lib/units';

config({ path: path.resolve(__dirname, '../.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

interface BackfillReport {
  timestamp: string;
  collection: 'expenses' | 'inventories';
  rowId: string;
  originalUnit: string;
  newUnit: string;
}

async function main() {
  const uri =
    process.argv.find((a) => a.startsWith('mongodb')) ||
    `${process.env.MONGODB_WAWAGARDENBAR_APP_URI}/${process.env.MONGODB_DB_NAME}`;

  console.log(`Connecting to: ${uri.replace(/\/\/[^@]+@/, '//***@')}`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  // Build the set of canonical IDs from default seed + alias values, plus any
  // persisted custom registry stored under 'units-of-measurement'.
  const persistedDoc = await db
    .collection('systemsettings')
    .findOne({ key: 'units-of-measurement' });
  const persisted: Array<{ id: string }> =
    (persistedDoc?.value as Array<{
      id: string;
    }>) || [];
  const canonical = new Set<string>([
    ...DEFAULT_UNITS_OF_MEASUREMENT.map((u) => u.id),
    ...Object.values(LEGACY_UNIT_ALIASES),
    ...persisted.map((u) => u.id),
  ]);

  console.log(
    `Canonical registry has ${canonical.size} ids: ${[...canonical].sort().join(', ')}`
  );

  if (DRY_RUN) {
    console.log('DRY RUN — no writes will be performed.\n');
  }

  const audit: BackfillReport[] = [];
  const unrecognised: { collection: string; id: string; unit: string }[] = [];

  for (const collection of ['expenses', 'inventories'] as const) {
    const cursor = db.collection(collection).find({});
    let migrated = 0;
    let alreadyOk = 0;
    let unknown = 0;
    for await (const doc of cursor) {
      const original: unknown = doc.unit;
      if (typeof original !== 'string' || original.trim() === '') {
        // No unit on this row — nothing to do.
        continue;
      }
      if (canonical.has(original)) {
        alreadyOk++;
        continue;
      }
      const normalised = normaliseLegacyUnit(original);
      if (!normalised) {
        unrecognised.push({
          collection,
          id: doc._id.toString(),
          unit: original,
        });
        unknown++;
        continue;
      }

      audit.push({
        timestamp: new Date().toISOString(),
        collection,
        rowId: doc._id.toString(),
        originalUnit: original,
        newUnit: normalised,
      });

      if (!DRY_RUN) {
        await db
          .collection(collection)
          .updateOne({ _id: doc._id }, { $set: { unit: normalised } });
      } else {
        console.log(
          `  ${collection}/${doc._id}: '${original}' → '${normalised}'`
        );
      }
      migrated++;
    }
    console.log(
      `${collection}: ${migrated} migrated, ${alreadyOk} already canonical, ${unknown} unrecognised`
    );
  }

  if (audit.length > 0 && !DRY_RUN) {
    const filename = `_uom-backfill-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(audit, null, 2));
    console.log(`\nAudit file written: ${filename} (${audit.length} entries)`);
  }

  if (unrecognised.length > 0) {
    console.log(
      `\nUNRECOGNISED unit values (${unrecognised.length}) — review manually and either rename through the Settings UI or fix the source row:`
    );
    for (const u of unrecognised) {
      console.log(`  ${u.collection}/${u.id}: '${u.unit}'`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
