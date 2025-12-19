import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Rewards section layout
 * Requires rewardsAndLoyalty permission for all sub-routes
 */
export default async function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('rewardsAndLoyalty');

  return <>{children}</>;
}
