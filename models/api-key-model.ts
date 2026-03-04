import mongoose, { Schema, Model } from 'mongoose';
import { IApiKey, ApiKeyScope } from '@/interfaces/api-key.interface';

const API_KEY_SCOPES: ApiKeyScope[] = [
  'menu:read',
  'orders:read',
  'orders:write',
  'inventory:read',
  'inventory:write',
  'customers:read',
  'customers:write',
  'payments:read',
  'payments:write',
  'rewards:read',
  'settings:read',
  'analytics:read',
];

const apiKeySchema = new Schema<IApiKey>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    keyPrefix: {
      type: String,
      required: true,
      index: true,
    },
    scopes: {
      type: [String],
      enum: API_KEY_SCOPES,
      default: ['menu:read'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastUsedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    rateLimit: {
      type: Number,
      default: 60,
      min: 1,
      max: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

apiKeySchema.index({ createdBy: 1, isActive: 1 });
apiKeySchema.index({ expiresAt: 1 }, { sparse: true });

apiKeySchema.methods.isExpired = function isExpired(): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

apiKeySchema.methods.isValid = function isValid(): boolean {
  return this.isActive && !this.isExpired();
};

const ApiKeyModel: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', apiKeySchema);

export default ApiKeyModel;
