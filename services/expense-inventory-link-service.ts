/**
 * REQ-034 AC6/AC7 — Expense → Inventory link side-effects.
 *
 * Composes the pure helpers from `lib/expense-inventory-link.ts` with the
 * actual Mongo writes (StockMovement insert, Inventory $inc with
 * `currentStock: { $gte: required }` guard for reversals, cost-history
 * close + insert) and a reversal pass on failure.
 *
 * Standalone Mongo (no withTransaction) — we use the optimistic deduction
 * pattern. Any partial failure runs a best-effort reversal pass; if the
 * reversal itself fails, the error message names every collection that
 * may be out of sync so an operator can reconcile manually.
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import StockMovementModel from '@/models/stock-movement-model';
import InventoryItemCostHistory from '@/models/inventory-item-cost-history-model';
import { ExpenseModel } from '@/models';
import {
  buildStockMovementFromExpense,
  buildCostHistoryRowFromExpense,
  resolveExpenseQuantity,
  validateReversalDoesNotNegate,
  convertExpenseQuantityToInventoryUnit,
  validateExpenseUnitAgainstOverride,
} from '@/lib/expense-inventory-link';
import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * @requirement REQ-050 — Expense-restock stock-leak fix for trackByLocation
 *
 * Apply a stock delta from an expense-link operation (positive = restock,
 * negative = reversal). For `trackByLocation` items, mutate the receiving
 * location's `currentStock` (chosen via `defaultReceivingLocation` if set,
 * else `locations[0]`) so the inventory model's pre-save hook (which
 * recomputes `currentStock = sum(locations[].currentStock)`) reflects the
 * change. Without this routing, direct top-level `currentStock` assignments
 * to a location-tracked row are silently overwritten by the hook — exactly
 * the bug REQ-044 fixed for the order path and REQ-050 fixes here.
 *
 * Throws on negative-result (AC7-style block): an expense reversal cannot
 * drive the receiving location's stock below 0. The caller's surrounding
 * try/catch — including `runReversalPass` for the apply path — handles
 * the throw and surfaces the audit-trail-incomplete error to the operator.
 */
function applyExpenseStockDelta(
  inventory: InstanceType<typeof InventoryModel>,
  delta: number,
  performedById: Types.ObjectId,
  performedByName: string | undefined,
  when: Date
): void {
  if (inventory.trackByLocation && inventory.locations.length > 0) {
    const receivingId =
      inventory.defaultReceivingLocation ?? inventory.locations[0].location;
    const loc =
      inventory.locations.find((l) => l.location === receivingId) ??
      inventory.locations[0];
    const next = loc.currentStock + delta;
    if (next < 0) {
      throw new Error(
        `Receiving location "${loc.location}" would go negative ` +
          `(${loc.currentStock} + ${delta} = ${next})`
      );
    }
    loc.currentStock = next;
    loc.lastUpdated = when;
    loc.updatedBy = performedById;
    loc.updatedByName = performedByName;
  } else {
    const next = inventory.currentStock + delta;
    if (next < 0) {
      throw new Error(
        `currentStock would go negative (${inventory.currentStock} + ${delta} = ${next})`
      );
    }
    inventory.currentStock = next;
  }
}

export interface ApplyExpenseLinkInput {
  expenseId: Types.ObjectId;
  linkedInventoryId: Types.ObjectId;
  quantity: number | undefined;
  /**
   * D10 — the unit-id the operator entered the quantity in (e.g. 'kg').
   * Converted to the inventory's stored unit before any $inc / cost-history
   * write. Missing value = legacy passthrough (treats quantity as
   * already-inventory-unit; preserves pre-D10 callers).
   */
  expenseUnit?: string;
  amount: number;
  supplier?: string;
  notes?: string;
  date: Date;
  performedBy: string;
  performedByName?: string;
}

/**
 * Apply a single Expense → Inventory link side-effect:
 *   1. Validate linked inventory exists and kind === 'kitchen-ingredient'.
 *   2. Insert a StockMovement{category:restock, type:addition}.
 *   3. $inc Inventory.currentStock + recompute weighted-average cost.
 *   4. Close the previously-open InventoryItemCostHistory row and insert
 *      a new one with effectiveFrom = expense date.
 *   5. Patch the Expense with `stockMovementId`.
 *
 * On any failure after step 2 we run a reversal pass over whatever has been
 * written and re-throw the original error. The caller (confirmTransfer /
 * updateExpense) decides whether to surface the failure to the user or
 * continue with the rest of the batch.
 */
