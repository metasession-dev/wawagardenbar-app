/**
 * Auto-derivation for the expense line item triple {quantity, unitCost, totalCost}.
 *
 * total = quantity × unitCost — given any two, the third is derivable.
 * Operators currently have to compute the third by hand, which is
 * error-prone (especially for spice-mix-style line items with sub-pound
 * unit costs).
 *
 * This file is the pure logic: take the current values + which fields
 * the user has touched recently, return the target field to recompute
 * and its new value. The hook in `hooks/use-expense-line-auto-derive.ts`
 * owns the per-row edit-tracking state and wires this into the form;
 * the form itself just calls `onFieldEdit` from each input's onChange.
 *
 * Out of scope (see #104): pack-to-unit conversions, FX, CSV import.
 *
 * Ref: #104
 */

export type LineFieldName = 'quantity' | 'unitCost' | 'totalCost';

export interface LineValues {
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface DerivationResult {
  /** Which field to update (null if no derivation possible from the inputs). */
  field: LineFieldName | null;
  /** The computed value to set (matched to `field`). Always rounded. */
  value: number | null;
  /**
   * Set when the inputs prevent derivation but the operator would
   * benefit from knowing why (e.g. quantity = 0 makes unit cost
   * undefined). UI surfaces this as a non-blocking inline hint.
   */
  hint?: string;
}

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
 * Given the order in which the user edited the three fields (most-recent
 * first) and the current values, derive the target field to recompute
 * and its new value.
 *
 * Rules (from #104 AC):
 * 1. The two most-recently-edited fields drive the third.
 * 2. If only one field has been edited, no derivation yet (returns
 *    `{ field: null, value: null }`).
 * 3. Operator override of an auto-filled value claims that field (it
 *    becomes most-recent) and the next-oldest becomes the recompute
 *    target.
 * 4. Quantity = 0 cannot divide — return a hint, no field update.
 * 5. Unit cost = 0 with non-zero total cannot divide for quantity —
 *    same hint pattern.
 *
 * The function does NOT touch any state of its own. Tests should
 * exercise the matrix directly.
 */
export function deriveLineField(
  values: LineValues,
  editOrder: ReadonlyArray<LineFieldName>
): DerivationResult {
  // Need at least two fields edited to know what to derive.
  const recent = editOrder.slice(0, 2);
  if (recent.length < 2) return { field: null, value: null };

  const allFields: LineFieldName[] = ['quantity', 'unitCost', 'totalCost'];
  const target = allFields.find((f) => !recent.includes(f));
  if (!target) return { field: null, value: null };

  const { quantity, unitCost, totalCost } = values;

  if (target === 'totalCost') {
    // qty + unit → total
    const next = quantity * unitCost;
    return {
      field: 'totalCost',
      value: roundForField('totalCost', next),
    };
  }

  if (target === 'unitCost') {
    // qty + total → unit
    if (quantity === 0) {
      return {
        field: null,
        value: null,
        hint: 'Enter a quantity above 0 to auto-compute unit cost.',
      };
    }
    const next = totalCost / quantity;
    return {
      field: 'unitCost',
      value: roundForField('unitCost', next),
    };
  }

  // target === 'quantity' — unit + total → qty
  if (unitCost === 0) {
    return {
      field: null,
      value: null,
      hint: 'Enter a unit cost above 0 to auto-compute quantity.',
    };
  }
  const next = totalCost / unitCost;
  return {
    field: 'quantity',
    value: roundForField('quantity', next),
  };
}

/**
 * Push a fresh edit to the front of the order, dedupe, and clamp to the
 * three fields. Used by callers to maintain the per-row edit-order list.
 */
export function pushEdit(
  current: ReadonlyArray<LineFieldName>,
  field: LineFieldName
): LineFieldName[] {
  return [field, ...current.filter((f) => f !== field)].slice(0, 3);
}
