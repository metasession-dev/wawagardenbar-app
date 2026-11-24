/**
 * @requirement REQ-KITCHEN-010, REQ-KITCHEN-011 (REQ-124 AC4, AC5)
 */
import { describe, it, expect } from 'vitest';
import {
  firstNameOf,
  servingLabel,
  servingNameOf,
  formatDeliveryAddress,
  toKitchenOrder,
} from '@/lib/serving-label';

describe('firstNameOf', () => {
  it('takes the first word and ignores blanks and the Guest placeholder', () => {
    expect(firstNameOf('Ada Obi')).toBe('Ada');
    expect(firstNameOf('  Tunde  ')).toBe('Tunde');
    expect(firstNameOf('')).toBeNull();
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
    expect(firstNameOf('Guest')).toBeNull();
  });
});

describe('servingLabel', () => {
  it('[US-B1.5] dine-in at table 7 for "Ada Obi" reads "Table 7 · Ada"', () => {
    expect(servingLabel({ orderType: 'dine-in', tableNumber: '7', name: 'Ada Obi' })).toBe('Table 7 · Ada');
  });
  it('[US-B1.6] a tab customer reads "Table 3 · Tunde" and no name reads "No name"', () => {
    expect(servingLabel({ orderType: 'dine-in', tableNumber: 3, name: 'Tunde' })).toBe('Table 3 · Tunde');
    expect(servingLabel({ orderType: 'dine-in', tableNumber: '3', name: null })).toBe('Table 3 · No name');
  });
  it('omits the table for pickup and delivery', () => {
    expect(servingLabel({ orderType: 'pickup', tableNumber: '9', name: 'Ada Obi' })).toBe('Pickup · Ada');
    expect(servingLabel({ orderType: 'delivery', name: 'Ada' })).toBe('Delivery · Ada');
    expect(servingLabel({ orderType: 'delivery' })).toBe('Delivery · No name');
  });
  it('handles dine-in with no table and pay-now', () => {
    expect(servingLabel({ orderType: 'dine-in', name: 'Ada' })).toBe('Dine-in · Ada');
    expect(servingLabel({ orderType: 'pay-now', name: 'Ada' })).toBe('Counter · Ada');
  });
});

describe('servingNameOf / toKitchenOrder', () => {
  it('prefers servingName over customer.name', () => {
    expect(servingNameOf({ servingName: 'Ada Obi', customer: { name: 'Guest' } })).toBe('Ada Obi');
    expect(servingNameOf({ customer: { name: 'Tunde B' } })).toBe('Tunde B');
    expect(servingNameOf({})).toBeNull();
  });
  it('[US-B1.5] strips phone, email and the full name for the kitchen', () => {
    const k = toKitchenOrder({
      orderNumber: 'WG1',
      servingName: 'Ada Obi',
      customer: { name: 'Ada Obi', email: 'a@b.c', phone: '2348000000000' },
    });
    expect(k.customer).toEqual({ name: 'Ada' });
    expect(k.servingName).toBe('Ada');
    expect(JSON.stringify(k)).not.toMatch(/Obi|a@b\.c|2348000000000/);
  });
});

describe('formatDeliveryAddress', () => {
  it('joins the parts of an address object and passes strings through', () => {
    expect(
      formatDeliveryAddress({ street: '12 Bode St', street2: 'Flat 2', city: 'Ikeja', state: 'Lagos', country: 'NG' })
    ).toBe('12 Bode St, Flat 2, Ikeja, Lagos');
    expect(formatDeliveryAddress(' 5 Road ')).toBe('5 Road');
    expect(formatDeliveryAddress(null)).toBe('');
  });
});
