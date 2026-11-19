/**
 * @requirement REQ-123 — AC5
 * @srs REQ-KITCHEN-009, REQ-ORDMGT-001
 *
 * The paid-only kitchen gate: one predicate, used by every live queue. Staff
 * orders (express, tab, counter) always pass; a customer order passes only
 * once it is paid.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));
const find = vi.hoisted(() => vi.fn());
vi.mock('@/models/order-model', () => ({ default: { find } }));
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: {},
}));

import { OrderService } from '@/services/order-service';
import {
  AWAITING_PAYMENT_QUERY,
  LIVE_QUEUE_GATE,
} from '@/lib/order-queue-gate';

/** Evaluate the gate's `$or` the way MongoDB would, against one document. */
function passesGate(doc: { origin?: string; paymentStatus?: string }): boolean {
  return LIVE_QUEUE_GATE.$or.some((clause) =>
    Object.entries(clause).every(([key, cond]) => {
      const value = (doc as Record<string, unknown>)[key];
      if (typeof cond === 'object' && cond && '$ne' in cond) {
        return value !== (cond as { $ne: unknown }).$ne;
      }
      return value === cond;
    })
  );
}

describe('REQ-123 AC5: the live-queue predicate', () => {
  it('[US-B1.3] an unpaid customer order is absent; an unpaid staff express order is present', () => {
    expect(passesGate({ origin: 'customer', paymentStatus: 'pending' })).toBe(
      false
    );
    expect(passesGate({ origin: 'staff', paymentStatus: 'pending' })).toBe(
      true
    );
  });

  it('[US-B1.4] a csr tab order (staff, unsettled) is present at once', () => {
    expect(passesGate({ origin: 'staff', paymentStatus: 'pending' })).toBe(
      true
    );
  });

  it('a paid customer order is present', () => {
    expect(passesGate({ origin: 'customer', paymentStatus: 'paid' })).toBe(
      true
    );
  });

  it('an order written before `origin` existed is treated as staff', () => {
    expect(passesGate({ paymentStatus: 'pending' })).toBe(true);
  });

  it('a payment_mismatch or cancelled customer order stays out of the live queue', () => {
    expect(
      passesGate({ origin: 'customer', paymentStatus: 'payment_mismatch' })
    ).toBe(false);
    expect(passesGate({ origin: 'customer', paymentStatus: 'cancelled' })).toBe(
      false
    );
  });
});

describe('REQ-123 AC5: OrderService.getActiveOrders applies the gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    find.mockReturnValue({ sort: () => ({ lean: async () => [] }) });
  });

  it('adds the paid-only gate to the active-orders query', async () => {
    await OrderService.getActiveOrders();
    expect(find.mock.calls[0][0]).toMatchObject({
      isDeleted: { $ne: true },
      ...LIVE_QUEUE_GATE,
    });
  });
});

describe('REQ-123 AC5: the Awaiting-payment query', () => {
  it('selects only unpaid customer orders', () => {
    expect(AWAITING_PAYMENT_QUERY).toMatchObject({
      origin: 'customer',
      paymentStatus: { $ne: 'paid' },
    });
  });
});
