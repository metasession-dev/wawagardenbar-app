import { connectDB } from '@/lib/mongodb';
import SettingsModel, { ISettings } from '@/models/settings-model';
import { haversineKm } from '@/lib/geo/haversine';
import { geocodeAddress } from '@/lib/geo/geocode';
import {
  getCurrentBusinessHHMM,
  getCurrentBusinessDayKey,
  getCurrentBusinessDateParts,
  businessLocalToInstant,
} from '@/lib/business-time';

const PICKUP_SLOT_INTERVAL_MIN = 15;

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Advances `date` by `offsetDays` real calendar days in the business
 * timezone, returning that day's Y/M/D (still in business-timezone terms).
 * Adding 24h-per-day in absolute time is safe for timezones with no DST
 * (e.g. Africa/Lagos, WAT, fixed UTC+1 year-round); a DST-observing zone
 * could shift by an extra/missing hour on the transition day, which would
 * not matter here since only the resulting calendar date (not a precise
 * instant) is read back out.
 */
function addBusinessDays(date: Date, offsetDays: number) {
  return getCurrentBusinessDateParts(
    new Date(date.getTime() + offsetDays * 24 * 60 * 60 * 1000)
  );
}

function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Settings Service
 * Handles all settings-related business logic
 * Implements singleton pattern for settings
 */
class SettingsService {
  private static cachedSettings: ISettings | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get application settings
   * Returns cached settings if available and fresh
   */
  static async getSettings(): Promise<ISettings> {
    await connectDB();

    // Check cache
    const now = Date.now();
    if (this.cachedSettings && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedSettings;
    }

    // Get or create settings
    let settings = await SettingsModel.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = await SettingsModel.create({});
    }

    // Update cache
    this.cachedSettings = settings;
    this.cacheTimestamp = now;

