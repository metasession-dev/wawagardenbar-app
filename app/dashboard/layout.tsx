import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-middleware';
import { DashboardNav } from '@/components/features/admin/dashboard-nav';
import { Breadcrumb } from '@/components/shared/breadcrumb';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Dashboard | Wawa Garden Bar',
  description: 'Manage your restaurant operations',
};

/**
 * Admin dashboard layout
 * Requires admin or super-admin role
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require admin authentication
  const session = await requireAdmin();

  if (!session.userId) {
    redirect('/login');
  }

  // Debug logging
  console.log(`[DashboardLayout] Access granted to user: ${session.email}`);
  console.log(`[DashboardLayout] User Role: ${session.role}`);
  if (session.permissions) {
    console.log(
      `[DashboardLayout] Permissions:`,
      JSON.stringify(session.permissions, null, 2)
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <DashboardNav
        userEmail={session.email}
        userRole={session.role}
        permissions={session.permissions}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center border-b bg-card px-6">
          <div className="flex flex-1 items-center justify-between">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <div className="flex items-center gap-4">
              {/* Future: Notifications, Quick Actions */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-background">
          <div className="p-6">
            {/* Breadcrumb Navigation */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
