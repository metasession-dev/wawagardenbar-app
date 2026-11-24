/**
 * @requirement REQ-ORDMGT-020 (REQ-124 AC7) — the staff status transition table.
 */
import { describe, it, expect } from 'vitest';
import {
  allowedNextStatuses,
  canTransition,
  ACTIVE_STATUSES,
} from '@/lib/order-status-transitions';

describe('allowedNextStatuses', () => {
  it('keeps the existing table for every order type', () => {
    for (const type of ['dine-in', 'pickup', 'pay-now', undefined]) {
      expect(allowedNextStatuses('pending', type)).toEqual([
        'preparing',
        'cancelled',
      ]);
      expect(allowedNextStatuses('confirmed', type)).toEqual([
        'preparing',
        'cancelled',
      ]);
      expect(allowedNextStatuses('preparing', type)).toEqual([
        'ready',
        'cancelled',
      ]);
      expect(allowedNextStatuses('ready', type)).toEqual([
        'completed',
        'cancelled',
      ]);
      expect(allowedNextStatuses('completed', type)).toEqual([]);
      expect(allowedNextStatuses('cancelled', type)).toEqual([]);
    }
  });

  it('[US-A4.2] a ready delivery order can go out for delivery, then delivered, then completed', () => {
    expect(allowedNextStatuses('ready', 'delivery')).toContain(
      'out-for-delivery'
    );
    expect(allowedNextStatuses('out-for-delivery', 'delivery')).toEqual([
      'delivered',
      'cancelled',
    ]);
    expect(allowedNextStatuses('delivered', 'delivery')).toEqual(['completed']);
  });

  it('a ready delivery order can still be completed or cancelled', () => {
    expect(allowedNextStatuses('ready', 'delivery')).toEqual(
      expect.arrayContaining(['completed', 'cancelled'])
    );
  });

  it('non-delivery orders never get the delivery steps', () => {
    for (const type of ['dine-in', 'pickup', 'pay-now']) {
      expect(canTransition('ready', type, 'out-for-delivery')).toBe(false);
      expect(canTransition('out-for-delivery', type, 'delivered')).toBe(false);
      expect(canTransition('delivered', type, 'completed')).toBe(false);
    }
  });

  it('delivery orders cannot skip a step or go backwards', () => {
    expect(canTransition('preparing', 'delivery', 'out-for-delivery')).toBe(
      false
    );
    expect(canTransition('ready', 'delivery', 'delivered')).toBe(false);
    expect(canTransition('delivered', 'delivery', 'out-for-delivery')).toBe(
      false
    );
    expect(canTransition('out-for-delivery', 'delivery', 'completed')).toBe(
      false
    );
  });

  it('staff cannot set confirmed (payment does that)', () => {
    for (const from of ['pending', 'preparing', 'ready']) {
      expect(canTransition(from, 'delivery', 'confirmed')).toBe(false);
    }
  });
});

describe('ACTIVE_STATUSES', () => {
  it('keeps delivery orders on the Active tab until they are completed', () => {
    expect(ACTIVE_STATUSES).toEqual(
      expect.arrayContaining(['ready', 'out-for-delivery', 'delivered'])
    );
    expect(ACTIVE_STATUSES).not.toContain('completed');
    expect(ACTIVE_STATUSES).not.toContain('cancelled');
  });
});