    return settings;
  }

  /**
   * Update settings
   * Clears cache after update
   */
  static async updateSettings(
    updates: Partial<ISettings>,
    updatedBy?: string,
    updatedByEmail?: string
  ): Promise<ISettings> {
    await connectDB();

    let settings = await SettingsModel.findOne();

    if (!settings) {
      // Create if doesn't exist
      settings = await SettingsModel.create({
        ...updates,
        updatedBy,
        updatedByEmail,
      });
    } else {
      // Update existing
      Object.assign(settings, updates);
      if (updatedBy) settings.updatedBy = updatedBy as any;
      if (updatedByEmail) settings.updatedByEmail = updatedByEmail;
      await settings.save();
    }

    // Clear cache
    this.cachedSettings = null;

    return settings;
  }

  /**
   * Calculate service fee based on settings
   */
  static async calculateServiceFee(subtotal: number): Promise<number> {
    const settings = await this.getSettings();
    return Math.round(subtotal * settings.serviceFeePercentage);
  }

  /**
   * Calculate delivery fee based on settings and order amount
   */
  static async calculateDeliveryFee(subtotal: number): Promise<number> {
    const settings = await this.getSettings();

    if (subtotal >= settings.freeDeliveryThreshold) {
      return settings.deliveryFeeReduced;
    }

    return settings.deliveryFeeBase;
  }

  /**
   * Calculate tax based on settings
   */
  static async calculateTax(subtotal: number): Promise<number> {
    const settings = await this.getSettings();

    if (!settings.taxEnabled) {
      return 0;
    }

    return Math.round(subtotal * settings.taxPercentage);
  }

  /**
   * Calculate order totals with all fees
   */
  static async calculateOrderTotals(
    subtotal: number,
    orderType: 'dine-in' | 'pickup' | 'delivery' | 'pay-now'
  ): Promise<{
    subtotal: number;
    serviceFee: number;
    deliveryFee: number;
    tax: number;
    total: number;
  }> {
    const serviceFee = await this.calculateServiceFee(subtotal);
    const deliveryFee =
      orderType === 'delivery' ? await this.calculateDeliveryFee(subtotal) : 0;
    const tax = await this.calculateTax(subtotal);

    const total = subtotal + serviceFee + deliveryFee + tax;

    return {
      subtotal,
      serviceFee,
      deliveryFee,
      tax,
      total,
    };
  }

  /**
   * Check if order meets minimum amount
   */
  static async meetsMinimumOrder(subtotal: number): Promise<boolean> {
    const settings = await this.getSettings();
    return subtotal >= settings.minimumOrderAmount;
  }

  /**
   * Check if order type is enabled
   */
  static async isOrderTypeEnabled(
    orderType: 'dine-in' | 'pickup' | 'delivery'
  ): Promise<boolean> {
    const settings = await this.getSettings();

    switch (orderType) {
      case 'dine-in':
        return settings.dineInEnabled;
      case 'pickup':
        return settings.pickupEnabled;
      case 'delivery':
        return settings.deliveryEnabled;
      default:
        return false;
    }
  }

  /**
   * Check if currently within business hours
   */
  static async isWithinBusinessHours(): Promise<boolean> {
    const settings = await this.getSettings();
    const dayOfWeek = getCurrentBusinessDayKey();
    const dayHours = settings.businessHours[dayOfWeek];

    if (dayHours.closed) {
      return false;
    }

    const currentTime = getCurrentBusinessHHMM();
    return currentTime >= dayHours.open && currentTime <= dayHours.close;
  }

  /**
   * REQ-102: check if the show-price window is currently active.
   * Single daily window (not per-weekday, unlike business hours).
   */
  static async isShowPriceActive(): Promise<boolean> {
    const settings = await this.getSettings();
    const window = settings.showPriceWindow;
    if (!window?.enabled) {
      return false;
    }
    const currentTime = getCurrentBusinessHHMM();
    return currentTime >= window.start && currentTime <= window.end;
  }

  /**
   * REQ-102: check if the happy-hour window is currently active.
   * Single daily window (not per-weekday, unlike business hours).
   */
  static async isHappyHourActive(): Promise<boolean> {
    const settings = await this.getSettings();
    const window = settings.happyHourWindow;
    if (!window?.enabled) {
      return false;
    }
    const currentTime = getCurrentBusinessHHMM();
    return currentTime >= window.start && currentTime <= window.end;
  }

  /**
   * REQ-102: resolve which price field is currently active, per ADR-004's
   * centralized precedence rule — happy-hour beats show beats default.
   * Every consumer (order reconciler, public menu display, bulk-edit page)
   * calls this one function rather than re-implementing the comparison.
   */
  static async resolveActivePriceField(): Promise<
    'happyHourPrice' | 'showPrice' | 'price'
  > {
    if (await this.isHappyHourActive()) {
      return 'happyHourPrice';
    }
    if (await this.isShowPriceActive()) {
      return 'showPrice';
    }
    return 'price';
  }

  /**
   * Get business hours for a specific day
   */
  static async getBusinessHoursForDay(
    day: string
  ): Promise<{ open: string; close: string; closed: boolean }> {
    const settings = await this.getSettings();
    const dayKey = day.toLowerCase() as keyof typeof settings.businessHours;
    return settings.businessHours[dayKey];
  }

  /**
   * Clear settings cache
   * Useful for testing or forcing refresh
   */
  static clearCache(): void {
    this.cachedSettings = null;
    this.cacheTimestamp = 0;
  }

  /**
   * REQ-061 — Returns the next time the bar will be open. If currently
   * within business hours, returns today's close time as the open slot
   * (signalling "open now until X"). If closed, returns the next
   * future open boundary, walking forward through the week. Returns
   * `null` if every day is marked `closed: true`.
   */
  static async getNextOpenSlot(): Promise<{
    openAt: Date | null;
    message: string;
  }> {
    const settings = await this.getSettings();
    const now = new Date();
    const todayParts = getCurrentBusinessDateParts(now);
    const todayKey = getCurrentBusinessDayKey(now);
    const todayHours = settings.businessHours[todayKey];

    if (!todayHours.closed) {
      const openMin = hhmmToMinutes(todayHours.open);
      const closeMin = hhmmToMinutes(todayHours.close);
      const nowMin = hhmmToMinutes(getCurrentBusinessHHMM(now));

      if (nowMin >= openMin && nowMin < closeMin) {
        // Open right now — return today's close time as the next slot.
        return {
          openAt: businessLocalToInstant(
            todayParts.year,
            todayParts.month,
            todayParts.day,
            todayHours.close
          ),
          message: `We're open until ${todayHours.close}.`,
        };
      }
      if (nowMin < openMin) {
        return {
          openAt: businessLocalToInstant(
            todayParts.year,
            todayParts.month,
            todayParts.day,
            todayHours.open
          ),
          message: `We open at ${todayHours.open} today.`,
        };
      }
    }

    // Walk forward through the week to find the next open day.
    for (let offset = 1; offset <= 7; offset += 1) {
      const candidateParts = addBusinessDays(now, offset);
      const candidateDate = businessLocalToInstant(
        candidateParts.year,
        candidateParts.month,
        candidateParts.day,
        '00:00'
      );
      const key = getCurrentBusinessDayKey(candidateDate);
      const hours = settings.businessHours[key];
      if (!hours.closed) {
        const openAt = businessLocalToInstant(
          candidateParts.year,
          candidateParts.month,
          candidateParts.day,
          hours.open
        );
        const label =
          offset === 1
            ? 'Tomorrow'
            : key.charAt(0).toUpperCase() + key.slice(1);
        return {
          openAt,
          message: `We open at ${hours.open} ${label}.`,
        };
      }
    }

    return { openAt: null, message: 'The bar is closed all week.' };
  }

  /**
   * REQ-061 — Lazy-cached bar coordinates. Returns the cached
   * `geocodedCoordinates` if present; otherwise calls Google Maps to
   * geocode the configured `address`, persists the result on the
   * settings doc, and returns it. Returns `null` when geocoding fails
   * (missing API key, network failure, no results). Caller falls back
   * to "skip distance check" on null.
   */
  static async getBarCoordinates(): Promise<{
    lat: number;
    lng: number;
  } | null> {
    const settings = await this.getSettings();
    if (settings.geocodedCoordinates) {
      const { lat, lng } = settings.geocodedCoordinates;
      return { lat, lng };
    }

    const coords = await geocodeAddress(settings.address);
    if (!coords) {
      return null;
    }

    settings.geocodedCoordinates = {
      lat: coords.lat,
      lng: coords.lng,
      geocodedAt: new Date(),
    };
    try {
      await (settings as unknown as { save: () => Promise<unknown> }).save();
    } catch (error) {
      console.error(
        '[SettingsService] failed to persist geocodedCoordinates:',
        error
      );
      // Return the coords anyway — non-fatal.
    }
    // Clear in-memory cache so the next read picks up the persisted value.
    this.cachedSettings = null;
    return coords;
  }

  /**
   * REQ-061 — Check whether a customer delivery point is within the
   * bar's configured `deliveryRadius`. Fail-open posture: if either
   * side's coordinates are missing (geocoding failed; customer's address
   * has no coords), returns `withinRadius: true, distanceKm: null`.
   * Customers without geocoded addresses are NOT blocked.
   */
  static async checkDeliveryDistance(
    customerLat: number | undefined,
    customerLng: number | undefined
  ): Promise<{ withinRadius: boolean; distanceKm: number | null }> {
    if (typeof customerLat !== 'number' || typeof customerLng !== 'number') {
      return { withinRadius: true, distanceKm: null };
    }
    const barCoords = await this.getBarCoordinates();
    if (!barCoords) {
      return { withinRadius: true, distanceKm: null };
    }
    const settings = await this.getSettings();
    const distanceKm = haversineKm(
      barCoords.lat,
      barCoords.lng,
      customerLat,
      customerLng
    );
    return {
      withinRadius: distanceKm <= settings.deliveryRadius,
      distanceKm: Math.round(distanceKm * 10) / 10,
    };
  }

  /**
   * REQ-061 — Generate pickup time slots within business hours.
   * 15-minute intervals starting at `max(now + estimatedPreparationTime,
   * businessHours.open)` and ending at `businessHours.close -
   * estimatedPreparationTime` (so the kitchen has time to finish before
   * close). When no slots today (closed day, or all slots in the past),
   * rolls over to tomorrow. Returns `[]` if both today and tomorrow are
   * closed.
   */
  static async getPickupSlots(): Promise<
    Array<{ value: string; label: string; date: string }>
  > {
    const settings = await this.getSettings();
    const now = new Date();
    const prepMin = settings.estimatedPreparationTime;

    const todayParts = getCurrentBusinessDateParts(now);
    const nowMin = hhmmToMinutes(getCurrentBusinessHHMM(now));
    const todaySlots = this.slotsForDay(
      settings,
      todayParts,
      prepMin,
      'Today',
      nowMin
    );
    if (todaySlots.length > 0) {
      return todaySlots;
    }

    const tomorrowParts = addBusinessDays(now, 1);
    return this.slotsForDay(settings, tomorrowParts, prepMin, 'Tomorrow', null);
  }

  private static slotsForDay(
    settings: ISettings,
    dateParts: { year: number; month: number; day: number },
    prepMin: number,
    labelPrefix: string,
    nowMinForFloor: number | null
  ): Array<{ value: string; label: string; date: string }> {
    const dayInstant = businessLocalToInstant(
      dateParts.year,
      dateParts.month,
      dateParts.day,
      '00:00'
    );
    const key = getCurrentBusinessDayKey(dayInstant);
    const hours = settings.businessHours[key];
    if (hours.closed) {
      return [];
    }

    const openMin = hhmmToMinutes(hours.open);
    const closeMin = hhmmToMinutes(hours.close);
    let firstSlotMin = openMin;
    if (nowMinForFloor !== null) {
      const earliest = nowMinForFloor + prepMin;
      const rounded =
        Math.ceil(earliest / PICKUP_SLOT_INTERVAL_MIN) *
        PICKUP_SLOT_INTERVAL_MIN;
      firstSlotMin = Math.max(openMin, rounded);
    }

    const lastSlotMin = closeMin - prepMin;
    if (firstSlotMin > lastSlotMin) {
      return [];
    }

    const dateStr = `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-${String(dateParts.day).padStart(2, '0')}`;

    const slots: Array<{ value: string; label: string; date: string }> = [];
    for (
      let m = firstSlotMin;
      m <= lastSlotMin;
      m += PICKUP_SLOT_INTERVAL_MIN
    ) {
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      const hhmm = formatHHMM(hh, mm);
      slots.push({
        value: `${dateStr}T${hhmm}`,
        label: `${labelPrefix} at ${hhmm}`,
        date: dateStr,
      });
    }
    return slots;
  }
}

export { SettingsService };
export default SettingsService;
