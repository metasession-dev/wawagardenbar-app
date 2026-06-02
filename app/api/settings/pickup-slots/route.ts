import { NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings-service';

/**
 * @requirement REQ-061 — Pickup time-slot endpoint (P2 #14).
 *
 * GET /api/settings/pickup-slots
 *
 * Unauthenticated public endpoint. Returns the next available pickup
 * slots derived from `SettingsService.getPickupSlots()`: 15-minute
 * intervals within business hours, starting at `now +
 * estimatedPreparationTime`, with rollover to tomorrow when today is
 * closed or all slots are in the past.
 *
 * Used by `OrderDetailsStep` to populate the pickup-time `<Select>`.
 * Falls back to an empty array on error so the client can render a
 * disabled state.
 */
export async function GET(): Promise<Response> {
  try {
    const slots = await SettingsService.getPickupSlots();
    return NextResponse.json({ success: true, data: { slots } });
  } catch (error) {
    console.error('[API] GET /api/settings/pickup-slots', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pickup slots',
        data: { slots: [] },
      },
      { status: 500 }
    );
  }
}
