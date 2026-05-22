'use client';

/**
 * Per-row {qty, unit cost, total} auto-derivation hook for the expense
 * line item editor.
 *
 * Both the Add Expense form (expense-form.tsx) and the Edit Pending
 * Expense Group dialog (edit-pending-group-dialog.tsx) wire the same
 * three inputs through this hook. The hook owns the per-row edit-order
 * tracking (which two fields the operator touched most recently) and
 * does the round-trip into react-hook-form's `setValue`. Math + rules
 * live in `lib/expense-line-derivation.ts`.
 *
 * Hint string for the divide-by-zero edge cases is exposed via
 * `getHint(index)` so the parent form can render a non-blocking
 * `aria-live="polite"` message under the affected input.
 *
 * Ref: #104
 */
import { useRef, useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  deriveLineField,
  pushEdit,
  type LineFieldName,
} from '@/lib/expense-line-derivation';

interface UseExpenseLineAutoDeriveOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}

export function useExpenseLineAutoDerive({
  form,
}: UseExpenseLineAutoDeriveOptions) {
  // Per-row edit-order. Kept in a ref so it doesn't trigger renders;
  // hint state lives in React state because the UI needs to react.
  const editOrderRef = useRef<Record<number, LineFieldName[]>>({});
  const [hints, setHints] = useState<Record<number, string | undefined>>({});

  const onFieldEdit = useCallback(
    (index: number, field: LineFieldName) => {
      const item = form.getValues(`items.${index}`) ?? {};
      const q = Number(item.quantity ?? 0);
      const u = Number(item.unitCost ?? 0);
      const t = Number(item.totalCost ?? 0);
      const fieldValue =
        field === 'quantity' ? q : field === 'unitCost' ? u : t;

      // Edits with value 0 don't claim the field. Two reasons:
      //
      // 1. Per AC4, "the next blank/oldest recomputes" — blank = 0 here.
      //    A field at 0 is by definition the recompute target candidate,
      //    not a user-asserted constraint.
      // 2. Clearing a field (backspacing 0.50 to empty) fires onChange
      //    with value 0; that's a clear, not a "set to zero" assertion.
      //    Without this guard, deriveLineField targets the wrong field —
      //    see the UAT bug where Qty=2 + Total=70000 with a cleared
      //    Unit Cost field wrongly targeted Quantity (asking the user
      //    to "Enter a unit cost above 0 to auto-compute quantity"
      //    instead of computing Unit Cost = 35000).
      const prev = editOrderRef.current[index] ?? [];
      const next =
        fieldValue > 0
          ? pushEdit(prev, field)
          : prev.filter((f) => f !== field);
      editOrderRef.current[index] = next;

      const result = deriveLineField(
        { quantity: q, unitCost: u, totalCost: t },
        next
      );

      // Update the hint (clears when there's nothing to say).
      setHints((h) => ({ ...h, [index]: result.hint }));

      if (result.field && result.value !== null) {
        form.setValue(`items.${index}.${result.field}`, result.value, {
          shouldDirty: true,
          shouldValidate: false,
          shouldTouch: false,
        });
      }
    },
    [form]
  );

  const getHint = useCallback(
    (index: number): string | undefined => hints[index],
    [hints]
  );

  /**
   * Clears the tracking for an index — call when removing a row so a
   * later row that re-uses that index doesn't inherit stale edits.
   */
  const resetRow = useCallback((index: number) => {
    delete editOrderRef.current[index];
    setHints((h) => {
      const next = { ...h };
      delete next[index];
      return next;
    });
  }, []);

  /**
   * Clears all edit tracking — call from the dialog's open effect so a
   * fresh session doesn't inherit history from the previous open.
   */
  const resetAll = useCallback(() => {
    editOrderRef.current = {};
    setHints({});
  }, []);

  return { onFieldEdit, getHint, resetRow, resetAll };
}
