/**
 * @requirement REQ-127 — a failed payment start keeps one Pending order
 * @srs REQ-CHECKOUT-019, REQ-CHECKOUT-008
 *
 * After `createOrder` succeeds and `initializePayment` fails, the order exists
 * (Payment Pending) and the cart is kept. The idempotency key used to be
 * generated once per mount, so:
 *   - leaving checkout and coming back created a new key and a second Pending
 *     order for the same items, and
 *   - changing the cart before retrying kept the old key, so the server returned
 *     the old order (old items, old tip) for the new cart.
 *
 * This helper ties the key to what the order is made of. The stored attempt is
 * `{ key, fingerprint, orderId, createdAt }` in `sessionStorage`:
 *   - same fingerprint, still fresh: reuse the key, so the server returns the
 *     same Pending order and payment is started for it again;
 *   - different fingerprint: a new key, and the old order id is returned so the
 *     caller can cancel the superseded unpaid order;
 *   - expired (older than the unpaid-order expiry, with margin) or unreadable
 *     storage: a new key, exactly as before.
 * The stored value is an opaque key, an order id and a hash; no personal data.
 */

const STORAGE_KEY = 'wgb:checkout-attempt';

/** Unpaid customer orders expire after 30 minutes (REQ-123); stay well inside. */
export const CHECKOUT_ATTEMPT_TTL_MS = 20 * 60 * 1000;

export interface CheckoutAttempt {
  key: string;
  fingerprint: string;
  orderId: string | null;
  createdAt: number;
}

export interface CheckoutFingerprintInput {
  orderType: string;
  items: Array<{
    id: string;
    quantity: number;
    portionMultiplier?: number;
    specialInstructions?: string;
    customizations?: Array<{ id?: string; name?: string; price?: number }>;
  }>;
  tableNumber?: string;
  pickupTime?: string;
  /** Any string that changes when the delivery details change. */
  delivery?: string;
  specialInstructions?: string;
  /** The tip is part of the order total the server computes, so it counts. */
  tipAmount?: number;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Two 32-bit FNV-1a hashes joined: not security, only change detection. */
function hash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`;
}

export function cartFingerprint(input: CheckoutFingerprintInput): string {
  const items = [...input.items]
    .map((i) => ({
      id: i.id,
      q: i.quantity,
      p: i.portionMultiplier ?? 1,
      s: i.specialInstructions?.trim() || undefined,
      c: (i.customizations ?? [])
        .map((c) => `${c.id ?? c.name ?? ''}:${c.price ?? 0}`)
        .sort(),
    }))
    .sort((a, b) => stable(a).localeCompare(stable(b)));
  return hash(
    stable({
      t: input.orderType,
      items,
      table: input.tableNumber?.trim() || undefined,
      pickup: input.pickupTime || undefined,
      delivery: input.delivery || undefined,
      note: input.specialInstructions?.trim() || undefined,
      tip: input.tipAmount || 0,
    })
  );
}

export function newCheckoutKey(): string {
  return `checkout-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCheckoutAttempt(now = Date.now()): CheckoutAttempt | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutAttempt>;
    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.fingerprint !== 'string' ||
      typeof parsed.createdAt !== 'number' ||
      now - parsed.createdAt > CHECKOUT_ATTEMPT_TTL_MS
    ) {
      return null;
    }
    return {
      key: parsed.key,
      fingerprint: parsed.fingerprint,
      orderId: typeof parsed.orderId === 'string' ? parsed.orderId : null,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function writeCheckoutAttempt(attempt: CheckoutAttempt): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // Storage blocked or full: the retry just gets a fresh key, as before.
  }
}

export function clearCheckoutAttempt(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

export interface ResolvedAttempt {
  key: string;
  /** An unpaid order from an earlier attempt that this cart replaces. */
  supersededOrderId: string | null;
  /** True when the key (and so the order) is reused. */
  reused: boolean;
}

/**
 * Decide which key to use for this cart. Pure apart from reading storage.
 * The caller records the attempt with `writeCheckoutAttempt` once it knows the
 * order id.
 */
export function resolveCheckoutAttempt(
  fingerprint: string,
  now = Date.now()
): ResolvedAttempt {
  const stored = readCheckoutAttempt(now);
  if (stored && stored.fingerprint === fingerprint) {
    return { key: stored.key, supersededOrderId: null, reused: true };
  }
  return {
    key: newCheckoutKey(),
    supersededOrderId: stored?.orderId ?? null,
    reused: false,
  };
}
