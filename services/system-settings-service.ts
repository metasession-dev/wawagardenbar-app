import { Types } from 'mongoose';
import SystemSettingsModel, {
  ISystemSettings,
} from '@/models/system-settings-model';
import { connectDB } from '@/lib/mongodb';

/**
 * Service for managing system settings
 */
export class SystemSettingsService {
  /**
   * Get points conversion rate (public)
   */
  static async getPointsConversionRate(): Promise<number> {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'points-conversion-rate',
    });

    // Default to 100 points = ₦1 if not set
    return setting?.value ?? 100;
  }

  /**
   * Get a system setting by key
   */
  static async getSetting(
    key: 'points-conversion-rate' | 'service-fee' | 'tax-rate'
  ): Promise<ISystemSettings | null> {
    await connectDB();

    return await SystemSettingsModel.findOne({ key });
  }

  /**
   * Update points conversion rate (admin only)
   */
  static async updatePointsConversionRate(
    newRate: number,
    adminUserId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    rate: number;
    previousRate?: number;
    affectedItems: number;
  }> {
    await connectDB();

    // Validate rate
    if (newRate < 1 || newRate > 1000) {
      throw new Error(
        'Conversion rate must be between 1 and 1000 points per ₦1'
      );
    }

    const MenuItemModel = (await import('@/models/menu-item-model')).default;

    // Get current setting
    const currentSetting = await SystemSettingsModel.findOne({
      key: 'points-conversion-rate',
    });

    const previousRate = currentSetting?.value ?? 100;

    // Count affected menu items
    const affectedItems = await MenuItemModel.countDocuments({
      pointsRedeemable: true,
    });

    // Update or create setting
    const updated = await SystemSettingsModel.findOneAndUpdate(
      { key: 'points-conversion-rate' },
      {
        $set: {
          value: newRate,
          updatedBy: new Types.ObjectId(adminUserId as string),
          updatedAt: new Date(),
          previousValue: previousRate,
        },
        $push: {
          changeHistory: {
            value: newRate,
            changedBy: new Types.ObjectId(adminUserId as string),
            changedAt: new Date(),
            reason: reason || 'Rate updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      rate: updated.value,
      previousRate,
      affectedItems,
    };
  }

  /**
   * Get impact analysis for a potential rate change
   */
  static async getConversionRateImpact(newRate: number): Promise<{
    currentRate: number;
    newRate: number;
    affectedMenuItems: number;
    exampleChanges: Array<{
      itemName: string;
      price: number;
      currentPoints: number;
      newPoints: number;
    }>;
    customerImpact: string;
  }> {
    await connectDB();

    const MenuItemModel = (await import('@/models/menu-item-model')).default;

    const currentRate = await this.getPointsConversionRate();

    // Get affected menu items
    const affectedCount = await MenuItemModel.countDocuments({
      pointsRedeemable: true,
    });

    // Get sample items for examples
    const sampleItems = await MenuItemModel.find({
      pointsRedeemable: true,
    })
      .limit(3)
      .select('name price pointsValue');

    const exampleChanges = sampleItems.map((item) => ({
      itemName: item.name,
      price: item.price,
      currentPoints: item.pointsValue || item.price * currentRate,
      newPoints: item.price * newRate,
    }));

    // Determine customer impact
    let customerImpact: string;
    if (newRate < currentRate) {
      customerImpact = 'Points will be worth MORE';
    } else if (newRate > currentRate) {
      customerImpact = 'Points will be worth LESS';
    } else {
      customerImpact = 'No change';
    }

    return {
      currentRate,
      newRate,
      affectedMenuItems: affectedCount,
      exampleChanges,
      customerImpact,
    };
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(): Promise<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    channels: {
      auth: 'email' | 'sms' | 'both';
      orders: 'email' | 'sms' | 'both';
    };
  }> {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'notification-preferences',
    });

    const defaults = {
      smsEnabled: true,
      emailEnabled: true,
      channels: {
        auth: 'sms',
        orders: 'email',
      },
    };

    return { ...defaults, ...(setting?.value || {}) };
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(
    settings: {
      smsEnabled: boolean;
      emailEnabled: boolean;
      channels: {
        auth: 'email' | 'sms' | 'both';
        orders: 'email' | 'sms' | 'both';
      };
    },
    adminUserId: string
  ): Promise<boolean> {
    await connectDB();

    await SystemSettingsModel.findOneAndUpdate(
      { key: 'notification-preferences' },
      {
        $set: {
          value: settings,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: settings,
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Notification settings updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return true;
  }

  /**
   * Get payment gateway settings
   */
  static async getPaymentSettings(): Promise<{
    activeProvider: 'monnify' | 'paystack';
    paystack: {
      enabled: boolean;
      mode: 'test' | 'live';
      publicKey?: string;
      secretKey?: string;
    };
    monnify: {
      enabled: boolean;
    };
  }> {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'payment-gateway-config',
    });

    const defaults = {
      activeProvider: 'monnify' as const,
      paystack: {
        enabled: false,
        mode: 'test' as const,
        publicKey: '',
        secretKey: '',
      },
      monnify: {
        enabled: true,
      },
    };

    return { ...defaults, ...(setting?.value || {}) };
  }

  /**
   * Update payment gateway settings
   */
  static async updatePaymentSettings(
    settings: {
      activeProvider: 'monnify' | 'paystack';
      paystack: {
        enabled: boolean;
        mode: 'test' | 'live';
        publicKey: string;
        secretKey: string;
      };
    },
    adminUserId: string
  ): Promise<boolean> {
    await connectDB();

    await SystemSettingsModel.findOneAndUpdate(
      { key: 'payment-gateway-config' },
      {
        $set: {
          value: settings,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: {
              ...settings,
              paystack: {
                ...settings.paystack,
                secretKey: '***MASKED***', // Don't log secret key in history
              },
            },
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Payment gateway settings updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return true;
  }

  /**
   * Get expense categories
   */
  static async getExpenseCategories(): Promise<{
    directCostCategories: string[];
    operatingExpenseCategories: string[];
  }> {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'expense-categories',
    });

    const { DIRECT_COST_CATEGORIES, OPERATING_EXPENSE_CATEGORIES } =
      await import('@/interfaces/expense.interface');

    const defaults = {
      directCostCategories: [...DIRECT_COST_CATEGORIES],
      operatingExpenseCategories: [...OPERATING_EXPENSE_CATEGORIES],
    };

    return { ...defaults, ...(setting?.value || {}) };
  }

  /**
   * Get menu categories settings
   */
  static async getMenuCategories(): Promise<
    import('@/interfaces/menu-settings.interface').IMenuSettings
  > {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'menu-categories',
    });

    const { DEFAULT_MENU_SETTINGS } = await import(
      '@/interfaces/menu-settings.interface'
    );

    return (
      (setting?.value as import('@/interfaces/menu-settings.interface').IMenuSettings) ||
      DEFAULT_MENU_SETTINGS
    );
  }

  /**
   * Update menu categories
   */
  static async updateMenuCategories(
    settings: import('@/interfaces/menu-settings.interface').IMenuSettings,
    adminUserId: string
  ): Promise<boolean> {
    await connectDB();

    await SystemSettingsModel.findOneAndUpdate(
      { key: 'menu-categories' },
      {
        $set: {
          value: settings,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: settings,
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Menu categories updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return true;
  }

  /**
   * Update expense categories
   */
  static async updateExpenseCategories(
    categories: {
      directCostCategories: string[];
      operatingExpenseCategories: string[];
    },
    adminUserId: string
  ): Promise<boolean> {
    await connectDB();

    // Validate that arrays are not empty
    if (categories.directCostCategories.length === 0) {
      throw new Error('Direct cost categories cannot be empty');
    }

    if (categories.operatingExpenseCategories.length === 0) {
      throw new Error('Operating expense categories cannot be empty');
    }

    await SystemSettingsModel.findOneAndUpdate(
      { key: 'expense-categories' },
      {
        $set: {
          value: categories,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: categories,
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Expense categories updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return true;
  }

  /**
   * Get inventory locations configuration
   */
  static async getInventoryLocations(): Promise<
    import('@/interfaces').IInventoryLocationsSettings
  > {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'inventory-locations',
    });

    const defaults: import('@/interfaces').IInventoryLocationsSettings = {
      enabled: false,
      locations: [
        {
          id: 'store',
          name: 'Main Store',
          type: 'storage',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 'chiller-1',
          name: 'Bar Chiller 1',
          type: 'chiller',
          isActive: true,
          displayOrder: 2,
        },
        {
          id: 'chiller-2',
          name: 'Bar Chiller 2',
          type: 'chiller',
          isActive: true,
          displayOrder: 3,
        },
      ],
      defaultReceivingLocation: 'store',
      defaultSalesLocation: 'chiller-1',
      requireTransferNotes: false,
      allowNegativeStock: false,
    };

    return (
      (setting?.value as import('@/interfaces').IInventoryLocationsSettings) ||
      defaults
    );
  }

  /**
   * Update inventory locations configuration
   */
  static async updateInventoryLocations(
    config: import('@/interfaces').IInventoryLocationsSettings,
    adminUserId: string
  ): Promise<boolean> {
    await connectDB();

    // Validate configuration
    if (config.enabled && config.locations.length === 0) {
      throw new Error(
        'At least one location must be configured when location tracking is enabled'
      );
    }

    if (config.enabled) {
      const activeLocations = config.locations.filter((l) => l.isActive);
      if (activeLocations.length === 0) {
        throw new Error('At least one location must be active');
      }

      const locationIds = config.locations.map((l) => l.id);
      if (!locationIds.includes(config.defaultReceivingLocation)) {
        throw new Error(
          'Default receiving location must be one of the configured locations'
        );
      }

      if (!locationIds.includes(config.defaultSalesLocation)) {
        throw new Error(
          'Default sales location must be one of the configured locations'
        );
      }
    }

    await SystemSettingsModel.findOneAndUpdate(
      { key: 'inventory-locations' },
      {
        $set: {
          value: config,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: config,
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Inventory locations configuration updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return true;
  }

  /**
   * @requirement REQ-015 - Get Staff Pot configuration
   */
  static async getStaffPotConfig(): Promise<{
    dailyTarget: number;
    bonusPercentage: number;
    kitchenSplitRatio: number;
    barSplitRatio: number;
    kitchenStaffCount: number;
    barStaffCount: number;
    startDate?: string;
  }> {
    await connectDB();

    const setting = await SystemSettingsModel.findOne({
      key: 'staff-pot-config',
    });

    return (
      setting?.value ?? {
        dailyTarget: 50000,
        bonusPercentage: 5,
        kitchenSplitRatio: 50,
        barSplitRatio: 50,
        kitchenStaffCount: 2,
        barStaffCount: 2,
      }
    );
  }

  /**
   * @requirement REQ-015 - Update Staff Pot configuration
   */
  static async updateStaffPotConfig(
    config: {
      dailyTarget: number;
      bonusPercentage: number;
      kitchenSplitRatio: number;
      barSplitRatio: number;
      kitchenStaffCount: number;
      barStaffCount: number;
      startDate?: string;
    },
    adminUserId: string
  ): Promise<boolean> {
    await connectDB();

    if (config.dailyTarget <= 0)
      throw new Error('Daily target must be greater than 0');
    if (config.bonusPercentage < 0 || config.bonusPercentage > 100)
      throw new Error('Bonus percentage must be between 0 and 100');
    if (config.kitchenSplitRatio + config.barSplitRatio !== 100)
      throw new Error('Split ratios must sum to 100');
    if (config.kitchenStaffCount < 0 || config.barStaffCount < 0)
      throw new Error('Staff counts cannot be negative');

    await SystemSettingsModel.findOneAndUpdate(
      { key: 'staff-pot-config' },
      {
        $set: {
          value: config,
          updatedBy: new Types.ObjectId(adminUserId),
          updatedAt: new Date(),
        },
        $push: {
          changeHistory: {
            value: config,
            changedBy: new Types.ObjectId(adminUserId),
            changedAt: new Date(),
            reason: 'Staff pot configuration updated',
          },
        },
      },
      { upsert: true, new: true }
    );

    return true;
  }

  /**
   * Initialize default settings
   */
  static async initializeDefaults(): Promise<void> {
    await connectDB();

    const existingRate = await SystemSettingsModel.findOne({
      key: 'points-conversion-rate',
    });

    if (!existingRate) {
      await SystemSettingsModel.create({
        key: 'points-conversion-rate',
        value: 100,
        description: 'Number of loyalty points equal to ₦1',
        updatedAt: new Date(),
        changeHistory: [
          {
            value: 100,
            changedAt: new Date(),
            reason: 'Initial setup',
          },
        ],
      });
    }
  }
}
