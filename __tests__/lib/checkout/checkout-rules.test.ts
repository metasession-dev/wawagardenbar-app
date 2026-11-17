/**
 * @requirement REQ-121 — AC1 to AC6
 * @srs REQ-CHECKOUT-014, REQ-CHECKOUT-015, REQ-CHECKOUT-016, REQ-CHECKOUT-017,
 *      REQ-CHECKOUT-018, REQ-CHECKOUT-006
 *
 * Pure rules of the one-page customer checkout.
 */
import { describe, it, expect } from 'vitest';
import {
  buildCheckoutSchema,
  buildDeliveryInfo,
  computeTipAmount,
  DEFAULT_DELIVERY_REGION,
  fieldsForOrderType,
  GUEST_PAYMENT_EMAIL,
  isPayBlockedByHours,
  mapCheckoutError,
  paymentEmailFor,
  pickDefaultAddress,
  resolveInitialOrderType,
  TIP_PRESET_PERCENTS,
} from '@/lib/checkout/checkout-rules';

const base = {
  orderType: 'dine-in' as const,
  tableNumber: 'T12',
  pickupMode: 'asap' as const,
  tipAmount: 0,
};

describe('AC1: one page, no email, no tip method in the schema', () => {
  it('has no customer-info, email, phone, payment-method or tip-method field', () => {
    const schema = buildCheckoutSchema({ needsName: false });
    const keys = Object.keys(
      (schema as unknown as { _def?: { shape?: Record<string, unknown> } })._def
        ?.shape ?? {}
    );
    // zod 4 wraps the object in a refinement; fall back to a parse probe.
    const parsed = schema.safeParse({
      ...base,
      customerEmail: 'x@y.z',
      customerPhone: '0800',
      paymentMethod: 'CARD',
      tipPaymentMethod: 'cash',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty('customerEmail');
      expect(parsed.data).not.toHaveProperty('customerPhone');
      expect(parsed.data).not.toHaveProperty('paymentMethod');
      expect(parsed.data).not.toHaveProperty('tipPaymentMethod');
    }
    expect(keys).not.toContain('customerEmail');
  });
});

describe('AC2: name asked once, only when missing', () => {
  it('does not require a name when the account has one', () => {
    const schema = buildCheckoutSchema({ needsName: false });
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('requires exactly the first name when the account has none', () => {
    const schema = buildCheckoutSchema({ needsName: true });
    const missing = schema.safeParse(base);
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.map((i) => i.path[0])).toEqual(['firstName']);
    }
    expect(schema.safeParse({ ...base, firstName: ' A ' }).success).toBe(false);
    expect(schema.safeParse({ ...base, firstName: 'Ada' }).success).toBe(true);
  });
});

describe('AC3: fields per order type', () => {
  it('shows only the table for dine-in, the schedule for pickup, the address for delivery', () => {
    expect(fieldsForOrderType('dine-in')).toEqual(['tableNumber']);
    expect(fieldsForOrderType('pickup')).toEqual(['pickupSchedule']);
    expect(fieldsForOrderType('delivery')).toEqual(['deliveryAddress']);
  });

  it('requires the table for dine-in and nothing else', () => {
    const schema = buildCheckoutSchema({ needsName: false });
    const r = schema.safeParse({ ...base, tableNumber: '  ' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['tableNumber']);
  });

  it('pickup defaults to as soon as possible and needs a time only when scheduled', () => {
    const schema = buildCheckoutSchema({ needsName: false });
    const asap = schema.safeParse({
      orderType: 'pickup',
      pickupMode: 'asap',
      tipAmount: 0,
    });
    expect(asap.success).toBe(true);
    const later = schema.safeParse({
      orderType: 'pickup',
      pickupMode: 'later',
      tipAmount: 0,
    });
    expect(later.success).toBe(false);
    if (!later.success)
      expect(later.error.issues[0].path).toEqual(['pickupTime']);
    expect(
      schema.safeParse({
        orderType: 'pickup',
        pickupMode: 'later',
        pickupTime: '2026-11-17T18:00:00.000Z',
        tipAmount: 0,
      }).success
    ).toBe(true);
  });

  it('delivery needs one address line; landmark and instructions stay optional', () => {
    const schema = buildCheckoutSchema({ needsName: false });
    const r = schema.safeParse({
      orderType: 'delivery',
      pickupMode: 'asap',
      tipAmount: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['deliveryStreet']);
    expect(
      schema.safeParse({
        orderType: 'delivery',
        pickupMode: 'asap',
        deliveryStreet: '12 Allen Avenue',
        tipAmount: 0,
      }).success
    ).toBe(true);
  });

  it('a new address gets the default region; a saved address keeps its own', () => {
    const fresh = buildDeliveryInfo({
      street: ' 12 Allen Avenue ',
      landmark: ' Near the mall ',
    });
    expect(fresh).toMatchObject({
      street: '12 Allen Avenue',
      city: DEFAULT_DELIVERY_REGION.city,
      state: DEFAULT_DELIVERY_REGION.state,
      country: DEFAULT_DELIVERY_REGION.country,
      postalCode: '',
      landmark: 'Near the mall',
    });
    const saved = {
      streetAddress: '5 Ring Road',
      city: 'Ibadan',
      state: 'Oyo',
      postalCode: '200001',
      country: 'Nigeria',
      deliveryInstructions: 'Gate B',
      isDefault: true,
    };
    expect(buildDeliveryInfo({ street: '5 Ring Road', saved })).toMatchObject({
      city: 'Ibadan',
      state: 'Oyo',
      postalCode: '200001',
      instructions: 'Gate B',
    });
    // A different street typed over a saved one is a new address.
    expect(buildDeliveryInfo({ street: '9 Other Street', saved }).city).toBe(
      DEFAULT_DELIVERY_REGION.city
    );
  });

  it('preselects the default saved address, else the first, else none', () => {
    const a = { streetAddress: 'A', city: 'c', state: 's' };
    const b = { streetAddress: 'B', city: 'c', state: 's', isDefault: true };
    expect(pickDefaultAddress([a, b])).toBe(b);
    expect(pickDefaultAddress([a])).toBe(a);
    expect(pickDefaultAddress([])).toBeNull();
    expect(pickDefaultAddress(undefined)).toBeNull();
  });
});

describe('AC4: inline tip', () => {
  it('computes the preset and custom tip, rounded to kobo, never negative', () => {
    expect(TIP_PRESET_PERCENTS).toEqual([5, 10, 15]);
    expect(computeTipAmount(5000, { kind: 'preset', percent: 10 })).toBe(500);
    expect(computeTipAmount(3333, { kind: 'preset', percent: 15 })).toBe(
      499.95
    );
    expect(computeTipAmount(5000, { kind: 'custom', amount: 250.456 })).toBe(
      250.46
    );
    expect(computeTipAmount(5000, { kind: 'custom', amount: -5 })).toBe(0);
    expect(computeTipAmount(5000, { kind: 'none' })).toBe(0);
    expect(computeTipAmount(0, { kind: 'preset', percent: 10 })).toBe(0);
    expect(computeTipAmount(NaN, { kind: 'preset', percent: 10 })).toBe(0);
  });

  it('rejects a negative tip in the schema', () => {
    const schema = buildCheckoutSchema({ needsName: false });
    expect(schema.safeParse({ ...base, tipAmount: -1 }).success).toBe(false);
    expect(schema.safeParse({ ...base, tipAmount: 500 }).success).toBe(true);
  });
});

describe('AC5: preselect from the link', () => {
  const all = ['dine-in', 'pickup', 'delivery'] as const;

  it('uses ?type= when valid and enabled', () => {
    expect(
      resolveInitialOrderType({
        typeParam: 'delivery',
        hasTable: false,
        enabledTypes: all,
      })
    ).toBe('delivery');
  });

  it('selects dine-in when a table is given and no type', () => {
    expect(
      resolveInitialOrderType({
        typeParam: null,
        hasTable: true,
        lastUsed: 'pickup',
        enabledTypes: all,
      })
    ).toBe('dine-in');
  });

  it('falls back to the last-used type, then the first enabled type', () => {
    expect(
      resolveInitialOrderType({
        hasTable: false,
        lastUsed: 'pickup',
        enabledTypes: all,
      })
    ).toBe('pickup');
    expect(
      resolveInitialOrderType({
        hasTable: false,
        lastUsed: 'nonsense',
        enabledTypes: ['pickup', 'delivery'],
      })
    ).toBe('pickup');
  });

  it('never selects a type that is not enabled', () => {
    expect(
      resolveInitialOrderType({
        typeParam: 'delivery',
        hasTable: false,
        enabledTypes: ['dine-in'],
      })
    ).toBe('dine-in');
    expect(
      resolveInitialOrderType({
        hasTable: false,
        lastUsed: 'dine-in',
        enabledTypes: ['pickup'],
      })
    ).toBe('pickup');
  });

  it('accepts anything while the enabled types are still loading', () => {
    expect(
      resolveInitialOrderType({
        typeParam: 'pickup',
        hasTable: false,
        enabledTypes: null,
      })
    ).toBe('pickup');
  });
});

describe('AC6: typed errors inline, closed hours block Pay', () => {
  it('shows field errors next to the field', () => {
    expect(mapCheckoutError('OUT_OF_RADIUS', '6 km away')).toEqual({
      field: 'deliveryStreet',
      message: '6 km away',
    });
    expect(
      mapCheckoutError('ORDER_TYPE_DISABLED', 'pickup orders are disabled')
        .field
    ).toBe('orderType');
    expect(
      mapCheckoutError('INVALID_INPUT', 'tableNumber is required for dine-in')
        .field
    ).toBe('tableNumber');
    expect(
      mapCheckoutError('INVALID_INPUT', 'pickupTime is not a valid date').field
    ).toBe('pickupTime');
    expect(
      mapCheckoutError('INVALID_INPUT', 'A full delivery address is required')
        .field
    ).toBe('deliveryStreet');
  });

  it('shows the rest in the inline alert, with the server message', () => {
    for (const code of [
      'OUT_OF_HOURS',
      'BELOW_MINIMUM',
      'ITEM_UNAVAILABLE',
      'RATE_LIMITED',
      'NOT_ALLOWED',
    ]) {
      expect(mapCheckoutError(code, 'msg')).toEqual({
        field: 'root',
        message: 'msg',
      });
    }
    expect(mapCheckoutError(undefined, undefined).message).toMatch(
      /try again/i
    );
  });

  it('blocks Pay when closed for pickup and delivery, not for dine-in or while unknown', () => {
    expect(isPayBlockedByHours('pickup', false)).toBe(true);
    expect(isPayBlockedByHours('delivery', false)).toBe(true);
    expect(isPayBlockedByHours('dine-in', false)).toBe(false);
    expect(isPayBlockedByHours('pickup', true)).toBe(false);
    expect(isPayBlockedByHours('pickup', null)).toBe(false);
  });
});

describe('AC2: payment email for accounts without one', () => {
  it('uses the account email when present, else the guest address', () => {
    expect(paymentEmailFor('ada@example.com')).toBe('ada@example.com');
    expect(paymentEmailFor('  ')).toBe(GUEST_PAYMENT_EMAIL);
    expect(paymentEmailFor(undefined)).toBe(GUEST_PAYMENT_EMAIL);
  });
});
