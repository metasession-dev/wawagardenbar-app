/**
 * REQ-034 AC5–AC7 — Pure helpers for the Expense → Inventory link.
 *
 * These functions are side-effect free so the service layer can compose them
 * around the actual Mongo writes (StockMovement insert, Inventory $inc,
 * InventoryItemCostHistory close-old + insert-new) inside the optimistic
 * deduction pattern.
 *
 * Conventions:
 * - `quantity` always defaults to 1 (REQ-032 alignment) when the expense is
 *   missing a quantity (e.g. lump-sum supplier invoice).
 * - `costPerUnit` for the new history row is `expense.amount / quantity`.
 * - "Weighted-average" cost is computed across the full open + closed history
 *   so downstream COGS readers see a single canonical value.
 */
import { Types } from 'mongoose';
import type { InventoryKind } from '@/interfaces/inventory.interface';
import type { ExpenseType } from '@/interfaces/expense.interface';
import type { UnitOfMeasurement } from '@/interfaces/unit-of-measurement.interface';
import { convertToInventoryUnit } from '@/lib/dimension-conversion';

export const DEFAULT_EXPENSE_QUANTITY = 1;

/**
 * Normalises a possibly-missing expense quantity to the REQ-032 default of 1.
 * Returned value is guaranteed > 0; throws on non-positive input.
 */
export function resolveExpenseQuantity(
  quantity: number | undefined | null
): number {
  if (quantity === undefined || quantity === null)
    return DEFAULT_EXPENSE_QUANTITY;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(
      `Expense quantity must be a positive number when linked to inventory (got ${quantity})`
    );
  }
  return quantity;
}

/**
 * D10 — Convert an expense-entered quantity into the inventory's stored
 * unit before applying it to currentStock. Wraps REQ-034 AC9's
 * `convertToInventoryUnit` with two legacy-data fallbacks so the same
 * helper can be threaded through every call-site safely:
 *
 *   - missing expenseUnit (e.g. expense saved before REQ-033) → identity
 *   - same id on both sides → identity (no registry lookup needed)
 *
 * Cross-dimension or unknown-id errors surface as-is from the underlying
 * REQ-033 helper — those should never pass UI validation, so a throw is
 * the right signal that something has corrupted the data.
 *
 * Returns the converted quantity AND a `converted` flag the service uses
 * to add a one-line note to StockMovement so an auditor can see "this
 * row was unit-converted on write."
 */
export interface ExpenseToInventoryConversion {
  /** Quantity expressed in the inventory's stored unit. */
  quantity: number;
  /** True iff a dimension conversion was applied (not identity). */
  converted: boolean;
  /** Human-readable note for audit trail (only set when converted). */
  note?: string;
}

export function convertExpenseQuantityToInventoryUnit(input: {
  expenseQuantity: number;
  expenseUnit: string | undefined | null;
  inventoryUnit: string;
  registry: ReadonlyArray<UnitOfMeasurement>;
}): ExpenseToInventoryConversion {
  const { expenseQuantity, expenseUnit, inventoryUnit, registry } = input;

  // Legacy / missing-data passthroughs.
  if (!expenseUnit) {
    return { quantity: expenseQuantity, converted: false };
  }
  if (!inventoryUnit) {
    return { quantity: expenseQuantity, converted: false };
  }
  if (expenseUnit === inventoryUnit) {
    return { quantity: expenseQuantity, converted: false };
  }

  const converted = convertToInventoryUnit({
    value: expenseQuantity,
    fromUnitId: expenseUnit,
    toUnitId: inventoryUnit,
    registry,
  });
  return {
    quantity: converted,
    converted: true,
    note: `Converted ${expenseQuantity} ${expenseUnit} → ${converted} ${inventoryUnit}`,
  };
}

/**
 * AC5 (dropdown visibility): the Add-to-inventory selector only renders when
 * the line item is Direct Cost. Operating expenses, salaries, repairs etc.
 * never bump kitchen inventory.
 */
export function shouldShowAddToInventoryDropdown(
  expenseType: ExpenseType | string | undefined
): boolean {
  return expenseType === 'direct-cost';
}

/**
 * REQ-038 — Server-side enforcement of `MenuItem.expenseUnitOverride`.
 *
 * When the operator links a Direct Cost expense to a sellable inventory
 * row, the paired MenuItem may declare a "Purchase unit" override that
 * locks the expense's `unit` to a specific UoM-registry id (e.g.
 * 'bottles', 'cans', 'bags', 'pieces'). The UI also enforces this lock,
 * but the service is the load-bearing check: even if the UI is bypassed
 * or out-of-date, the apply path rejects mismatches.
 *
 * No-ops (return without throw) when:
 *  - `override` is undefined (defaults to "Any"; legacy behaviour)
 *  - `override` is the 'any' sentinel (explicit "Any")
 *  - `expenseUnit` is undefined (legacy expense saved before REQ-033)
 *
 * Throws (naming both units + the override) on mismatch — error is
 * generic over the unit id so a future REQ adding new units works
 * without code change.
 */
export function validateExpenseUnitAgainstOverride(input: {
  expenseUnit: string | undefined | null;
  override: string | undefined | null;
  menuItemName?: string;
}): void {
  const { expenseUnit, override, menuItemName } = input;
  if (!override) return; // undefined → "Any" (legacy behaviour)
  if (override === 'any') return; // explicit sentinel
  if (!expenseUnit) return; // legacy passthrough
  if (expenseUnit === override) return;
  const target = menuItemName ? ` on '${menuItemName}'` : '';
  throw new Error(
    `Expense unit '${expenseUnit}' does not match the locked purchase unit ` +
      `'${override}'${target}. Either change the expense unit to '${override}' ` +
      `or update the menu item's Purchase unit setting.`
  );
}

