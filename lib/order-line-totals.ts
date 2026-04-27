/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 *
 * Server-side reconciler. Single source of truth for the three order-creating
 * actions:
 *   - app/actions/admin/express-actions.ts (expressCreateOrderAction)
 *   - app/actions/admin/order-edit-actions.ts (updateOrderItemsAction)
 *   - app/api/public/orders/route.ts (POST handler)
 *
 * Responsibilities:
 *   1. Validate each line's customizations exist on the menu item being ordered.
 *      Required-group enforcement is the picker's job (AC1, isValid in
 *      lib/customization-picker-state.ts), NOT this helper's. Server only
 *      validates that what was submitted matches the menu definition.
 *   2. Recompute the per-line total using lib/cart-line-math.ts (the menu is
 *      the source of truth for prices, not the client request).
 *   3. Sum into a server-recomputed subtotal. Caller persists this on the
 *      order document (do NOT trust client-supplied subtotal).
 *   4. If the caller supplies clientTotal, reject when it differs by more
 *      than 1-naira rounding tolerance (AC15).
 */

import {
  validateSelectedCustomizations,
  type SelectedCustomization,
} from './customization-validation';
import { computeLineTotal } from './cart-line-math';

const TAMPER_TOLERANCE_NAIRA = 1;

export type SubmittedLine = {
  menuItemId: string;
  quantity: number;
  portionMultiplier: number;
  customizations?: SelectedCustomization[];
};

export type MenuItemForReconcile = {
  _id: string;
  name: string;
  price: number;
  customizations?: Array<{
    name: string;
    required?: boolean;
    options?: Array<{ name: string; price?: number; available?: boolean }>;
  }>;
};

export type ReconcileResult =
  | { valid: true; recomputedSubtotal: number }
  | { valid: false; error: string };

export function reconcileAndValidateOrderLines({
  menuItems,
  lines,
  clientTotal,
}: {
  menuItems: Map<string, MenuItemForReconcile>;
  lines: SubmittedLine[];
  clientTotal?: number;
}): ReconcileResult {
  let subtotal = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const menuItem = menuItems.get(line.menuItemId);
    if (!menuItem) {
      return {
        valid: false,
        error: `items[${i}]: menu item "${line.menuItemId}" not found`,
      };
    }

    const customizations = line.customizations ?? [];
    const validation = validateSelectedCustomizations(menuItem, customizations);
    if (!validation.valid) {
      return {
        valid: false,
        error: `items[${i}]: ${validation.error}`,
      };
    }

    const lineTotal = computeLineTotal({
      basePrice: menuItem.price,
      customizations,
      quantity: line.quantity,
      portionMultiplier: line.portionMultiplier,
    });
    subtotal += lineTotal;
  }

  if (typeof clientTotal === 'number') {
    const diff = Math.abs(clientTotal - subtotal);
    if (diff > TAMPER_TOLERANCE_NAIRA) {
      return {
        valid: false,
        error: `total mismatch: client claimed ₦${clientTotal} but server-recomputed ₦${subtotal}`,
      };
    }
  }

  return { valid: true, recomputedSubtotal: subtotal };
}
