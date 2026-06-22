import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { TabService } from '@/services';
import { AdminTabCheckoutForm } from '@/components/features/tabs/admin-tab-checkout-form';

interface DashboardTabCheckoutPageProps {
  params: Promise<{
    tabId: string;
  }>;
}

async function getTabForCheckout(tabId: string) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (
    !session.userId ||
    (session.role !== 'admin' && session.role !== 'super-admin')
  ) {
    redirect('/dashboard');
  }

  const tab = await TabService.getTabById(tabId);

  if (!tab) {
    redirect('/dashboard/orders/tabs');
  }

  if (tab.status === 'closed') {
    redirect(`/dashboard/orders/tabs/${tabId}`);
  }

  return { tab: JSON.parse(JSON.stringify(tab)), session };
}

/**
 * @requirement REQ-084 - Admin tab checkout with manual payment form
 * @requirement REQ-TABMGT-003 - Admin pay tab
 */
export default async function DashboardTabCheckoutPage({
  params,
}: DashboardTabCheckoutPageProps) {
  const { tabId } = await params;
  const { tab } = await getTabForCheckout(tabId);

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminTabCheckoutForm tab={tab} />
    </div>
  );
}
