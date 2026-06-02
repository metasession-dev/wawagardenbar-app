import mongoose, { Schema, Document } from 'mongoose';

/**
 * Settings Document Interface
 */
export interface ISettings extends Document {
  // Fee Configuration
  serviceFeePercentage: number;
  deliveryFeeBase: number;
  deliveryFeeReduced: number;
  freeDeliveryThreshold: number;
  minimumOrderAmount: number;

  // Tax Configuration
  taxPercentage: number;
  taxEnabled: boolean;

  // Order Configuration
  estimatedPreparationTime: number; // minutes
  maxOrdersPerHour: number;
  allowGuestCheckout: boolean;

  // Delivery Configuration
  deliveryRadius: number; // kilometers
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;

  // Business Hours
  businessHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };

  // Contact Information
  contactEmail: string;
  contactPhone: string;
  address: string;

  // REQ-061 — Lazy-cached geocoded coordinates of `address`. Backend-
  // populated by `SettingsService.getBarCoordinates()` on first delivery
  // distance check; persists across reads. Not surfaced in the admin form.
  geocodedCoordinates?: {
    lat: number;
    lng: number;
    geocodedAt: Date;
  };

  // Metadata
  updatedBy?: mongoose.Types.ObjectId;
  updatedByEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Settings Schema
 * Singleton pattern - only one settings document should exist
 */
const SettingsSchema = new Schema<ISettings>(
  {
    // Fee Configuration
    serviceFeePercentage: {
      type: Number,
      required: true,
      default: 0.02, // 2%
      min: 0,
      max: 1, // Max 100%
    },
    deliveryFeeBase: {
      type: Number,
      required: true,
      default: 1000, // ₦1,000
      min: 0,
    },
    deliveryFeeReduced: {
      type: Number,
      required: true,
      default: 500, // ₦500
      min: 0,
    },
    freeDeliveryThreshold: {
      type: Number,
      required: true,
      default: 2000, // ₦2,000
      min: 0,
    },
    minimumOrderAmount: {
      type: Number,
      required: true,
      default: 1000, // ₦1,000
      min: 0,
    },

    // Tax Configuration
    taxPercentage: {
      type: Number,
      required: true,
      default: 0.075, // 7.5% VAT
      min: 0,
      max: 1,
    },
    taxEnabled: {
      type: Boolean,
      default: false,
    },

    // Order Configuration
    estimatedPreparationTime: {
      type: Number,
      required: true,
      default: 30, // 30 minutes
      min: 5,
      max: 180,
    },
    maxOrdersPerHour: {
      type: Number,
      required: true,
      default: 20,
      min: 1,
    },
    allowGuestCheckout: {
      type: Boolean,
      default: true,
    },

    // Delivery Configuration
    deliveryRadius: {
      type: Number,
      required: true,
      default: 10, // 10km
      min: 1,
      max: 100,
    },
    deliveryEnabled: {
      type: Boolean,
      default: true,
    },
    pickupEnabled: {
      type: Boolean,
      default: true,
    },
    dineInEnabled: {
      type: Boolean,
      default: true,
    },

    // Business Hours
    businessHours: {
      type: {
        monday: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
        tuesday: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
        wednesday: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
        thursday: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
        friday: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
        saturday: {
          open: { type: String, default: '09:00' },
          close: { type: String, default: '23:00' },
          closed: { type: Boolean, default: false },
        },
        sunday: {
          open: { type: String, default: '10:00' },
          close: { type: String, default: '22:00' },
          closed: { type: Boolean, default: false },
        },
      },
      default: {},
    },

    // Contact Information
    contactEmail: {
      type: String,
      required: true,
      default: 'info@wawacafe.com',
    },
    contactPhone: {
      type: String,
      required: true,
      default: '+234 XXX XXX XXXX',
    },
    address: {
      type: String,
      required: true,
      default: 'Wawa Garden Bar, Lagos, Nigeria',
    },

    // REQ-061 — Lazy-cached geocoded coordinates of `address`.
    geocodedCoordinates: {
      type: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        geocodedAt: { type: Date, required: true },
      },
      default: undefined,
    },

    // Metadata
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedByEmail: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

const SettingsModel =
  mongoose.models.Settings ||
  mongoose.model<ISettings>('Settings', SettingsSchema);

export default SettingsModel;
