'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { TabService } from '@/services/tab-service';
import { ITab } from '@/interfaces';

export interface TabRestrictionResult {
  isRestricted: boolean;
  existingTab: ITab | null;
  message?: string;
}

/**
 * Check if current user is restricted by existing tabs
 * Server action version - safe to call from client components
 */
export async function checkUserTabRestrictionsAction(): Promise<TabRestrictionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    
    const userId = session.userId;
    const role = session.role;

    if (!userId) {
      return {
        isRestricted: false,
        existingTab: null,
      };
    }

    // Admins are never restricted
    if (role === 'admin' || role === 'super-admin') {
      return {
        isRestricted: false,
        existingTab: null,
      };
    }

    // Customers are subject to restrictions
    const existingTab = await TabService.getOpenTabForUser(userId);

    if (existingTab) {
      return {
        isRestricted: true,
        existingTab,
        message: `You have an open tab at Table ${existingTab.tableNumber}`,
      };
    }

    return {
      isRestricted: false,
      existingTab: null,
    };
  } catch (error) {
    console.error('Error checking tab restrictions:', error);
    return {
      isRestricted: false,
      existingTab: null,
    };
  }
}