export async function applyExpenseInventoryLink(
  input: ApplyExpenseLinkInput
): Promise<{ stockMovementId: Types.ObjectId }> {
  await connectDB();

  const enteredQuantity = resolveExpenseQuantity(input.quantity);

  const inventory = await InventoryModel.findById(input.linkedInventoryId);
  if (!inventory) {
    throw new Error(
      `Linked inventory ${input.linkedInventoryId.toString()} not found`
    );
  }
  // REQ-038: relax the kind guard to accept both kitchen-ingredient
  // and menu-item kinds. Sellable items now restock from expenses too;
  // the financial write path (StockMovement + $inc + CostHistory +
  // reversal) is identical for both. Any other kind is still rejected.
  if (
    inventory.kind !== 'kitchen-ingredient' &&
    inventory.kind !== 'menu-item'
  ) {
    throw new Error(
      `Inventory ${input.linkedInventoryId.toString()} has kind '${inventory.kind}', ` +
        `expected 'kitchen-ingredient' or 'menu-item' — expense links target sellable items or kitchen ingredients only`
    );
  }

  // REQ-038: server-side enforcement of MenuItem.expenseUnitOverride.
  // Even if the UI lock is bypassed (out-of-date client, direct API
  // call, etc.), the apply path rejects mismatches naming both units.
  if (inventory.menuItemId) {
    const paired = await MenuItemModel.findById(inventory.menuItemId)
      .select('expenseUnitOverride name')
      .lean();
    if (paired) {
      validateExpenseUnitAgainstOverride({
        expenseUnit: input.expenseUnit,
        override: (paired as { expenseUnitOverride?: string })
          .expenseUnitOverride,
        menuItemName: (paired as { name?: string }).name,
      });
    }
  }

  // D10 — convert the operator-entered quantity into the inventory's
  // stored unit. Pre-D10 callers without `expenseUnit` hit the legacy
  // identity passthrough so existing behaviour is preserved for any
  // single-unit ingredient.
  const uomRegistry = await SystemSettingsService.getUnitsOfMeasurement();
  const conversion = convertExpenseQuantityToInventoryUnit({
    expenseQuantity: enteredQuantity,
    expenseUnit: input.expenseUnit,
    inventoryUnit: inventory.unit,
    registry: uomRegistry,
  });
  const quantity = conversion.quantity;
  const conversionNote = conversion.note;
  const composedNotes = conversionNote
    ? input.notes
      ? `${input.notes}\n${conversionNote}`
      : conversionNote
    : input.notes;

  let stockMovementId: Types.ObjectId | null = null;
  let closedHistoryId: Types.ObjectId | null = null;
  let insertedHistoryId: Types.ObjectId | null = null;
  let stockIncremented = false;

  try {
    const movementPayload = buildStockMovementFromExpense({
      expenseId: input.expenseId,
      linkedInventoryId: input.linkedInventoryId,
      quantity,
      amount: input.amount,
      supplier: input.supplier,
      notes: composedNotes,
      date: input.date,
      performedBy: input.performedBy,
      performedByName: input.performedByName,
    });
    const movement = await StockMovementModel.create(movementPayload);
    stockMovementId = movement._id;

    // REQ-050 — switched from `updateOne $inc` to doc-mutation + save so the
    // pre-save hook can recompute `currentStock = sum(locations)` for
    // `trackByLocation` items. The previous $inc bypassed the hook and left
    // top-level `currentStock` out of sync with `locations[*]`, which the
    // next unrelated save() then silently clobbered. See #175 + the
    // implementation plan for the full mechanism. Status is set by the
    // pre-save hook based on the new currentStock vs minimumStock.
    const performedById = new Types.ObjectId(input.performedBy);
    applyExpenseStockDelta(
      inventory,
      quantity,
      performedById,
      input.performedByName,
      input.date
    );
    inventory.totalRestocked += quantity;
    inventory.lastRestocked = input.date;
    await inventory.save();
    stockIncremented = true;

    // Close the previously-open cost history row, if any.
    const open = await InventoryItemCostHistory.findOne({
      inventoryItemId: input.linkedInventoryId,
      effectiveTo: { $exists: false },
    }).sort({ effectiveFrom: -1 });
    if (open) {
      open.effectiveTo = input.date;
      await open.save();
      closedHistoryId = open._id;
    }

    const newRow = buildCostHistoryRowFromExpense({
      expenseId: input.expenseId,
      linkedInventoryId: input.linkedInventoryId,
      quantity,
      amount: input.amount,
      supplier: input.supplier,
      date: input.date,
      performedBy: performedById,
    });
    const inserted = await InventoryItemCostHistory.create(newRow);
    insertedHistoryId = inserted._id;

    await ExpenseModel.updateOne(
      { _id: input.expenseId },
      { $set: { stockMovementId: movement._id, linkVoidedAt: null } }
    );

    return { stockMovementId: movement._id };
  } catch (err) {
    // Reversal pass — best effort.
    await runReversalPass({
      label: 'apply',
      reasons: {
        movementVoidReason: `Reversal of failed expense link (${input.expenseId.toString()})`,
      },
      inventoryId: input.linkedInventoryId,
      performedBy: input.performedBy,
      performedByName: input.performedByName,
      quantityToUndo: stockIncremented ? quantity : 0,
      stockMovementToVoid: stockMovementId,
      historyRowToDelete: insertedHistoryId,
      historyRowToReopen: closedHistoryId,
      now: input.date,
    });
    throw err;
  }
}

