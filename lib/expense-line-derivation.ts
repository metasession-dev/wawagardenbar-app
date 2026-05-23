/**
 * Auto-derivation for the expense line {quantity, unitCost, totalCost}
 * triple. `total = quantity × unitCost` — given qty plus either of the
 * other two, the third is derivable.
 *
 * Operators enter qty first, then either Unit Cost OR Total. The hook
 * (`hooks/use-expense-line-auto-derive.ts`) tracks which of {Unit Cost,
 * Total} was last edited and uses that single bit to decide which field
 * to recompute on a subsequent qty change. Math + rules live here;
 * state + DOM round-trip live in the hook.
 *
 * Out of scope: pack-to-unit conversions, FX, CSV import.
 *
 * Ref: #104
 */

export type LineFieldName = 'quantity' | 'unitCost' | 'totalCost';

/**
 * Round to the field's stored precision.
 *
 * - quantity: 4 decimals (operators may enter eg 0.2500 kg, or the
 *   auto-derive could produce 11.9999 from total ÷ unit float drift).
 * - unitCost: 4 decimals (per the issue — some line items are
 *   £0.0825/g for spice mixes).
 * - totalCost: 2 decimals (currency).
 *
 * Note: long-term we should store these as Mongoose Decimal128 to avoid
 * float drift entirely (#104 non-functional note). The schema today is
 * `Number`, so a fixed-precision round at the UI / helper boundary is
 * the pragmatic interim.
 */
export function roundForField(field: LineFieldName, value: number): number {
  const decimals = field === 'totalCost' ? 2 : 4;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Compute Total from quantity × unitCost.
 *
 * Returns `null` when qty is non-positive — the caller should leave the
 * Total field untouched. Qty is the anchor; nothing computes without it.
 */
export function computeTotal(
  quantity: number,
  unitCost: number
): number | null {
  if (!(quantity > 0)) return null;
  return roundForField('totalCost', quantity * unitCost);
}

/**
 * Compute Unit Cost from totalCost / quantity.
 *
 * Returns `null` when qty is non-positive — division would be undefined
 * or infinite, and the operator hasn't anchored the line yet.
 */
export function computeUnitCost(
  quantity: number,
  totalCost: number
): number | null {
  if (!(quantity > 0)) return null;
  return roundForField('unitCost', totalCost / quantity);
}
