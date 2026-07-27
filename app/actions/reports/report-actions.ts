'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { FinancialReportService } from '@/services/financial-report-service';
import { SystemSettingsService } from '@/services/system-settings-service';
import { getAllowedMainCategoriesForReports } from '@/lib/permissions';
import {
  addBusinessDateLabels,
  businessDateAtCutoff,
  businessDateLabelForInstant,
} from '@/lib/business-date';
import type { MainCategoryReport } from '@/services/financial-report-service';

/**
 * @requirement REQ-095 - Resolve report selections as business-date labels.
 * Generate daily summary report.
 *
 * `date` as a string is a literal, explicit business-date label (the
 * user picked an exact calendar day via the date picker) — used as-is,
 * no cutoff resolution.
 *
 * `date` as a Date is a wall-clock instant to resolve through the
 * configured cutoff — used by the Today/Yesterday quick buttons.
 * `labelOffsetDays` shifts the *resolved label*, not the input instant:
 * Yesterday must be "today's operational business date, minus one
 * label", not "yesterday's wall-clock instant, independently resolved
 * through the cutoff" — the latter is the original REQ-095 bug (a date
 * already shifted back by the cutoff gets shifted again), and
 * independently resolving two raw instants can also produce a Today
 * that doesn't match the business date orders paid "right now" are
 * actually attributed to when the current time is before the cutoff.
 */
export async function generateDailyReportAction(
  date: Date | string,
  labelOffsetDays = 0
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

    const cutoff = await SystemSettingsService.getBusinessDayCutoff();
    let label: string;
    if (typeof date === 'string') {
      label = date;
    } else {
      const resolved = businessDateLabelForInstant(date, cutoff);
      label =
        labelOffsetDays === 0
          ? resolved
          : addBusinessDateLabels(resolved, labelOffsetDays);
    }
    const report = await FinancialReportService.generateDailySummary(
      businessDateAtCutoff(label, cutoff)
    );

    return {
      success: true,
      report: JSON.parse(JSON.stringify(report)),
      resolvedLabel: label,
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
  startDate: Date | string,
  endDate: Date | string,
  preset?: 'last-7-days'
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

    const cutoff = await SystemSettingsService.getBusinessDayCutoff();
    const currentLabel = businessDateLabelForInstant(new Date(), cutoff);
    const startLabel =
      preset === 'last-7-days'
        ? addBusinessDateLabels(currentLabel, -6)
        : typeof startDate === 'string'
          ? startDate
          : startDate.toISOString().slice(0, 10);
    const endLabel =
      preset === 'last-7-days'
        ? currentLabel
        : typeof endDate === 'string'
          ? endDate
          : endDate.toISOString().slice(0, 10);
    const report = await FinancialReportService.generateDateRangeReport(
      new Date(`${startLabel}T00:00:00.000Z`),
      new Date(`${endLabel}T00:00:00.000Z`)
    );

    return {
      success: true,
      report: JSON.parse(JSON.stringify(report)),
      // REQ-095 - The `last-7-days` preset resolves its own range
      // server-side and ignores the caller's startDate/endDate; return
      // what was actually queried so the picker display can't show a
      // different span than the data underneath it.
      resolvedStartLabel: startLabel,
      resolvedEndLabel: endLabel,
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
