/**
 * @requirement REQ-019
 * @requirement REQ-020
 */
'use server';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import {
  RestockRecommendationService,
  type RestockRecommendationReport,
  type RestockStrategy,
} from '@/services/restock-recommendation-service';
import { CategoryService } from '@/services/category-service';

interface GetRestockRecommendationsParams {
  mainCategory?: 'food' | 'drinks';
  categories?: string[];
  days: number;
  priceMin?: number;
  priceMax?: number;
  priorityFilter?: 'urgent' | 'medium' | 'low' | 'all';
  strategy?: RestockStrategy;
}

export async function getRestockRecommendationsAction(
  params: GetRestockRecommendationsParams
): Promise<{
  success: boolean;
  data: RestockRecommendationReport | null;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Forbidden', data: null };
    }

    const priceBracket =
      params.priceMin !== undefined || params.priceMax !== undefined
        ? { min: params.priceMin, max: params.priceMax }
        : undefined;

    const report = await RestockRecommendationService.getRestockRecommendations(
      {
        mainCategory: params.mainCategory,
        categories: params.categories,
        days: params.days,
        priceBracket,
        priorityFilter: params.priorityFilter,
        strategy: params.strategy,
      }
    );

    return { success: true, data: JSON.parse(JSON.stringify(report)) };
  } catch (error) {
    console.error('Error fetching restock recommendations:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch restock recommendations',
      data: null,
    };
  }
}

export async function getAvailableCategoriesAction(): Promise<{
  success: boolean;
  data: { drinks: string[]; food: string[] } | null;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Forbidden', data: null };
    }

    const categories = await CategoryService.getCategories();

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch categories',
      data: null,
    };
  }
}
