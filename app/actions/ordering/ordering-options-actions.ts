'use server';

/**
 * @requirement REQ-120 (AC7) - Ordering options exposed read-only
 *
 * What a customer can order right now: enabled order types, today's hours,
 * pickup slots, delivery fee rule, minimum order and delivery radius. Public
 * settings only; nothing staff-specific. Used by the checkout and, later, the
 * WhatsApp ordering flow (WA-09).
 */

import { connectDB } from '@/lib/mongodb';
import SettingsService from '@/services/settings-service';
import { getCurrentBusinessDayKey } from '@/lib/business-time';

export interface OrderingOptions {
  orderTypes: Array<'dine-in' | 'pickup' | 'delivery'>;
  isOpenNow: boolean;
  todayHours: { open: string; close: string; closed: boolean };
  nextOpen: string;
  pickupSlots: Array<{ value: string; label: string; date: string }>;
  delivery: {
    baseFee: number;
    reducedFee: number;
    freeDeliveryThreshold: number;
    radiusKm: number;
  };
  minimumOrderAmount: number;
}

export async function getOrderingOptionsAction(): Promise<{
  success: boolean;
  data?: OrderingOptions;
  error?: string;
}> {
  try {
    await connectDB();
    const settings = await SettingsService.getSettings();
    const orderTypes = (
      [
        ['dine-in', settings.dineInEnabled],
        ['pickup', settings.pickupEnabled],
        ['delivery', settings.deliveryEnabled],
      ] as const
    )
      .filter(([, enabled]) => enabled)
      .map(([type]) => type);

    const today = settings.businessHours[getCurrentBusinessDayKey()];
    const [isOpenNow, next, pickupSlots] = await Promise.all([
      SettingsService.isWithinBusinessHours(),
      SettingsService.getNextOpenSlot(),
      orderTypes.includes('pickup')
        ? SettingsService.getPickupSlots()
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        orderTypes,
        isOpenNow,
        todayHours: {
          open: today.open,
          close: today.close,
          closed: today.closed,
        },
        nextOpen: next.message,
        pickupSlots,
        delivery: {
          baseFee: settings.deliveryFeeBase,
          reducedFee: settings.deliveryFeeReduced,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          radiusKm: settings.deliveryRadius,
        },
        minimumOrderAmount: settings.minimumOrderAmount,
      },
    };
  } catch (error) {
    console.error('[getOrderingOptionsAction]', error);
    return { success: false, error: 'Failed to load ordering options' };
  }
}
