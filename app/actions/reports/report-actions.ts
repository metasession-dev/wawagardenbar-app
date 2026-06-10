'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { FinancialReportService } from '@/services/financial-report-service';
import { SystemSettingsService } from '@/services/system-settings-service';
import { getAllowedMainCategoriesForReports } from '@/lib/permissions';
import type { MainCategoryReport } from '@/services/financial-report-service';

/**
 * Generate daily summary report
 */
export async function generateDailyReportAction(date: Date) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin and admin can view reports
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const report = await FinancialReportService.generateDailySummary(date);

    return {
      success: true,
      report: JSON.parse(JSON.stringify(report)),
    };
  } catch (error) {
    console.error('Error generating daily report:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}

/**
 * Generate date range report
 */
export async function generateDateRangeReportAction(
  startDate: Date,
  endDate: Date
) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin and admin can view reports
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const report = await FinancialReportService.generateDateRangeReport(
      startDate,
      endDate
    );

    return {
      success: true,
      report: JSON.parse(JSON.stringify(report)),
    };
  } catch (error) {
    console.error('Error generating date range report:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}

/**
 * REQ-076 — Generate a per-main-category report.
 *
 * Two-gate auth:
 *   1. `requireRole(['admin', 'super-admin'])` — same gate as the
 *      sibling daily / range actions.
 *   2. `getAllowedMainCategoriesForReports` — sub-filter for per-user
 *      main-category access. The slug being requested MUST appear in
 *      the session's allowed-mains list; otherwise the action returns
 *      `'Forbidden: not authorized for this main category'` verbatim
 *      (string pinned by the RBAC E2E spec).
 *
 * Empty allowed-mains list (zero access) returns a generic 'Forbidden'
 * — the UI redirects users in that state away from the page entirely,
 * so a direct action invocation reaching here is by definition either
 * a bug or a probe attempt.
 *
 * @requirement REQ-076
 * @requirement SRS REQ-MENUMGT-006
 */
export async function generateMainCategoryReportAction(
  startDate: Date,
  endDate: Date,
  mainCategorySlug: string
): Promise<
  | { success: true; report: MainCategoryReport }
  | { success: false; error: string }
> {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Resolve allowed mains from the registry + session permissions.
    const allMains = await SystemSettingsService.getMainCategories();
    const enabledSlugs = allMains.filter((m) => m.isEnabled).map((m) => m.slug);
    const allowed = getAllowedMainCategoriesForReports(session, enabledSlugs);

    if (allowed.length === 0) {
      return { success: false, error: 'Forbidden' };
    }

    if (!allowed.includes(mainCategorySlug)) {
      return {
        success: false,
        error: 'Forbidden: not authorized for this main category',
      };
    }

    const report = await FinancialReportService.generateMainCategoryReport(
      startDate,
      endDate,
      mainCategorySlug
    );

    return {
      success: true,
      report: JSON.parse(JSON.stringify(report)),
    };
  } catch (error) {
    console.error('Error generating main-category report:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate report',
    };
  }
}
