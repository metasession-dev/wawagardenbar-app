import mongoose, { Schema, Model } from 'mongoose';
import { Types } from 'mongoose';

export interface ISystemSettings {
  _id: Types.ObjectId;
  key: 'points-conversion-rate' | 'service-fee' | 'tax-rate' | 'notification-preferences' | 'expense-categories';
  value: any;
  description?: string;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
  previousValue?: number;
  changeHistory: Array<{
    value: number;
    changedBy: Types.ObjectId;
    changedAt: Date;
    reason?: string;
  }>;
}

const systemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['points-conversion-rate', 'service-fee', 'tax-rate', 'notification-preferences', 'payment-gateway-config', 'expense-categories'],
    },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
    previousValue: { type: Schema.Types.Mixed },
    changeHistory: [
      {
        value: { type: Schema.Types.Mixed },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date },
        reason: { type: String },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// key index is already created via unique: true in schema definition

const SystemSettingsModel: Model<ISystemSettings> =
  mongoose.models.SystemSettings ||
  mongoose.model<ISystemSettings>('SystemSettings', systemSettingsSchema);

export default SystemSettingsModel;
