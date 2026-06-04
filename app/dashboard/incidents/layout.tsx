import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-066 AC6 — Incidents section RBAC
 * @requirement REQ-066 AC10 — fine-grained `incidentsAccess` permission
 *
 * `requirePermission` enforces (a) admin-side role (csr / admin /
 * super-admin) and (b) the `incidentsAccess` feature flag. Super-admin
 * bypasses (b) per `requirePermission`'s built-in shortcut.
 */
export default async function IncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('incidentsAccess');
  return <>{children}</>;
}
