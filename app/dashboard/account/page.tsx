import { requireStaff } from '@/lib/auth-middleware';
import { StaffAlertNumberCard } from '@/components/features/admin/staff-alert-number-card';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My account | Admin Dashboard',
  description: 'Your WhatsApp alert number',
};

/**
 * @requirement REQ-122 - Staff own account page (alert number)
 * @srs REQ-AUTHA-008
 *
 * Open to every staff role, kitchen included: each member verifies their own
 * WhatsApp alert number here.
 */
export default async function StaffAccountPage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My account</h1>
        <p className="text-muted-foreground">
          Your WhatsApp number for staff alerts.
        </p>
      </div>
      <StaffAlertNumberCard />
    </div>
  );
}
