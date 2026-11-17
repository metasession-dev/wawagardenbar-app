/**
 * @requirement REQ-121 - One-page customer checkout
 * @srs REQ-CHECKOUT-014, REQ-CHECKOUT-015, REQ-CHECKOUT-016, REQ-CHECKOUT-017,
 *      REQ-CHECKOUT-018, REQ-CHECKOUT-006
 *
 * Pure rules for the one-page customer checkout: which fields each order type
 * needs, the form schema, the inline tip, the order type preselect and the
 * mapping of `createCustomerOrder` typed errors to a field. No React, no I/O,
 * so every rule is unit-tested without a browser. The server stays the source
 * of truth for totals, hours and delivery range (ADR-010).
 */
import { z } from '@/lib/zod';

export const CHECKOUT_ORDER_TYPES = ['dine-in', 'pickup', 'delivery'] as const;
export type CheckoutOrderType = (typeof CHECKOUT_ORDER_TYPES)[number];

/** Inline tip presets, as a percentage of the subtotal. */
export const TIP_PRESET_PERCENTS = [5, 10, 15] as const;

/**
 * Region used for a new delivery address, where the customer types one line
 * plus a landmark (REQ-CHECKOUT-016). City and state are not asked; the
 * delivery-radius check still protects against a wrong address.
 */
export const DEFAULT_DELIVERY_REGION = {
  city: 'Lagos',
  state: 'Lagos',
  country: 'Nigeria',
} as const;

/** Used for the payment provider when the account has no email (REQ-CHECKOUT-015). */
export const GUEST_PAYMENT_EMAIL = 'guest@wawagardenbar.com';

/** The form fields (besides the order type itself) that an order type shows. */
export type CheckoutFieldGroup =
  | 'tableNumber'
  | 'pickupSchedule'
  | 'deliveryAddress';

/** REQ-CHECKOUT-016 — fields per order type; address fields exist for delivery only. */
export function fieldsForOrderType(
  orderType: CheckoutOrderType
): CheckoutFieldGroup[] {
  switch (orderType) {
    case 'dine-in':
      return ['tableNumber'];
    case 'pickup':
      return ['pickupSchedule'];
    case 'delivery':
      return ['deliveryAddress'];
  }
}

export interface BuildCheckoutSchemaOptions {
  /** True when the account has no first name yet (REQ-CHECKOUT-015). */
  needsName: boolean;
}

/** One-page checkout schema. Phone comes from the session and email is never asked. */
export function buildCheckoutSchema({ needsName }: BuildCheckoutSchemaOptions) {
  return z
    .object({
      firstName: z.string().optional(),
      orderType: z.enum(CHECKOUT_ORDER_TYPES),
      tableNumber: z.string().optional(),
      pickupMode: z.enum(['asap', 'later']),
      pickupTime: z.string().optional(),
      deliveryStreet: z.string().optional(),
      deliveryLandmark: z.string().optional(),
      deliveryInstructions: z.string().optional(),
      specialInstructions: z.string().optional(),
      tipAmount: z.number().min(0, 'Tip cannot be negative'),
    })
    .superRefine((data, ctx) => {
      if (needsName && (data.firstName?.trim().length ?? 0) < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['firstName'],
          message: 'Please enter your first name',
        });
      }
      if (data.orderType === 'dine-in' && !data.tableNumber?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['tableNumber'],
          message: 'Table number is required for dine-in orders',
        });
      }
      if (
        data.orderType === 'pickup' &&
        data.pickupMode === 'later' &&
        !data.pickupTime
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['pickupTime'],
          message: 'Choose a pickup time, or pick "As soon as possible"',
        });
      }
      if (data.orderType === 'delivery' && !data.deliveryStreet?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['deliveryStreet'],
          message: 'Delivery address is required',
        });
      }
    });
}

export type CheckoutFormValues = z.infer<
  ReturnType<typeof buildCheckoutSchema>
>;

export type TipSelection =
  | { kind: 'none' }
  | { kind: 'preset'; percent: number }
  | { kind: 'custom'; amount: number };

/** REQ-CHECKOUT-006 — tip amount in naira, rounded to kobo; never negative. */
export function computeTipAmount(
  subtotal: number,
  selection: TipSelection
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (selection.kind === 'preset') {
    if (!Number.isFinite(selection.percent) || selection.percent <= 0) return 0;
    return Math.round(subtotal * selection.percent) / 100;
  }
  if (selection.kind === 'custom') {
    if (!Number.isFinite(selection.amount) || selection.amount <= 0) return 0;
    return Math.round(selection.amount * 100) / 100;
  }
  return 0;
}

export interface InitialOrderTypeInput {
  /** `?type=` query parameter. */
  typeParam?: string | null;
  /** True when `?table=` (or a scanned table) is present. */
  hasTable: boolean;
  /** The customer's last-used type, from the device. */
  lastUsed?: string | null;
  /** Types enabled in Settings; null while not loaded yet. */
  enabledTypes: readonly CheckoutOrderType[] | null;
}

