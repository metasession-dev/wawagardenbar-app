import { connectDB } from '@/lib/mongodb';
import SettingsModel, { ISettings } from '@/models/settings-model';

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
    if (
      this.cachedSettings &&
      now - this.cacheTimestamp < this.CACHE_TTL
    ) {
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
}

export default SettingsService;
