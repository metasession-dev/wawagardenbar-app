import { Types } from 'mongoose';
import { IAdminPermissions } from './admin-permissions.interface';

export interface IAddress {
  _id?: Types.ObjectId;
  label: string; // e.g., "Home", "Work", "Mom's House"
  streetAddress: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt?: Date;
  lastUsedAt?: Date;
}

export interface IPreferences {
  dietaryRestrictions: string[]; // e.g., ["vegetarian", "gluten-free"]
  favoriteItems: Types.ObjectId[]; // references to MenuItem
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    // REQ-053 — WhatsApp opt-in surface. Transactional defaults to true
    // (order updates, receipts, support replies); marketing defaults to
    // false (offers, promotions). Persisted only on FIRST PIN verification
    // (when phoneVerified was false). Subsequent verifies don't overwrite
    // profile-set preferences.
    whatsappTransactional: boolean;
    whatsappMarketing: boolean;
    // REQ-063 — explicit-consent split for marketing emails. The pre-existing
    // `email` boolean above remains the gate for TRANSACTIONAL email (order
    // confirmations, receipts). `emailMarketing` is the separate gate for
    // MARKETING email (offers, expiry nudges). Default false; explicit opt-in
    // required, mirroring `whatsappMarketing`.
    emailMarketing: boolean;
  };
  // REQ-063 — server-stamped audit timestamp for explicit-consent capture.
  // Updated whenever any communicationPreferences field changes (PIN first-
  // verify, profile-tab save). Single timestamp rather than a per-field event
  // log — proves "consent was actively captured at <time>" which is what
  // GDPR explicit-consent posture asks for.
  communicationPreferencesUpdatedAt?: Date;
  // REQ-116 — where the last consent change came from (e.g. 'whatsapp_inbound').
  communicationPreferencesSource?: string;
  language: string;
}

export interface IPaymentMethod {
  type: 'card' | 'transfer' | 'ussd' | 'phone';
  details: string;
  isDefault: boolean;
}

/**
 * REQ-119 (ADR-009) — staff roles. A staff account holds one or more of
 * these in `roles`; `role` stays one more release as the highest of them
 * (and as the fallback for records written before `roles` existed).
 */
export type StaffRole = 'csr' | 'kitchen' | 'manager' | 'admin' | 'super-admin';

export const STAFF_ROLES: readonly StaffRole[] = [
  'csr',
  'kitchen',
  'manager',
  'admin',
  'super-admin',
];

export type UserRole = 'customer' | StaffRole;

export interface ISocialProfile {
  handle: string;
  lastCheckedAt?: Date;
  verified?: boolean;
  profileUrl?: string;
}

export interface ISocialProfiles {
  instagram?: ISocialProfile;
  twitter?: ISocialProfile;
  facebook?: ISocialProfile;
}

export interface IUser {
  _id: Types.ObjectId;
  // Basic Information
  firstName?: string;
  lastName?: string;
  name?: string; // Computed from firstName + lastName
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified?: boolean;
  profilePicture?: string;

  // Social Profiles
  socialProfiles?: ISocialProfiles;

  // Authentication
  role: UserRole;
  /** REQ-119 — staff roles (empty for customers). `role` is the highest of these. */
  roles?: StaffRole[];
  // REQ-117 (ADR-008) — only a keyed hash of the PIN is stored. `verificationPin`
  // (plaintext) is written ONLY under ENABLE_E2E_PIN_INTERCEPT so e2e helpers
  // can read it; it is never set in production.
  verificationPinHash?: string;
  verificationPin?: string;
  pinExpiresAt?: Date;
  pinAttempts?: number;
  pinRequestWindowStart?: Date;
  pinRequestCount?: number;
  whatsappVerifiedAt?: Date;
  sessionToken?: string;

  // Admin Authentication Fields
  username?: string; // Unique username for admin login
  password?: string; // Hashed password (bcrypt)
  isAdmin: boolean; // Flag to identify admin users
  mustChangePassword?: boolean; // Force password change on next login
  passwordChangedAt?: Date; // Track password change history
  failedLoginAttempts?: number; // Track failed login attempts
  accountLockedUntil?: Date; // Account lockout timestamp
  permissions?: IAdminPermissions; // Granular permissions for admin users

  // Addresses & Payment
  addresses: IAddress[];
  paymentMethods: IPaymentMethod[];

  // Preferences
  preferences?: IPreferences;

  // Account Metadata
  accountStatus: 'active' | 'suspended' | 'deleted';
  totalSpent: number;
  totalOrders: number; // Renamed from orderCount for clarity
  rewardsEarned: number;
  loyaltyPoints: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  profileCompletionPercentage?: number;

  // Guest Conversion
  isGuest: boolean;
  guestOrderIds?: Types.ObjectId[];
  claimedAt?: Date;

  // Timestamps
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  incrementOrderCount?: () => void;
  addToTotalSpent?: (amount: number) => void;
  getDefaultAddress?: () => IAddress | null;
  getFullName?: () => string;
}