function isOrderType(value: unknown): value is CheckoutOrderType {
  return (
    typeof value === 'string' &&
    (CHECKOUT_ORDER_TYPES as readonly string[]).includes(value)
  );
}

/**
 * REQ-CHECKOUT-017 — preselect: a valid `?type=`, else dine-in when a table is
 * given, else the last-used type, else the first enabled type. A type that is
 * not enabled is never selected.
 */
export function resolveInitialOrderType(
  input: InitialOrderTypeInput
): CheckoutOrderType {
  const allowed = (type: CheckoutOrderType) =>
    input.enabledTypes === null || input.enabledTypes.includes(type);
  const candidates: unknown[] = [
    input.typeParam,
    input.hasTable ? 'dine-in' : undefined,
    input.lastUsed,
  ];
  for (const candidate of candidates) {
    if (isOrderType(candidate) && allowed(candidate)) return candidate;
  }
  const firstEnabled = (input.enabledTypes ?? CHECKOUT_ORDER_TYPES).find(
    allowed
  );
  return firstEnabled ?? 'dine-in';
}

export type CheckoutErrorField =
  | 'root'
  | 'orderType'
  | 'tableNumber'
  | 'pickupTime'
  | 'deliveryStreet'
  | 'firstName';

export interface MappedCheckoutError {
  field: CheckoutErrorField;
  message: string;
}

const GENERIC_ERROR = 'We could not place your order. Please try again.';

/**
 * REQ-CHECKOUT-018 — where a `createCustomerOrder` typed error is shown. A
 * field-specific error goes next to that field; the rest show in the inline
 * alert above the Pay button. Never a dialog.
 */
export function mapCheckoutError(
  code: string | undefined,
  message?: string
): MappedCheckoutError {
  const text = message?.trim() || GENERIC_ERROR;
  switch (code) {
    case 'OUT_OF_RADIUS':
      return { field: 'deliveryStreet', message: text };
    case 'ORDER_TYPE_DISABLED':
      return { field: 'orderType', message: text };
    case 'INVALID_INPUT': {
      const lower = text.toLowerCase();
      if (lower.includes('tablenumber') || lower.includes('table number')) {
        return { field: 'tableNumber', message: 'Table number is required' };
      }
      if (lower.includes('pickuptime') || lower.includes('pickup time')) {
        return { field: 'pickupTime', message: 'Choose a valid pickup time' };
      }
      if (lower.includes('delivery address')) {
        return {
          field: 'deliveryStreet',
          message: 'Delivery address is required',
        };
      }
      return { field: 'root', message: text };
    }
    case 'OUT_OF_HOURS':
    case 'BELOW_MINIMUM':
    case 'ITEM_UNAVAILABLE':
    case 'RATE_LIMITED':
    case 'NOT_ALLOWED':
    case 'IDEMPOTENCY_KEY_REQUIRED':
    default:
      return { field: 'root', message: text };
  }
}

/**
 * REQ-CHECKOUT-014 — Pay is blocked while the business is closed for pickup
 * and delivery. Dine-in is exempt, matching the server rule (REQ-061): the
 * customer is already at the bar.
 */
export function isPayBlockedByHours(
  orderType: CheckoutOrderType,
  isOpenNow: boolean | null
): boolean {
  if (isOpenNow !== false) return false;
  return orderType !== 'dine-in';
}

export interface SavedAddressLike {
  streetAddress: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

/** The default saved address, else the first one, else null. */
export function pickDefaultAddress<T extends SavedAddressLike>(
  addresses: readonly T[] | undefined | null
): T | null {
  if (!addresses || addresses.length === 0) return null;
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}

export interface DeliveryInfoInput {
  street: string;
  landmark?: string;
  instructions?: string;
  /** Saved address in use, if the customer did not type a new one. */
  saved?: SavedAddressLike | null;
}

export interface DeliveryInfo {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
  instructions?: string;
}

/**
 * REQ-CHECKOUT-016 — the delivery address sent to the server. A saved address
 * keeps its own city, state and postal code; a new one gets the default region.
 */
export function buildDeliveryInfo(input: DeliveryInfoInput): DeliveryInfo {
  const saved = input.saved;
  const street = input.street.trim();
  const landmark = input.landmark?.trim() || undefined;
  const instructions = input.instructions?.trim() || undefined;
  if (saved && saved.streetAddress.trim() === street) {
    return {
      street,
      city: saved.city,
      state: saved.state,
      postalCode: saved.postalCode ?? '',
      country: saved.country || DEFAULT_DELIVERY_REGION.country,
      landmark,
      instructions: instructions ?? saved.deliveryInstructions,
    };
  }
  return {
    street,
    city: DEFAULT_DELIVERY_REGION.city,
    state: DEFAULT_DELIVERY_REGION.state,
    postalCode: '',
    country: DEFAULT_DELIVERY_REGION.country,
    landmark,
    instructions,
  };
}

/** REQ-CHECKOUT-015 — email for the payment provider; the checkout never asks for one. */
export function paymentEmailFor(email?: string | null): string {
  const trimmed = email?.trim();
  return trimmed ? trimmed : GUEST_PAYMENT_EMAIL;
}
