import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Settings section layout
 * Requires settingsAndConfiguration permission for all sub-routes
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('settingsAndConfiguration');

  return <>{children}</>;
}