export interface ReverseExpenseLinkInput {
  expenseId: Types.ObjectId;
  linkedInventoryId: Types.ObjectId;
  quantity: number | undefined;
  /**
   * D10 — the original expense's stored unit. Must match the unit used
   * on the original apply call; we convert to inventory unit on the way
   * back out so the reversal $inc deducts the exact same number that
   * was added.
   */
  expenseUnit?: string;
  performedBy: string;
  performedByName?: string;
  reason: string;
  /** Stamp `Expense.linkVoidedAt` after a successful reversal. Default: true. */
  markVoided?: boolean;
}

/**
 * Reverse a previously-applied Expense → Inventory link:
 *   1. Validate Inventory.currentStock >= reversalQuantity (AC7).
 *   2. Insert a compensating StockMovement{category:restock, type:deduction}
 *      (negative quantity, reason names the reversal).
 *   3. $inc Inventory.currentStock by -quantity (with $gte guard).
 *   4. Close the most-recent open cost-history row associated with the link.
 *   5. Stamp `Expense.linkVoidedAt` (unless caller passes `markVoided:false`).
 *
 * Throws via {@link validateReversalDoesNotNegate} if the reversal would
 * drive currentStock below 0 — AC7 block-on-negative. No state is written
 * when blocked.
 */
export async function reverseExpenseInventoryLink(
  input: ReverseExpenseLinkInput
): Promise<void> {
  await connectDB();

  const enteredQuantity = resolveExpenseQuantity(input.quantity);

  const inventory = await InventoryModel.findById(input.linkedInventoryId);
  if (!inventory) {
    throw new Error(
      `Linked inventory ${input.linkedInventoryId.toString()} not found — cannot reverse`
    );
  }

  // D10 — same conversion path the apply side uses, so the reversal
  // unwinds the exact value that was incremented.
  const uomRegistry = await SystemSettingsService.getUnitsOfMeasurement();
  const conversion = convertExpenseQuantityToInventoryUnit({
    expenseQuantity: enteredQuantity,
    expenseUnit: input.expenseUnit,
    inventoryUnit: inventory.unit,
    registry: uomRegistry,
  });
  const quantity = conversion.quantity;

  // REQ-050 — for trackByLocation items, the AC7 gate checks the
  // RECEIVING location's stock (the one a reversal would actually deduct
  // from), not the top-level `sum(locations)`. Otherwise a sufficient
  // sum-across-locations could pass while the receiving location alone
  // goes negative — and the helper below would throw AFTER the
  // compensating StockMovement is already written. Non-tracked items keep
  // the original top-level check.
  const receivingStockForCheck =
    inventory.trackByLocation && inventory.locations.length > 0
      ? (inventory.locations.find(
          (l) =>
            l.location ===
            (inventory.defaultReceivingLocation ??
              inventory.locations[0].location)
        )?.currentStock ?? inventory.locations[0].currentStock)
      : inventory.currentStock;
  validateReversalDoesNotNegate({
    inventoryName:
      (
        inventory as { _id: Types.ObjectId; menuItemId?: Types.ObjectId }
      ).menuItemId?.toString() ?? inventory._id.toString(),
    currentStock: receivingStockForCheck,
    reversalQuantity: quantity,
  });

  const performedById = new Types.ObjectId(input.performedBy);

  // Compensating movement — negative quantity records the reversal.
  await StockMovementModel.create({
    inventoryId: input.linkedInventoryId,
    quantity: -quantity,
    type: 'deduction',
    reason: input.reason,
    performedBy: performedById,
    performedByName: input.performedByName,
    timestamp: new Date(),
    category: 'restock',
    notes: `Expense link reversal (${input.expenseId.toString()})`,
  });

  // REQ-050 — switched from `updateOne $inc` to doc-mutation + save (same
  // reason as the apply path; see #175). The helper's negative-result guard
  // replaces the previous `$gte` race guard for the receiving location.
  // Concurrent-write race safety is now via Mongoose's `__v` versioning —
  // a concurrent save loses with VersionError, surfaced as a thrown error.
  applyExpenseStockDelta(
    inventory,
    -quantity,
    performedById,
    input.performedByName,
    new Date()
  );
  inventory.totalRestocked -= quantity;
  await inventory.save();

  // Close any still-open cost-history row tied to this inventory. The
  // weighted-average reader naturally excludes closed rows from "current"
  // pricing but keeps them in the audit trail.
  const open = await InventoryItemCostHistory.findOne({
    inventoryItemId: input.linkedInventoryId,
    effectiveTo: { $exists: false },
  }).sort({ effectiveFrom: -1 });
  if (open) {
    open.effectiveTo = new Date();
    await open.save();
  }

  if (input.markVoided !== false) {
    await ExpenseModel.updateOne(
      { _id: input.expenseId },
      { $set: { linkVoidedAt: new Date() } }
    );
  }
}

