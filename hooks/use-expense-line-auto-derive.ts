'use client';

/**
 * Per-row auto-derive hook for the expense line item editor.
 *
 * Rules (#104, simplified):
 * - Qty is the anchor — if qty is not > 0, nothing computes.
 * - User edits Unit Cost → Total recomputes as qty × unitCost. Unit Cost
 *   becomes "last edited of {unitCost, totalCost}".
 * - User edits Total → Unit Cost recomputes as total / qty. Total becomes
 *   "last edited".
 * - User edits Qty → recompute whichever of {Unit Cost, Total} is NOT the
 *   last-edited one (so the operator's most recent number stays stable).
 *   If neither has been edited yet, no-op.
 *
 * State per row: just one bit — `lastEdited: 'unitCost' | 'totalCost' | null`.
 * No edit-order array, no pushEdit. The zero-value-clear ambiguity the
 * earlier 3-field tracker was vulnerable to (#106) doesn't exist here
 * because Qty isn't tracked at all.
 *
 * Both `expense-form.tsx` and `edit-pending-group-dialog.tsx` call
 * `onFieldEdit(index, field)` from each input's onChange.
 *
 * Ref: #104
 */
import { useRef, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  computeTotal,
  computeUnitCost,
  type LineFieldName,
} from '@/lib/expense-line-derivation';

interface UseExpenseLineAutoDeriveOptions {
  form: UseFormReturn<any>;
}

type LastEdited = 'unitCost' | 'totalCost' | null;

export function useExpenseLineAutoDerive({
  form,
}: UseExpenseLineAutoDeriveOptions) {
  // Per-row last-edited tracker. Kept in a ref so updates don't trigger
  // renders — the form re-renders on its own when we call setValue.
  const lastEditedRef = useRef<Record<number, LastEdited>>({});

  const onFieldEdit = useCallback(
    (index: number, field: LineFieldName) => {
      const item = form.getValues(`items.${index}`) ?? {};
      const q = Number(item.quantity ?? 0);
      const u = Number(item.unitCost ?? 0);
      const t = Number(item.totalCost ?? 0);

      const setIfNumber = (
        target: 'unitCost' | 'totalCost',
        value: number | null
      ) => {
        if (value === null) return;
        form.setValue(`items.${index}.${target}`, value, {
          shouldDirty: true,
          shouldValidate: false,
          shouldTouch: false,
        });
      };

      if (field === 'unitCost') {
        // Operator asserted Unit Cost. Recompute Total.
        setIfNumber('totalCost', computeTotal(q, u));
        lastEditedRef.current[index] = 'unitCost';
        return;
      }

      if (field === 'totalCost') {
        // Operator asserted Total. Recompute Unit Cost.
        setIfNumber('unitCost', computeUnitCost(q, t));
        lastEditedRef.current[index] = 'totalCost';
        return;
      }

      // field === 'quantity'. Recompute the NON-last-edited of
      // {unitCost, totalCost} so the operator's last-asserted figure
      // stays stable. If neither has been edited yet, no-op.
      const last = lastEditedRef.current[index] ?? null;
      if (last === 'unitCost') {
        setIfNumber('totalCost', computeTotal(q, u));
      } else if (last === 'totalCost') {
        setIfNumber('unitCost', computeUnitCost(q, t));
      }
    },
    [form]
  );

  /**
   * Clears the tracking for an index — call when removing a row so a
   * later row that re-uses that index doesn't inherit stale state.
   */
  const resetRow = useCallback((index: number) => {
    delete lastEditedRef.current[index];
  }, []);

  /**
   * Clears all tracking — call from the dialog's open effect so a fresh
   * session doesn't inherit state from the previous open.
   */
  const resetAll = useCallback(() => {
    lastEditedRef.current = {};
  }, []);

  return { onFieldEdit, resetRow, resetAll };
}
