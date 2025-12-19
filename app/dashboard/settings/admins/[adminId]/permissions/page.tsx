import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { PermissionsManagementClient } from '@/components/features/admin/permissions-management-client';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{
    adminId: string;
  }>;
}

async function getAdminUser(adminId: string) {
  await connectDB();
  
  const admin = await UserModel.findById(adminId)
    .select('username email firstName lastName role permissions accountStatus')
    .lean();

  if (!admin) {
    return null;
  }

  if (admin.role === 'customer') {
    return null;
  }

  return {
    id: admin._id.toString(),
    username: admin.username || '',
    email: admin.email || '',
    firstName: admin.firstName || '',
    lastName: admin.lastName || '',
    role: admin.role,
    permissions: admin.permissions || null,
    accountStatus: admin.accountStatus,
  };
}

export default async function AdminPermissionsPage({ params }: PageProps) {
  await requireSuperAdmin();
  
  const { adminId } = await params;
  const admin = await getAdminUser(adminId);

  if (!admin) {
    notFound();
  }

  if (admin.role === 'super-admin') {
    redirect('/dashboard/settings/admins');
  }

  const displayName = admin.firstName && admin.lastName
    ? `${admin.firstName} ${admin.lastName}`
    : admin.username;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Permissions</h1>
        <p className="text-muted-foreground mt-2">
          Configure access permissions for {displayName}
        </p>
      </div>

      <Suspense fallback={<PermissionsManagementSkeleton />}>
        <PermissionsManagementClient admin={admin} />
      </Suspense>
    </div>
  );
}

function PermissionsManagementSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}
