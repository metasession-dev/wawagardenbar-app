/**
 * @requirement REQ-031 - End-to-end multi-inventory deduction for menu items with customization options
 * @requirement REQ-089 - Price override support for admin order management
 * @requirement REQ-097 - Fix half/quarter portion pricing (flat portion-option surcharge)
 * @requirement REQ-102 - Time-window price resolution (happy-hour > show > default)
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
 *   5. REQ-089: When a line carries an admin price override, use the overridden
 *      price instead of the menu price. The override is only accepted from
 *      admin-authenticated callers.
 *   6. REQ-102: Before the override check, resolve which of the menu item's
 *      three prices (price / showPrice / happyHourPrice) is active right now
 *      per SettingsService.resolveActivePriceField() (ADR-004) — the override
 *      always wins over whichever price that resolves to.
 */

import {
  validateSelectedCustomizations,
  type SelectedCustomization,
} from './customization-validation';
import { computeLineTotal } from './cart-line-math';
import { SettingsService } from '@/services';

const TAMPER_TOLERANCE_NAIRA = 1;

export type SubmittedLine = {
  menuItemId: string;
  quantity: number;
  portionMultiplier: number;
  customizations?: SelectedCustomization[];
  /** REQ-089: admin price override — when present, use this price instead of menu price. */
  priceOverride?: number;
};

export type MenuItemForReconcile = {
  _id: string;
  name: string;
  price: number;
  /** REQ-102 */
  showPrice: number;
  /** REQ-102 */
  happyHourPrice: number;
  customizations?: Array<{
    name: string;
    required?: boolean;
    options?: Array<{ name: string; price?: number; available?: boolean }>;
  }>;
  /** REQ-089: whether the menu item allows manual price override. */
  allowManualPriceOverride?: boolean;
  /** REQ-097: portion-size options — resolves the flat surcharge for the selected portion size. */
  portionOptions?: {
    halfPortionEnabled?: boolean;
    halfPortionSurcharge?: number;
    quarterPortionEnabled?: boolean;
    quarterPortionSurcharge?: number;
  };
};

export type ReconcileResult =
  | { valid: true; recomputedSubtotal: number }
  | { valid: false; error: string };

export async function reconcileAndValidateOrderLines({
  menuItems,
  lines,
  clientTotal,
}: {
  menuItems: Map<string, MenuItemForReconcile>;
  lines: SubmittedLine[];
  clientTotal?: number;
}): Promise<ReconcileResult> {
  let subtotal = 0;

  // REQ-102: resolved once per call — the active window doesn't change
  // mid-reconciliation, so every line in this order uses the same field.
  const activePriceField = await SettingsService.resolveActivePriceField();

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

    // REQ-102: resolve the time-window-active base price before considering
    // any manual override (ADR-004 precedence: happy-hour > show > default).
    // REQ-102/R-025 fallback — documents predating the showPrice/
    // happyHourPrice backfill migration read back `undefined` for those
    // fields (all three call sites fetch via `.lean()`, which bypasses
    // Mongoose schema defaults); never let an unmigrated document resolve
    // to a NaN/undefined charged price.
    const basePrice = menuItem[activePriceField] ?? menuItem.price;

    // REQ-089: use overridden price when admin supplies one and the menu item allows it.
    const effectivePrice =
      line.priceOverride !== undefined && menuItem.allowManualPriceOverride
        ? line.priceOverride
        : basePrice;

    // REQ-097: resolve the flat portion-option surcharge from the menu item
    // for the selected portion size — never from the client request.
    const portionSurcharge =
      line.portionMultiplier === 0.5
        ? (menuItem.portionOptions?.halfPortionSurcharge ?? 0)
        : line.portionMultiplier === 0.25
          ? (menuItem.portionOptions?.quarterPortionSurcharge ?? 0)
          : 0;

    const lineTotal = computeLineTotal({
      basePrice: effectivePrice,
      customizations,
      quantity: line.quantity,
      portionMultiplier: line.portionMultiplier,
      portionSurcharge,
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
