import { requireKitchen } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Kitchen section layout — REQ-034 AC4.
 *
 * Gated by `requireKitchen()` (kitchen / admin / super-admin) so the
 * new `kitchen` role — whose feature-permissions are all-false by
 * design — can reach /dashboard/kitchen and the recipe / production
 * sub-routes. Matches the route-allowlist in `lib/permissions.ts`.
 */
export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireKitchen();

  return <>{children}</>;
}
