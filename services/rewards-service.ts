import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Reward from '@/models/reward-model';
import RewardRule from '@/models/reward-rule-model';
import User from '@/models/user-model';
import { IReward, IRewardRule } from '@/interfaces';

/**
 * Service for managing rewards and reward rules
 */
export class RewardsService {
  /**
   * Generate unique reward code
   */
  private static generateRewardCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'RWD-';
    for (let i = 0; i < 8; i += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get all active reward rules that match the spend threshold
   */
  static async getEligibleRules(spendAmount: number): Promise<IRewardRule[]> {
    await connectDB();

    const now = new Date();
    const rules = await RewardRule.find({
      isActive: true,
      spendThreshold: { $lte: spendAmount },
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
        },
      ],
    })
      .sort({ spendThreshold: -1 })
      .lean();

    return rules as IRewardRule[];
  }

  /**
   * Award points for social actions (e.g. Instagram)
   */
  static async awardSocialPoints(
    userId: string,
    points: number,
    description: string,
    referenceId: string
  ): Promise<void> {
    await connectDB();

    // Dynamically import PointsService to avoid circular dependencies if any
    const { PointsService } = await import('./points-service');

    // Use a "system" ID or generic ID for the order/rule reference since this is social
    // For now we pass undefined for orderId and a new ObjectId for rule/reference
    const refObjectId = new Types.ObjectId();

    await PointsService.awardPoints(
      userId,
      points,
      undefined, // No order ID
      refObjectId, // Using a generated ID as reference
      `${description} (Ref: ${referenceId})`
    );
  }

  /**
   * Calculate and randomly select a reward based on eligible rules
   */
  static async calculateReward(
    userId: string,
    orderId: string,
    spendAmount: number
  ): Promise<IReward | null> {
    await connectDB();

    // Get eligible rules
    const eligibleRules = await this.getEligibleRules(spendAmount);

    if (eligibleRules.length === 0) {
      return null;
    }

    // Check user redemption limits
    const userRedemptionCounts = await this.getUserRedemptionCounts(userId);

    // Filter rules based on max redemptions
    const availableRules = eligibleRules.filter((rule) => {
      if (!rule.maxRedemptionsPerUser) return true;
      const count = userRedemptionCounts.get(rule._id.toString()) || 0;
      return count < rule.maxRedemptionsPerUser;
    });

    if (availableRules.length === 0) {
      return null;
    }

    // Random selection based on probability
    const selectedRule = this.selectRandomRule(availableRules);

    if (!selectedRule) {
      return null;
    }

    // Create reward
    const reward = await this.createReward(userId, orderId, selectedRule);

    // Update user total rewards
    await this.updateUserRewards(userId, reward);

    return reward;
  }

  /**
   * Select a random rule based on probability
   */
  private static selectRandomRule(rules: IRewardRule[]): IRewardRule | null {
    // Generate random number between 0 and 1
    const random = Math.random();

    // Try each rule based on probability
    for (const rule of rules) {
      if (random <= rule.probability) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Get user redemption counts per rule
   */
  private static async getUserRedemptionCounts(
    userId: string
  ): Promise<Map<string, number>> {
    const rewards = await Reward.find({
      userId: new Types.ObjectId(userId),
      status: { $in: ['active', 'redeemed'] },
    }).lean();

    const counts = new Map<string, number>();
    rewards.forEach((reward) => {
      const ruleId = reward.ruleId.toString();
      counts.set(ruleId, (counts.get(ruleId) || 0) + 1);
    });

    return counts;
  }

  /**
   * Create a new reward
   */
  private static async createReward(
    userId: string,
    orderId: string,
    rule: IRewardRule
  ): Promise<IReward> {
    const code = this.generateRewardCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rule.validityDays);

    const reward = await Reward.create({
      userId: new Types.ObjectId(userId),
      ruleId: rule._id,
      orderId: new Types.ObjectId(orderId),
      rewardType: rule.rewardType,
      rewardValue: rule.rewardValue,
      freeItemId: rule.freeItemId,
      status: 'active',
      code,
      expiresAt,
    });

    return reward.toObject();
  }

  /**
   * Update user's total rewards earned
   */
  private static async updateUserRewards(
    userId: string,
    reward: IReward
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) return;

    // Update rewards earned count
    if (!user.rewardsEarned) {
      user.rewardsEarned = 0;
    }
    user.rewardsEarned += 1;

    // Add loyalty points if applicable
    if (reward.rewardType === 'loyalty-points') {
      const PointsService = (await import('./points-service')).PointsService;

      // Use PointsService to properly track points
      await PointsService.awardPoints(
        userId,
        reward.rewardValue,
        reward.orderId,
        reward._id,
        `Earned ${reward.rewardValue} points from reward`
      );
    }

    await user.save();
  }

  /**
   * Get user's active rewards
   */
  static async getUserActiveRewards(userId: string): Promise<IReward[]> {
    await connectDB();

    const now = new Date();
    const rewards = await Reward.find({
      userId: new Types.ObjectId(userId),
      status: 'active',
      expiresAt: { $gt: now },
    })
      .populate('ruleId')
      .populate('freeItemId')
      .sort({ expiresAt: 1 })
      .lean();

    return rewards as IReward[];
  }

  /**
   * Get available reward rules for customer display
   * Filters by user eligibility based on max redemptions
   */
  static async getAvailableRulesForUser(
    userId: string
  ): Promise<IRewardRule[]> {
    await connectDB();

    const now = new Date();
    const allActiveRules = await RewardRule.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
        },
      ],
    })
      .sort({ spendThreshold: 1 })
      .lean();

    // Get user redemption counts
    const userRedemptionCounts = await this.getUserRedemptionCounts(userId);

    // Filter rules based on max redemptions
    const availableRules = allActiveRules.filter((rule) => {
      if (!rule.maxRedemptionsPerUser) return true;
      const count = userRedemptionCounts.get(rule._id.toString()) || 0;
      return count < rule.maxRedemptionsPerUser;
    });

    return availableRules as IRewardRule[];
  }

  /**
   * Get user's reward history
   */
  static async getUserRewardHistory(
    userId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<{ rewards: IReward[]; total: number }> {
    await connectDB();

    const { limit = 20, skip = 0 } = options;

    const [rewards, total] = await Promise.all([
      Reward.find({ userId: new Types.ObjectId(userId) })
        .populate('ruleId')
        .populate('freeItemId')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Reward.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      rewards: rewards as IReward[],
      total,
    };
  }

  /**
   * Validate and get reward by code
   */
  static async validateRewardCode(
    userId: string,
    code: string
  ): Promise<{ valid: boolean; reward?: IReward; message?: string }> {
    await connectDB();

    const reward = await Reward.findOne({ code }).lean();

    if (!reward) {
      return { valid: false, message: 'Invalid reward code' };
    }

    if (reward.userId.toString() !== userId) {
      return { valid: false, message: 'This reward does not belong to you' };
    }

    if (reward.status !== 'active') {
      return {
        valid: false,
        message: 'This reward has already been used or expired',
      };
    }

    const now = new Date();
    if (now > reward.expiresAt) {
      // Mark as expired
      await Reward.findByIdAndUpdate(reward._id, { status: 'expired' });
      return { valid: false, message: 'This reward has expired' };
    }

    return { valid: true, reward: reward as IReward };
  }

  /**
   * Redeem a reward
   */
  static async redeemReward(
    rewardId: string,
    orderId: string
  ): Promise<{ success: boolean; message?: string }> {
    await connectDB();

    const reward = await Reward.findById(rewardId);

    if (!reward) {
      return { success: false, message: 'Reward not found' };
    }

    if (reward.status !== 'active') {
      return { success: false, message: 'Reward is not active' };
    }

    const now = new Date();
    if (now > reward.expiresAt) {
      reward.status = 'expired';
      await reward.save();
      return { success: false, message: 'Reward has expired' };
    }

    // Mark as redeemed
    reward.status = 'redeemed';
    reward.redeemedAt = now;
    reward.redeemedInOrderId = new Types.ObjectId(orderId);
    await reward.save();

    return { success: true };
  }

  /**
   * Calculate discount amount based on reward
   */
  static calculateDiscountAmount(reward: IReward, subtotal: number): number {
    switch (reward.rewardType) {
      case 'discount-percentage':
        return Math.round(subtotal * (reward.rewardValue / 100));
      case 'discount-fixed':
        return Math.min(reward.rewardValue, subtotal);
      case 'loyalty-points':
        // 100 points = ₦1
        return Math.min(Math.floor(reward.rewardValue / 100), subtotal);
      default:
        return 0;
    }
  }

  /**
   * Get reward statistics for user
   */
  static async getUserRewardStats(userId: string): Promise<{
    totalEarned: number;
    totalRedeemed: number;
    activeRewards: number;
    expiredRewards: number;
    totalSavings: number;
    loyaltyPoints: number;
  }> {
    await connectDB();

    const [stats, user] = await Promise.all([
      Reward.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$rewardValue' },
          },
        },
      ]),
      User.findById(userId).select('loyaltyPoints').lean(),
    ]);

    const result = {
      totalEarned: 0,
      totalRedeemed: 0,
      activeRewards: 0,
      expiredRewards: 0,
      totalSavings: 0,
      loyaltyPoints: user?.loyaltyPoints || 0,
    };

    stats.forEach((stat) => {
      const count = stat.count as number;
      const value = stat.totalValue as number;

      switch (stat._id) {
        case 'active':
          result.activeRewards = count;
          result.totalEarned += count;
          break;
        case 'redeemed':
          result.totalRedeemed = count;
          result.totalEarned += count;
          result.totalSavings += value;
          break;
        case 'expired':
          result.expiredRewards = count;
          result.totalEarned += count;
          break;
        default:
          result.totalEarned += count;
      }
    });

    return result;
  }

  /**
   * Expire old rewards (cron job)
   */
  static async expireOldRewards(): Promise<number> {
    await connectDB();

    const now = new Date();
    const result = await Reward.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Restore rewards that were redeemed in a now-cancelled order (REQ-048 /
   * #117 P0 #2). Flips `redeemed` rewards for the order back to `active` and
   * clears the redemption stamps. Idempotent — only matches rewards still
   * marked redeemed for this order. Returns how many were restored.
   */
  static async restoreRedeemedRewards(
    orderId: Types.ObjectId | string
  ): Promise<number> {
    await connectDB();

    const orderIdObj = new Types.ObjectId(orderId as string);
    const result = await Reward.updateMany(
      { redeemedInOrderId: orderIdObj, status: 'redeemed' },
      {
        $set: { status: 'active' },
        $unset: { redeemedAt: '', redeemedInOrderId: '' },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Admin: Create reward rule
   */
  static async createRewardRule(
    ruleData: Omit<IRewardRule, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<IRewardRule> {
    await connectDB();

    const rule = await RewardRule.create(ruleData);
    return rule.toObject();
  }

  /**
   * Admin: Get all reward rules
   */
  static async getAllRewardRules(): Promise<IRewardRule[]> {
    await connectDB();

    const rules = await RewardRule.find().sort({ spendThreshold: 1 }).lean();

    return rules as IRewardRule[];
  }

  /**
   * Admin: Update reward rule
   */
  static async updateRewardRule(
    ruleId: string,
    updates: Partial<IRewardRule>
  ): Promise<IRewardRule | null> {
    await connectDB();

    const rule = await RewardRule.findByIdAndUpdate(
      ruleId,
      { $set: updates },
      { new: true }
    ).lean();

    return rule as IRewardRule | null;
  }

  /**
   * Admin: Delete reward rule
   */
  static async deleteRewardRule(ruleId: string): Promise<boolean> {
    await connectDB();

    const result = await RewardRule.findByIdAndDelete(ruleId);
    return !!result;
  }

  /**
   * Admin: Get reward statistics
   */
  static async getRewardStatistics(): Promise<{
    totalRulesActive: number;
    totalRewardsIssued: number;
    totalRewardsRedeemed: number;
    totalRewardsExpired: number;
    totalValueRedeemed: number;
    redemptionRate: number;
  }> {
    await connectDB();

    const [ruleCount, rewardStats] = await Promise.all([
      RewardRule.countDocuments({ isActive: true }),
      Reward.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$rewardValue' },
          },
        },
      ]),
    ]);

    const stats = {
      totalRulesActive: ruleCount,
      totalRewardsIssued: 0,
      totalRewardsRedeemed: 0,
      totalRewardsExpired: 0,
      totalValueRedeemed: 0,
      redemptionRate: 0,
    };

    rewardStats.forEach((stat) => {
      const count = stat.count as number;
      const value = stat.totalValue as number;

      stats.totalRewardsIssued += count;

      switch (stat._id) {
        case 'redeemed':
          stats.totalRewardsRedeemed = count;
          stats.totalValueRedeemed = value;
          break;
        case 'expired':
          stats.totalRewardsExpired = count;
          break;
        default:
          break;
      }
    });

    if (stats.totalRewardsIssued > 0) {
      stats.redemptionRate =
        (stats.totalRewardsRedeemed / stats.totalRewardsIssued) * 100;
    }

    return stats;
  }

  /**
   * Admin: Manually issue a reward to a specific user
   * This bypasses the automatic reward calculation and directly creates a reward
   */
  static async issueManualReward(
    userId: string,
    rewardType: 'discount-percentage' | 'discount-fixed' | 'loyalty-points',
    rewardValue: number,
    validityDays: number,
    description: string
  ): Promise<IReward> {
    await connectDB();

    // Generate unique code
    const code = this.generateRewardCode();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Create a temporary order ID for manual rewards (using a special marker)
    const manualOrderId = new Types.ObjectId();

    // Create a temporary rule ID for manual rewards
    const manualRuleId = new Types.ObjectId();

    // Create the reward
    const reward = await Reward.create({
      userId: new Types.ObjectId(userId),
      ruleId: manualRuleId, // Temporary ID for manual rewards
      orderId: manualOrderId, // Temporary ID for manual rewards
      rewardType,
      rewardValue,
      status: 'active',
      code,
      expiresAt,
    });

    // Update user rewards count
    const user = await User.findById(userId);
    if (user) {
      if (!user.rewardsEarned) {
        user.rewardsEarned = 0;
      }
      user.rewardsEarned += 1;

      // Add loyalty points if applicable
      if (rewardType === 'loyalty-points') {
        const PointsService = (await import('./points-service')).PointsService;

        await PointsService.awardPoints(
          userId,
          rewardValue,
          undefined,
          reward._id,
          description || `Manually awarded ${rewardValue} points`
        );
      }

      await user.save();
    }

    return reward.toObject();
  }
}
