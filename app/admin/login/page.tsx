import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth-middleware';
import { AdminLoginForm } from '@/components/features/admin/admin-login-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { hasAnyRole } from '@/lib/session';
export const metadata = {
  title: 'Admin Login | Wawa Garden Bar',
  description: 'Admin login portal',
};

export default async function AdminLoginPage() {
  // Check if already logged in
  const session = await getCurrentSession();

  if (session?.isLoggedIn && hasAnyRole(session, ['admin', 'super-admin'])) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Admin Login
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
