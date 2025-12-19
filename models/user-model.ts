import mongoose, { Schema, Model } from 'mongoose';
import { IUser, IAddress, IPaymentMethod, IPreferences, ISocialProfiles } from '@/interfaces';

const addressSchema = new Schema<IAddress>(
  {
    label: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: false, trim: true },
    country: { type: String, required: true, default: 'Nigeria', trim: true },
    deliveryInstructions: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

const socialProfileSchema = new Schema(
  {
    handle: { type: String, trim: true, required: true },
    lastCheckedAt: { type: Date },
    verified: { type: Boolean, default: false },
    profileUrl: { type: String, trim: true },
  },
  { _id: false }
);

const socialProfilesSchema = new Schema<ISocialProfiles>(
  {
    instagram: { type: socialProfileSchema },
    twitter: { type: socialProfileSchema },
    facebook: { type: socialProfileSchema },
  },
  { _id: false }
);

const preferencesSchema = new Schema<IPreferences>(
  {
    dietaryRestrictions: { type: [String], default: [] },
    favoriteItems: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
    communicationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
    language: { type: String, default: 'en' },
  },
  { _id: false }
);

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: {
      type: String,
      enum: ['card', 'transfer', 'ussd', 'phone'],
      required: true,
    },
    details: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    // Basic Information
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, trim: true }, // Computed virtual or stored
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents to lack this field
      lowercase: true,
      trim: true,
    },
    emailVerified: { type: Boolean, default: false },
    phone: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    phoneVerified: { type: Boolean, default: false },
    profilePicture: { type: String, trim: true },
    
    // Social Profiles
    socialProfiles: { type: socialProfilesSchema, default: {} },

    // Authentication
    role: {
      type: String,
      enum: ['customer', 'admin', 'super-admin'],
      default: 'customer',
    },
    verificationPin: { type: String, select: false },
    pinExpiresAt: { type: Date, select: false },
    sessionToken: { type: String, select: false },
    
    // Admin Authentication
    username: {
      type: String,
      unique: true,
      sparse: true,  // Allows null for non-admin users
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      select: false,  // Never return in queries by default
      minlength: 8,
    },
    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    accountLockedUntil: {
      type: Date,
    },
    permissions: {
      type: Schema.Types.Mixed,
      default: null,
    },
    
    // Addresses & Payment
    addresses: { type: [addressSchema], default: [] },
    paymentMethods: { type: [paymentMethodSchema], default: [] },
    
    // Preferences
    preferences: { type: preferencesSchema, default: () => ({}) },
    
    // Account Metadata
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    totalSpent: { type: Number, default: 0, min: 0 },
    totalOrders: { type: Number, default: 0, min: 0 },
    rewardsEarned: { type: Number, default: 0, min: 0 },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    totalPointsEarned: { type: Number, default: 0, min: 0 },
    totalPointsSpent: { type: Number, default: 0, min: 0 },
    profileCompletionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    
    // Guest Conversion
    isGuest: { type: Boolean, default: false },
    guestOrderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    claimedAt: { type: Date },
    
    // Timestamps
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ sessionToken: 1 });
userSchema.index({ createdAt: -1 });
// email index is already created via unique: true in schema definition
// phone index is already created via unique: true in schema definition
// username index is already created via unique: true in schema definition
userSchema.index({ 'addresses.isDefault': 1 });
userSchema.index({ isAdmin: 1, accountStatus: 1 });

// Instance Methods
userSchema.methods.incrementOrderCount = function incrementOrderCount(): void {
  this.totalOrders += 1;
};

userSchema.methods.addToTotalSpent = function addToTotalSpent(
  amount: number
): void {
  this.totalSpent += amount;
};

userSchema.methods.getFullName = function getFullName(): string {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name || this.email.split('@')[0];
};

userSchema.methods.getDefaultAddress = function getDefaultAddress(): IAddress | null {
  const defaultAddr = this.addresses.find((addr: IAddress) => addr.isDefault);
  return defaultAddr || (this.addresses.length > 0 ? this.addresses[0] : null);
};

// Pre-save hook to update computed name field
userSchema.pre('save', function preSave(next) {
  // Update computed name field
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`;
  }
  
  next();
});

const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default UserModel;
