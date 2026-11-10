/**
 * @requirement REQ-120 — AC7
 * @srs REQ-CHECKOUT-013
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/lib/business-time', () => ({
  getCurrentBusinessDayKey: () => 'monday',
}));
const S = vi.hoisted(() => ({
  getSettings: vi.fn(),
  isWithinBusinessHours: vi.fn(),
  getNextOpenSlot: vi.fn(),
  getPickupSlots: vi.fn(),
}));
vi.mock('@/services/settings-service', () => ({ default: S }));

import { getOrderingOptionsAction } from '@/app/actions/ordering/ordering-options-actions';

describe('getOrderingOptionsAction', () => {
  it('returns enabled types, hours, slots, fee rule, minimum and radius only', async () => {
    S.getSettings.mockResolvedValue({
      dineInEnabled: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      businessHours: {
        monday: { open: '10:00', close: '22:00', closed: false },
      },
      deliveryFeeBase: 500,
      deliveryFeeReduced: 200,
      freeDeliveryThreshold: 10000,
      deliveryRadius: 8,
      minimumOrderAmount: 1500,
      serviceFeePercentage: 0.1,
      someStaffOnlyField: 'secret',
    });
    S.isWithinBusinessHours.mockResolvedValue(true);
    S.getNextOpenSlot.mockResolvedValue({
      openAt: null,
      message: 'Open until 22:00',
    });
    S.getPickupSlots.mockResolvedValue([
      { value: 'v', label: 'Today 12:00', date: 'd' },
    ]);

    const r = await getOrderingOptionsAction();
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      orderTypes: ['dine-in', 'pickup'],
      isOpenNow: true,
      todayHours: { open: '10:00', close: '22:00', closed: false },
      nextOpen: 'Open until 22:00',
      pickupSlots: [{ value: 'v', label: 'Today 12:00', date: 'd' }],
      delivery: {
        baseFee: 500,
        reducedFee: 200,
        freeDeliveryThreshold: 10000,
        radiusKm: 8,
      },
      minimumOrderAmount: 1500,
    });
    expect(JSON.stringify(r)).not.toContain('secret');
  });

  it('fails soft', async () => {
    S.getSettings.mockRejectedValue(new Error('db'));
    expect(await getOrderingOptionsAction()).toMatchObject({ success: false });
  });
});