/**
 * AC5 (dropdown options): the selector only lists inventory rows whose
 * `kind` is `'kitchen-ingredient'`. Sellable inventory is never a valid
 * link target (a customer-menu item is restocked by sales returns, not
 * by an expense receipt).
 */
export function filterKitchenIngredientInventory<
  T extends { kind?: InventoryKind | null },
>(items: readonly T[]): T[] {
  return items.filter((item) => item.kind === 'kitchen-ingredient');
}

export interface ExpenseLinkPayload {
  expenseId: string | Types.ObjectId;
  linkedInventoryId: string | Types.ObjectId;
  quantity: number;
  amount: number;
  supplier?: string;
  notes?: string;
  date: Date;
  performedBy: string | Types.ObjectId;
  performedByName?: string;
}

export interface RestockMovementInput {
  inventoryId: Types.ObjectId;
  quantity: number;
  type: 'addition';
  reason: string;
  performedBy: Types.ObjectId;
  performedByName?: string;
  timestamp: Date;
  category: 'restock';
  costPerUnit: number;
  totalCost: number;
  supplier?: string;
  notes?: string;
}

/**
 * AC6: build the StockMovement payload that mirrors an Expense restocking
 * a kitchen-ingredient inventory row. Caller passes the payload to
 * `StockMovementModel.create`.
 */
export function buildStockMovementFromExpense(
  payload: ExpenseLinkPayload
): RestockMovementInput {
  const quantity = resolveExpenseQuantity(payload.quantity);
  const costPerUnit = payload.amount / quantity;
  return {
    inventoryId:
      typeof payload.linkedInventoryId === 'string'
        ? new Types.ObjectId(payload.linkedInventoryId)
        : payload.linkedInventoryId,
    quantity,
    type: 'addition',
    reason: `Expense restock (${payload.expenseId})`,
    performedBy:
      typeof payload.performedBy === 'string'
        ? new Types.ObjectId(payload.performedBy)
        : payload.performedBy,
    performedByName: payload.performedByName,
    timestamp: payload.date,
    category: 'restock',
    costPerUnit,
    totalCost: payload.amount,
    supplier: payload.supplier,
    notes: payload.notes,
  };
}

export interface CostHistoryRowInput {
  inventoryItemId: Types.ObjectId;
  costPerUnit: number;
  supplier?: string;
  purchaseDate: Date;
  effectiveFrom: Date;
  changedBy: Types.ObjectId;
}

/**
 * AC6: build the new InventoryItemCostHistory row to insert when an
 * expense link is applied. Caller is responsible for closing the previously
 * open row (`effectiveTo = now`) in the same write sequence.
 */
export function buildCostHistoryRowFromExpense(
  payload: ExpenseLinkPayload
): CostHistoryRowInput {
  const quantity = resolveExpenseQuantity(payload.quantity);
  return {
    inventoryItemId:
      typeof payload.linkedInventoryId === 'string'
        ? new Types.ObjectId(payload.linkedInventoryId)
        : payload.linkedInventoryId,
    costPerUnit: payload.amount / quantity,
    supplier: payload.supplier,
    purchaseDate: payload.date,
    effectiveFrom: payload.date,
    changedBy:
      typeof payload.performedBy === 'string'
        ? new Types.ObjectId(payload.performedBy)
        : payload.performedBy,
  };
}

export interface WeightedAverageInput {
  costPerUnit: number;
  quantity: number;
}

/**
 * AC6 (canonical cost): given the full set of restock rows (each carrying
 * a costPerUnit and the quantity restocked at that price), returns the
 * weighted-average cost per unit. Empty history → 0.
 *
 * Treats non-finite or non-positive quantities as 0 weight (skips them)
 * so a malformed legacy row cannot corrupt the average.
 */
export function computeWeightedAverageCost(
  rows: readonly WeightedAverageInput[]
): number {
  let totalSpent = 0;
  let totalQuantity = 0;
  for (const row of rows) {
    const qty =
      Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 0;
    const cost =
      Number.isFinite(row.costPerUnit) && row.costPerUnit >= 0
        ? row.costPerUnit
        : 0;
    totalSpent += cost * qty;
    totalQuantity += qty;
  }
  if (totalQuantity === 0) return 0;
  return totalSpent / totalQuantity;
}

/**
 * AC7 (block-on-negative): an Expense edit or delete reversal must not
 * drive inventory currentStock below zero — that would imply we'd already
 * consumed more than was restocked, which would be silently corrected and
 * mask data corruption. Surface a clear error instead.
 *
 * Returns void on success; throws a descriptive Error naming the inventory
 * row and the consumption gap when blocked.
 */
export function validateReversalDoesNotNegate(input: {
  inventoryName: string;
  currentStock: number;
  reversalQuantity: number;
}): void {
  const { inventoryName, currentStock, reversalQuantity } = input;
  if (!Number.isFinite(currentStock) || !Number.isFinite(reversalQuantity)) {
    throw new Error('Stock figures must be finite numbers');
  }
  if (reversalQuantity < 0) {
    throw new Error('Reversal quantity must be non-negative');
  }
  if (currentStock - reversalQuantity < 0) {
    const shortBy = reversalQuantity - currentStock;
    throw new Error(
      `Cannot reverse expense link for "${inventoryName}": current stock is ` +
        `${currentStock} but reversal would deduct ${reversalQuantity} ` +
        `(short by ${shortBy}). Some of the restocked quantity has already ` +
        `been consumed; record an inventory adjustment first or edit the ` +
        `expense without unlinking.`
    );
  }
}