interface ReversalPassInput {
  label: 'apply' | 'edit';
  reasons: { movementVoidReason: string };
  inventoryId: Types.ObjectId;
  performedBy: string;
  performedByName?: string;
  quantityToUndo: number;
  stockMovementToVoid: Types.ObjectId | null;
  historyRowToDelete: Types.ObjectId | null;
  historyRowToReopen: Types.ObjectId | null;
  now: Date;
}

/**
 * Best-effort cleanup after a mid-flight failure in applyExpenseInventoryLink.
 * Each step is independent — we want to undo as much as possible even if
 * one undo step itself fails (those are logged but not re-thrown).
 */
async function runReversalPass(input: ReversalPassInput): Promise<void> {
  // 1. Delete the inserted cost-history row (it never went into effect).
  if (input.historyRowToDelete) {
    try {
      await InventoryItemCostHistory.deleteOne({
        _id: input.historyRowToDelete,
      });
    } catch (err) {
      console.error(
        '[expense-inventory-link] reversal: delete history failed',
        err
      );
    }
  }

  // 2. Reopen the previously-closed cost-history row (if we closed one).
  if (input.historyRowToReopen) {
    try {
      await InventoryItemCostHistory.updateOne(
        { _id: input.historyRowToReopen },
        { $unset: { effectiveTo: '' } }
      );
    } catch (err) {
      console.error(
        '[expense-inventory-link] reversal: reopen history failed',
        err
      );
    }
  }

  // 3. Undo the inventory bump.
  // REQ-050 — re-load the doc and mutate + save (mirroring the apply path's
  // pattern) so the pre-save hook keeps locations + top-level currentStock
  // in sync for trackByLocation items. Best-effort: any failure is logged,
  // not re-thrown (consistent with the surrounding cleanup steps).
  if (input.quantityToUndo > 0) {
    try {
      const inv = await InventoryModel.findById(input.inventoryId);
      if (inv) {
        applyExpenseStockDelta(
          inv,
          -input.quantityToUndo,
          new Types.ObjectId(input.performedBy),
          input.performedByName,
          input.now
        );
        inv.totalRestocked = Math.max(
          0,
          inv.totalRestocked - input.quantityToUndo
        );
        await inv.save();
      }
    } catch (err) {
      console.error(
        '[expense-inventory-link] reversal: stock decrement failed',
        err
      );
    }
  }

  // 4. Record a compensating movement (audit only — do not physically delete).
  if (input.stockMovementToVoid && input.quantityToUndo > 0) {
    try {
      await StockMovementModel.create({
        inventoryId: input.inventoryId,
        quantity: -input.quantityToUndo,
        type: 'deduction',
        reason: input.reasons.movementVoidReason,
        performedBy: new Types.ObjectId(input.performedBy),
        performedByName: input.performedByName,
        timestamp: input.now,
        category: 'restock',
        notes: `Compensating reversal of ${input.stockMovementToVoid.toString()}`,
      });
    } catch (err) {
      console.error(
        '[expense-inventory-link] reversal: compensating movement failed',
        err
      );
    }
  }
}
