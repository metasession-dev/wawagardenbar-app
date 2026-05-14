/**
 * @requirement REQ-034 D10 — One-shot read-only audit for past expense →
 * inventory links whose entered `unit` differed from the linked inventory's
 * stored `unit`. Pre-D10, those links bumped Inventory.currentStock by the
 * raw expense quantity instead of converting (e.g. 5 kg → +5 instead of
 * +5000 when inventory was in g). This script flags affected rows so an
 * operator can decide which to reconcile manually.
 *
 * Scope:
 *   - Iterates Expenses where `linkedInventoryId` is set and `linkVoidedAt`
 *     is unset (active link).
 *   - Joins to the linked Inventory.
 *   - Reports any pair where `expense.unit !== inventory.unit`.
 *   - Reports a "would-have-been" converted quantity using the REQ-033
 *     unit registry where possible; otherwise marks the row as needing
 *     manual review.
 *
 * Output: stdout summary + a JSON file at
 *   compliance/evidence/REQ-034/gates/audit-expense-link-units.json
 * so the result is captured for the release ticket.
 *
 * Usage:
 *   npx tsx scripts/audit-expense-link-units.ts
 *   npx tsx scripts/audit-expense-link-units.ts "mongodb://..."
 *
 * Read-only. Writes no DB state.
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ExpenseModel } from '../models';
import InventoryModel from '../models/inventory-model';
import { SystemSettingsService } from '../services/system-settings-service';
import { convertExpenseQuantityToInventoryUnit } from '../lib/expense-inventory-link';

config({ path: path.resolve(__dirname, '../.env.local') });

interface AuditRow {
  expenseId: string;
  inventoryId: string;
  inventoryName?: string;
  expenseQuantity: number;
  expenseUnit: string;
  inventoryUnit: string;
  appliedAsInventoryUnits: number;
  shouldHaveBeenInventoryUnits: number | 'manual-review';
  delta: number | 'manual-review';
  date: string;
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

  console.log('[REQ-034 D10] expense-link unit audit starting; connecting…');
  await mongoose.connect(uri);

  const registry = await SystemSettingsService.getUnitsOfMeasurement();

  const expenses = await ExpenseModel.find({
    linkedInventoryId: { $ne: null },
    linkVoidedAt: { $exists: false },
  }).lean();

  console.log(
    `[REQ-034 D10] active expense links to inspect: ${expenses.length}`
  );

  const flagged: AuditRow[] = [];

  for (const exp of expenses) {
    const inv = await InventoryModel.findById(exp.linkedInventoryId).lean();
    if (!inv) continue;
    const expenseUnit = (exp.unit ?? '').trim();
    const inventoryUnit = (inv as { unit?: string }).unit?.trim() ?? '';
    if (!expenseUnit || !inventoryUnit) continue;
    if (expenseUnit === inventoryUnit) continue;

    const enteredQty = Number(exp.quantity ?? 1);
    let convertedQty: number | 'manual-review';
    try {
      const out = convertExpenseQuantityToInventoryUnit({
        expenseQuantity: enteredQty,
        expenseUnit,
        inventoryUnit,
        registry,
      });
      convertedQty = out.quantity;
    } catch {
      convertedQty = 'manual-review';
    }

    flagged.push({
      expenseId: String(exp._id),
      inventoryId: String(inv._id),
      inventoryName: (inv as { menuItemId?: { name?: string }; name?: string })
        .name,
      expenseQuantity: enteredQty,
      expenseUnit,
      inventoryUnit,
      appliedAsInventoryUnits: enteredQty,
      shouldHaveBeenInventoryUnits: convertedQty,
      delta:
        convertedQty === 'manual-review'
          ? 'manual-review'
          : convertedQty - enteredQty,
      date:
        exp.date instanceof Date
          ? exp.date.toISOString()
          : String(exp.date ?? ''),
    });
  }

  const outDir = path.resolve(
    __dirname,
    '../compliance/evidence/REQ-034/gates'
  );
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'audit-expense-link-units.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalExpenseLinks: expenses.length,
        flaggedCount: flagged.length,
        flagged,
      },
      null,
      2
    )
  );

  console.log(
    `[REQ-034 D10] flagged ${flagged.length} link(s) with unit mismatch — full report at ${outPath}`
  );
  for (const row of flagged.slice(0, 10)) {
    console.log(
      `  expense ${row.expenseId} → inv ${row.inventoryId}: applied +${row.appliedAsInventoryUnits} ${row.inventoryUnit}; ` +
        `should have applied +${row.shouldHaveBeenInventoryUnits} (Δ ${row.delta})`
    );
  }
  if (flagged.length > 10) {
    console.log(`  …and ${flagged.length - 10} more (see JSON file).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[REQ-034 D10] audit failed:', err);
  process.exit(1);
});
