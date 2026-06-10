/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Server component for /dashboard/reports/by-main-category. Two gates:
 *   1. session.role ∈ {'admin', 'super-admin'}
 *   2. getAllowedMainCategoriesForReports returns ≥1 slug
 *
 * Loads the registry + filters to the session's allowed enabled mains,
 * then hands the list + initial selection to the client component.
 * Page-level redirect on no-access (vs in-client) so an unauthorized
 * direct URL never reaches the client bundle.
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { SystemSettingsService } from '@/services/system-settings-service';
import { getAllowedMainCategoriesForReports } from '@/lib/permissions';
import { ByMainCategoryReportClient } from './by-main-category-report-client';

export const metadata = {
  title: 'Per-Main-Category Report | Wawa Garden Bar',
  description:
    'Revenue, costs, gross profit + items scoped to one main category.',
};

async function getSession() {
  return await getIronSession<SessionData>(await cookies(), sessionOptions);
}

export default async function ByMainCategoryReportPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  if (session.role !== 'super-admin' && session.role !== 'admin') {
    redirect('/dashboard');
  }

  // Filter the registry to enabled mains + intersect with per-user
  // access. Empty result → redirect away from the page entirely.
  const allMains = await SystemSettingsService.getMainCategories();
  const enabledMains = allMains
    .filter((m) => m.isEnabled)
    .sort((a, b) => a.order - b.order);
  const enabledSlugs = enabledMains.map((m) => m.slug);
  const allowedSlugs = getAllowedMainCategoriesForReports(
    session,
    enabledSlugs
  );

  if (allowedSlugs.length === 0) {
    redirect('/dashboard');
  }

  const allowedMains = enabledMains.filter((m) =>
    allowedSlugs.includes(m.slug)
  );

  return (
    <ByMainCategoryReportClient
      mainCategories={allowedMains.map((m) => ({
        slug: m.slug,
        label: m.label,
      }))}
    />
  );
}
