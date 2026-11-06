'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { RewardsService, UserService } from '@/services';
import { sessionOptions, SessionData, hasAnyRole } from '@/lib/session';
import { IReward, IUser } from '@/interfaces';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Search for users by email or phone (admin only)
 */
export async function searchUsersAction(
  query: string
): Promise<ActionResult<{ users: IUser[] }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is admin or super-admin
    if (!session.isLoggedIn || !hasAnyRole(session, ['admin', 'super-admin'])) {
      return {
        success: false,
        error: 'Unauthorized. Admin access required.',
      };
    }

    const users = await UserService.searchUsers(query);

    // Serialize users for client
    const serializedUsers = JSON.parse(JSON.stringify(users));

    return {
      success: true,
      data: { users: serializedUsers },
    };
  } catch (error) {
    console.error('Error searching users:', error);
    return {
      success: false,
      error: 'Failed to search users',
    };
  }
}

/**
 * Issue a manual reward to a specific user (admin only)
 */
export async function issueManualRewardAction(data: {
  userId: string;
  rewardType: 'discount-percentage' | 'discount-fixed' | 'loyalty-points';
  rewardValue: number;
  validityDays: number;
  description: string;
}): Promise<ActionResult<{ reward: IReward }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is admin or super-admin
    if (!session.isLoggedIn || !hasAnyRole(session, ['admin', 'super-admin'])) {
      return {
        success: false,
        error: 'Unauthorized. Admin access required.',
      };
    }

    // Validate input
    if (
      !data.userId ||
      !data.rewardType ||
      !data.rewardValue ||
      !data.validityDays
    ) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    if (data.rewardValue <= 0) {
      return {
        success: false,
        error: 'Reward value must be greater than 0',
      };
    }

    if (data.validityDays <= 0 || data.validityDays > 365) {
      return {
        success: false,
        error: 'Validity days must be between 1 and 365',
      };
    }

    // Check if user exists
    const user = await UserService.getUserById(data.userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Issue the reward
    const reward = await RewardsService.issueManualReward(
      data.userId,
      data.rewardType,
      data.rewardValue,
      data.validityDays,
      data.description
    );

    // Serialize reward for client
    const serializedReward = JSON.parse(JSON.stringify(reward));

    // Revalidate relevant paths
    revalidatePath('/dashboard/rewards/issued');
    revalidatePath('/profile/rewards');

    return {
      success: true,
      data: { reward: serializedReward },
      message: `Reward successfully issued to ${user.firstName} ${user.lastName}`,
    };
  } catch (error) {
    console.error('Error issuing manual reward:', error);
    return {
      success: false,
      error: 'Failed to issue reward',
    };
  }
}
