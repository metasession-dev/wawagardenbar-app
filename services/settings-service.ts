import { connectDB } from '@/lib/mongodb';
import SettingsModel, { ISettings } from '@/models/settings-model';
import { haversineKm } from '@/lib/geo/haversine';
import { geocodeAddress } from '@/lib/geo/geocode';

const PICKUP_SLOT_INTERVAL_MIN = 15;

const DAY_INDEX_TO_KEY = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
type DayKey = (typeof DAY_INDEX_TO_KEY)[number];

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToDate(date: Date, totalMinutes: number): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(totalMinutes);
  return out;
}

function formatHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function isoLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${formatHHMM(date)}`;
}

function dayKeyForDate(date: Date): DayKey {
  return DAY_INDEX_TO_KEY[date.getDay()];
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
    const now = new Date();
    const dayOfWeek = now
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as keyof typeof settings.businessHours;

    const dayHours = settings.businessHours[dayOfWeek];

    if (dayHours.closed) {
      return false;
    }

    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    return currentTime >= dayHours.open && currentTime <= dayHours.close;
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
    const todayKey = dayKeyForDate(now);
    const todayHours = settings.businessHours[todayKey];

    if (!todayHours.closed) {
      const openMin = hhmmToMinutes(todayHours.open);
      const closeMin = hhmmToMinutes(todayHours.close);
      const nowMin = now.getHours() * 60 + now.getMinutes();

      if (nowMin >= openMin && nowMin < closeMin) {
        // Open right now — return today's close time as the next slot.
        return {
          openAt: minutesToDate(now, closeMin),
          message: `We're open until ${todayHours.close}.`,
        };
      }
      if (nowMin < openMin) {
        return {
          openAt: minutesToDate(now, openMin),
          message: `We open at ${todayHours.open} today.`,
        };
      }
    }

    // Walk forward through the week to find the next open day.
    for (let offset = 1; offset <= 7; offset += 1) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + offset);
      const key = dayKeyForDate(candidate);
      const hours = settings.businessHours[key];
      if (!hours.closed) {
        const openMin = hhmmToMinutes(hours.open);
        const openAt = minutesToDate(candidate, openMin);
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

    const todaySlots = this.slotsForDay(settings, now, prepMin, 'Today', now);
    if (todaySlots.length > 0) {
      return todaySlots;
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.slotsForDay(settings, tomorrow, prepMin, 'Tomorrow', null);
  }

  private static slotsForDay(
    settings: ISettings,
    date: Date,
    prepMin: number,
    labelPrefix: string,
    nowForFloor: Date | null
  ): Array<{ value: string; label: string; date: string }> {
    const key = dayKeyForDate(date);
    const hours = settings.businessHours[key];
    if (hours.closed) {
      return [];
    }

    const openMin = hhmmToMinutes(hours.open);
    const closeMin = hhmmToMinutes(hours.close);
    let firstSlotMin = openMin;
    if (nowForFloor) {
      const nowMin = nowForFloor.getHours() * 60 + nowForFloor.getMinutes();
      const earliest = nowMin + prepMin;
      const rounded =
        Math.ceil(earliest / PICKUP_SLOT_INTERVAL_MIN) *
        PICKUP_SLOT_INTERVAL_MIN;
      firstSlotMin = Math.max(openMin, rounded);
    }

    const lastSlotMin = closeMin - prepMin;
    if (firstSlotMin > lastSlotMin) {
      return [];
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const slots: Array<{ value: string; label: string; date: string }> = [];
    for (
      let m = firstSlotMin;
      m <= lastSlotMin;
      m += PICKUP_SLOT_INTERVAL_MIN
    ) {
      const slot = minutesToDate(date, m);
      slots.push({
        value: isoLocal(slot),
        label: `${labelPrefix} at ${formatHHMM(slot)}`,
        date: dateStr,
      });
    }
    return slots;
  }
}

export { SettingsService };
export default SettingsService;
