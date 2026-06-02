import { NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings-service';

/**
 * @requirement REQ-061 — Business-hours status endpoint (P2 #12).
 *
 * GET /api/settings/business-hours-status
 *
 * Unauthenticated public endpoint. Returns `{ isOpen, nextOpenIso,
 * message }` derived from `SettingsService.isWithinBusinessHours()` +
 * `getNextOpenSlot()`. Used by `<BusinessHoursBanner>` on the checkout
 * flow to surface a "closed now / opens at X" warning + a "Schedule
 * for opening" CTA.
 */
export async function GET(): Promise<Response> {
  try {
    const [isOpen, nextSlot] = await Promise.all([
      SettingsService.isWithinBusinessHours(),
      SettingsService.getNextOpenSlot(),
    ]);

    const nextOpenIso = nextSlot.openAt ? toIsoLocal(nextSlot.openAt) : null;

    return NextResponse.json({
      success: true,
      data: {
        isOpen,
        nextOpenIso,
        message: nextSlot.message,
      },
    });
  } catch (error) {
    console.error('[API] GET /api/settings/business-hours-status', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

function toIsoLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
