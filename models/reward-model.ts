import mongoose, { Schema, Model } from 'mongoose';
import { IReward, RewardType, RewardStatus } from '../interfaces';

const rewardSchema = new Schema<IReward>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: 'RewardRule',
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    tabId: {
      type: Schema.Types.ObjectId,
      ref: 'Tab',
    },
    rewardType: {
      type: String,
      enum: [
        'discount-percentage',
        'discount-fixed',
        'free-item',
        'loyalty-points',
      ] as RewardType[],
      required: true,
    },
    rewardValue: { type: Number, required: true, min: 0 },
    freeItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    status: {
      type: String,
      enum: ['pending', 'active', 'redeemed', 'expired'] as RewardStatus[],
      default: 'pending',
    },
    code: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    redeemedAt: { type: Date },
    redeemedInOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rewardSchema.index({ userId: 1, status: 1 });
rewardSchema.index({ expiresAt: 1, status: 1 });

rewardSchema.methods.isExpired = function isExpired(): boolean {
  return new Date() > this.expiresAt;
};

rewardSchema.methods.canBeRedeemed = function canBeRedeemed(): boolean {
  return this.status === 'active' && !this.isExpired();
};

const RewardModel: Model<IReward> =
  mongoose.models.Reward || mongoose.model<IReward>('Reward', rewardSchema);

export default RewardModel;
