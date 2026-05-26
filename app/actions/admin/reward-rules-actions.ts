'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { RewardsService } from '@/services/rewards-service';
import { requireAdmin } from '@/lib/auth-middleware';
import { IRewardRule } from '@/interfaces';

/**
 * Action result type
 */
interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Paginated result type
 */
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Validation schema for creating/updating reward rules
 */
const rewardRuleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  isActive: z.boolean().default(true),
  spendThreshold: z.number().min(0, 'Spend threshold must be 0 or greater'),
  // REQ-046 D2 fix: the social-rule fields (triggerType, socialConfig,
  // campaignDates) were silently stripped here by Zod's default-strip
  // behaviour, so even a fully-filled social_instagram form created a
  // transaction rule with no socialConfig. Add them so they persist.
  triggerType: z.enum(['transaction', 'social_instagram']).optional(),
  socialConfig: z.object({
    platform: z.enum(['instagram']),
    hashtag: z.string().min(2, 'Hashtag required'),
    minViews: z.number().min(0),
    maxPostsPerPeriod: z.number().min(1),
    periodType: z.enum(['weekly', 'monthly', 'campaign_duration']),
    pointsAwarded: z.number().min(1),
    postsRequired: z.number().int().min(1).optional(),
    windowDays: z.number().int().min(1).optional(),
    requireMention: z.boolean().optional(),
  }).optional(),
  rewardType: z.enum(['discount-percentage', 'discount-fixed', 'free-item', 'loyalty-points']),
  rewardValue: z.number().positive('Reward value must be positive'),
  freeItemId: z.string().nullable().optional(),
  probability: z.number().min(0, 'Probability must be between 0 and 1').max(1, 'Probability must be between 0 and 1'),
  maxRedemptionsPerUser: z.number().int().positive().optional(),
  validityDays: z.number().int().positive('Validity days must be positive'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  campaignDates: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })).optional(),
}).refine(
  (data) => {
    // If free-item, freeItemId is required
    if (data.rewardType === 'free-item' && !data.freeItemId) {
      return false;
    }
    return true;
  },
  { message: 'Free item must be selected for free-item reward type', path: ['freeItemId'] }
).refine(
  (data) => {
    // End date must be after start date
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end <= start) {
        return false;
      }
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

type RewardRuleInput = z.infer<typeof rewardRuleSchema>;

/**
 * Create new reward rule
 */
export async function createRewardRuleAction(
  input: RewardRuleInput
): Promise<ActionResult<IRewardRule>> {
  try {
    // Verify admin access
    await requireAdmin();

    // Validate input
    const validatedData = rewardRuleSchema.parse(input);

    // Prepare data for service
    const ruleData: any = {
      ...validatedData,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
    };

    // Convert freeItemId string to ObjectId if provided
    if (ruleData.freeItemId) {
      const { Types } = await import('mongoose');
      ruleData.freeItemId = new Types.ObjectId(ruleData.freeItemId);
    }

    // Create rule
    const rule = await RewardsService.createRewardRule(ruleData);

    // Revalidate paths
    revalidatePath('/dashboard/rewards');
    revalidatePath('/dashboard/rewards/rules');

    // Serialize Mongoose document
    const serializedRule = JSON.parse(JSON.stringify(rule));

    return {
      success: true,
      message: 'Reward rule created successfully',
      data: serializedRule,
    };
  } catch (error) {
    console.error('Error creating reward rule:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reward rule',
    };
  }
}

/**
 * Update existing reward rule
 */
export async function updateRewardRuleAction(
  ruleId: string,
  input: Partial<RewardRuleInput>
): Promise<ActionResult<IRewardRule>> {
  try {
    // Verify admin access
    await requireAdmin();

    // Validate input (skip refinements for partial updates).
    // REQ-046 D2: same social-rule fields as createRewardRuleAction so edits
    // to a social_instagram rule actually persist socialConfig changes.
    const baseSchema = z.object({
      name: z.string().min(3).max(100).optional(),
      description: z.string().min(10).max(500).optional(),
      isActive: z.boolean().optional(),
      spendThreshold: z.number().min(0).optional(),
      triggerType: z.enum(['transaction', 'social_instagram']).optional(),
      socialConfig: z.object({
        platform: z.enum(['instagram']),
        hashtag: z.string().min(2),
        minViews: z.number().min(0),
        maxPostsPerPeriod: z.number().min(1),
        periodType: z.enum(['weekly', 'monthly', 'campaign_duration']),
        pointsAwarded: z.number().min(1),
        postsRequired: z.number().int().min(1).optional(),
        windowDays: z.number().int().min(1).optional(),
        requireMention: z.boolean().optional(),
      }).optional(),
      rewardType: z.enum(['discount-percentage', 'discount-fixed', 'free-item', 'loyalty-points']).optional(),
      rewardValue: z.number().positive().optional(),
      freeItemId: z.string().nullable().optional(),
      probability: z.number().min(0).max(1).optional(),
      maxRedemptionsPerUser: z.number().int().positive().optional(),
      validityDays: z.number().int().positive().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      campaignDates: z.array(z.object({
        from: z.string(),
        to: z.string(),
      })).optional(),
    });
    const validatedData = baseSchema.parse(input);

    // Prepare data for service
    const updates: any = {
      ...validatedData,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
    };

    // Convert freeItemId string to ObjectId if provided
    if (updates.freeItemId) {
      const { Types } = await import('mongoose');
      updates.freeItemId = new Types.ObjectId(updates.freeItemId);
    }

    // Update rule
    const rule = await RewardsService.updateRewardRule(ruleId, updates);

    if (!rule) {
      return {
        success: false,
        error: 'Reward rule not found',
      };
    }

    // Revalidate paths
    revalidatePath('/dashboard/rewards');
    revalidatePath('/dashboard/rewards/rules');
    revalidatePath(`/dashboard/rewards/rules/${ruleId}`);

    // Serialize Mongoose document
    const serializedRule = JSON.parse(JSON.stringify(rule));

    return {
      success: true,
      message: 'Reward rule updated successfully',
      data: serializedRule,
    };
  } catch (error) {
    console.error('Error updating reward rule:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update reward rule',
    };
  }
}

/**
 * Delete reward rule
 */
export async function deleteRewardRuleAction(
  ruleId: string
): Promise<ActionResult> {
  try {
    // Verify admin access
    await requireAdmin();

    // Delete rule
    const deleted = await RewardsService.deleteRewardRule(ruleId);

    if (!deleted) {
      return {
        success: false,
        error: 'Reward rule not found',
      };
    }

    // Revalidate paths
    revalidatePath('/dashboard/rewards');
    revalidatePath('/dashboard/rewards/rules');

    return {
      success: true,
      message: 'Reward rule deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting reward rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete reward rule',
    };
  }
}

/**
 * Toggle reward rule active status
 */
export async function toggleRewardRuleStatusAction(
  ruleId: string
): Promise<ActionResult<IRewardRule>> {
  try {
    // Verify admin access
    await requireAdmin();

    // Get current rule
    const rules = await RewardsService.getAllRewardRules();
    const currentRule = rules.find((r) => r._id.toString() === ruleId);

    if (!currentRule) {
      return {
        success: false,
        error: 'Reward rule not found',
      };
    }

    // Toggle status
    const rule = await RewardsService.updateRewardRule(ruleId, {
      isActive: !currentRule.isActive,
    });

    if (!rule) {
      return {
        success: false,
        error: 'Failed to toggle status',
      };
    }

    // Revalidate paths
    revalidatePath('/dashboard/rewards');
    revalidatePath('/dashboard/rewards/rules');

    // Serialize Mongoose document
    const serializedRule = JSON.parse(JSON.stringify(rule));

    return {
      success: true,
      message: `Reward rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: serializedRule,
    };
  } catch (error) {
    console.error('Error toggling reward rule status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle status',
    };
  }
}

/**
 * Get all reward rules with optional filters
 */
export async function getRewardRulesAction(
  filters?: {
    status?: 'active' | 'inactive';
    rewardType?: string;
    search?: string;
  },
  page: number = 1,
  limit: number = 50
): Promise<ActionResult<PaginatedResult<IRewardRule>>> {
  try {
    // Verify admin access
    await requireAdmin();

    // Get all rules
    let rules = await RewardsService.getAllRewardRules();

    // Apply filters
    if (filters?.status) {
      const isActive = filters.status === 'active';
      rules = rules.filter((rule) => rule.isActive === isActive);
    }

    if (filters?.rewardType) {
      rules = rules.filter((rule) => rule.rewardType === filters.rewardType);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      rules = rules.filter((rule) =>
        rule.name.toLowerCase().includes(searchLower) ||
        rule.description.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = rules.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRules = rules.slice(startIndex, endIndex);

    // Serialize Mongoose documents to plain objects
    const serializedRules = paginatedRules.map((rule) => JSON.parse(JSON.stringify(rule)));

    return {
      success: true,
      data: {
        data: serializedRules as any,
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error getting reward rules:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reward rules',
    };
  }
}

/**
 * Get single reward rule by ID
 */
export async function getRewardRuleByIdAction(
  ruleId: string
): Promise<ActionResult<IRewardRule>> {
  try {
    // Verify admin access
    await requireAdmin();

    // Get all rules and find the one
    const rules = await RewardsService.getAllRewardRules();
    const rule = rules.find((r) => r._id.toString() === ruleId);

    if (!rule) {
      return {
        success: false,
        error: 'Reward rule not found',
      };
    }

    // Serialize Mongoose document
    const serializedRule = JSON.parse(JSON.stringify(rule));

    return {
      success: true,
      data: serializedRule,
    };
  } catch (error) {
    console.error('Error getting reward rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reward rule',
    };
  }
}

/**
 * Duplicate reward rule
 */
export async function duplicateRewardRuleAction(
  ruleId: string
): Promise<ActionResult<IRewardRule>> {
  try {
    // Verify admin access
    await requireAdmin();

    // Get original rule
    const rules = await RewardsService.getAllRewardRules();
    const originalRule = rules.find((r) => r._id.toString() === ruleId);

    if (!originalRule) {
      return {
        success: false,
        error: 'Reward rule not found',
      };
    }

    // Create duplicate with modifications
    const duplicateData = {
      name: `${originalRule.name} (Copy)`,
      description: originalRule.description,
      isActive: false, // Set to inactive by default
      spendThreshold: originalRule.spendThreshold,
      rewardType: originalRule.rewardType,
      rewardValue: originalRule.rewardValue,
      freeItemId: originalRule.freeItemId,
      probability: originalRule.probability,
      maxRedemptionsPerUser: originalRule.maxRedemptionsPerUser,
      validityDays: originalRule.validityDays,
      // Clear dates
      startDate: undefined,
      endDate: undefined,
    };

    const newRule = await RewardsService.createRewardRule(duplicateData);

    // Revalidate paths
    revalidatePath('/dashboard/rewards');
    revalidatePath('/dashboard/rewards/rules');

    // Serialize Mongoose document
    const serializedRule = JSON.parse(JSON.stringify(newRule));

    return {
      success: true,
      message: 'Reward rule duplicated successfully',
      data: serializedRule,
    };
  } catch (error) {
    console.error('Error duplicating reward rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to duplicate reward rule',
    };
  }
}

/**
 * Bulk update reward rules (activate/deactivate)
 */
export async function bulkUpdateRewardRulesAction(
  ruleIds: string[],
  action: 'activate' | 'deactivate'
): Promise<ActionResult> {
  try {
    // Verify admin access
    await requireAdmin();

    const isActive = action === 'activate';
    let updatedCount = 0;

    // Update each rule
    for (const ruleId of ruleIds) {
      const rule = await RewardsService.updateRewardRule(ruleId, { isActive });
      if (rule) {
        updatedCount += 1;
      }
    }

    // Revalidate paths
    revalidatePath('/dashboard/rewards');
    revalidatePath('/dashboard/rewards/rules');

    return {
      success: true,
      message: `${updatedCount} reward rule(s) ${action}d successfully`,
    };
  } catch (error) {
    console.error('Error bulk updating reward rules:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk update reward rules',
    };
  }
}
