import mongoose, { Schema, Model } from 'mongoose';
import { IRewardRule, RewardType } from '../interfaces';

const rewardRuleSchema = new Schema<IRewardRule>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    spendThreshold: { type: Number, required: true, min: 0 },
    triggerType: {
      type: String,
      enum: ['transaction', 'social_instagram'],
      default: 'transaction',
    },
    socialConfig: {
      platform: { type: String, enum: ['instagram'] },
      hashtag: { type: String },
      minViews: { type: Number },
      maxPostsPerPeriod: { type: Number },
      periodType: { type: String, enum: ['weekly', 'monthly', 'campaign_duration'] },
      pointsAwarded: { type: Number },
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
    probability: { type: Number, required: true, min: 0, max: 1 },
    maxRedemptionsPerUser: { type: Number, min: 1 },
    validityDays: { type: Number, required: true, min: 1 },
    startDate: { type: Date },
    endDate: { type: Date },
    campaignDates: [
      {
        from: { type: Date, required: true },
        to: { type: Date, required: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rewardRuleSchema.index({ isActive: 1, spendThreshold: 1 });
rewardRuleSchema.index({ startDate: 1, endDate: 1 });

rewardRuleSchema.methods.isCurrentlyActive = function isCurrentlyActive(): boolean {
  if (!this.isActive) return false;
  const now = new Date();
  
  // Check new campaignDates format (multiple ranges)
  if (this.campaignDates && this.campaignDates.length > 0) {
    // Rule is active if current date falls within any of the date ranges
    return this.campaignDates.some(
      (range: { from: Date; to: Date }) => now >= range.from && now <= range.to
    );
  }
  
  // Fallback to legacy startDate/endDate (single range)
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

const RewardRuleModel: Model<IRewardRule> =
  mongoose.models.RewardRule ||
  mongoose.model<IRewardRule>('RewardRule', rewardRuleSchema);

export default RewardRuleModel;
