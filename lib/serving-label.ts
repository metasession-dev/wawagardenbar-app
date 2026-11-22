/**
 * @requirement REQ-KITCHEN-010 — Serving check header (REQ-124, AC4)
 * @requirement REQ-KITCHEN-011 — Delivery details on the kitchen card (REQ-124, AC5)
 *
 * Pure helpers shared by the kitchen card, the dashboard order card and the
 * order queue (which renders the order card), so every surface reads the same.
 */

export const NO_NAME = 'No name';

/** The first word of a full name, or null when there is nothing usable. */
export function firstNameOf(full: string | null | undefined): string | null {
  const word = (full ?? '').trim().split(/\s+/)[0];
  if (!word) return null;
  // The order serializer's placeholder for an anonymous order is not a name.
  if (word.toLowerCase() === 'guest') return null;
  return word;
}

export interface ServingLabelInput {
  orderType?: string | null;
  tableNumber?: string | number | null;
  /** Any full or first name; only the first word is used. */
  name?: string | null;
}

/** `Table 7 · Ada`, `Pickup · Ada`, `Delivery · Ada`; `No name` when missing. */
export function servingLabel(input: ServingLabelInput): string {
  const first = firstNameOf(input.name) ?? NO_NAME;
  const table =
    input.tableNumber !== undefined &&
    input.tableNumber !== null &&
    String(input.tableNumber).trim() !== ''
      ? String(input.tableNumber).trim()
      : null;
  switch (input.orderType) {
    case 'pickup':
      return `Pickup · ${first}`;
    case 'delivery':
      return `Delivery · ${first}`;
    case 'pay-now':
      return `Counter · ${first}`;
    default:
      return table ? `Table ${table} · ${first}` : `Dine-in · ${first}`;
  }
}

/**
 * The name to show, in order: the serialized serving name (account name for
 * customer orders, tab customer or order name for staff orders), then the
 * serialized customer name.
 */
export function servingNameOf(order: {
  servingName?: string | null;
  customer?: { name?: string | null } | null;
}): string | null {
  return order.servingName ?? order.customer?.name ?? null;
}

export interface DeliveryAddressLike {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** One printable line for a delivery address; empty string when none. */
export function formatDeliveryAddress(
  address: DeliveryAddressLike | string | null | undefined
): string {
  if (!address) return '';
  if (typeof address === 'string') return address.trim();
  return [
    address.street,
    address.street2,
    address.city,
    address.state,
    address.postalCode,
  ]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * REQ-124 (AC4) — the kitchen sees a first name only. Drops phone, email and
 * the full name from a serialized order before it reaches the kitchen display.
 */
export function toKitchenOrder<
  T extends {
    servingName?: string | null;
    customer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  },
>(order: T): T {
  const first = firstNameOf(servingNameOf(order));
  return {
    ...order,
    servingName: first,
    customer: { name: first },
  };
}
