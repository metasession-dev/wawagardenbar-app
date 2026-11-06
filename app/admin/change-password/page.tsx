import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth-middleware';
import { ChangePasswordForm } from '@/components/features/admin/change-password-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

import { hasAnyRole } from '@/lib/session';
export const metadata = {
  title: 'Change Password | Wawa Garden Bar',
  description: 'Change your admin password',
};

export default async function ChangePasswordPage() {
  // Check if logged in
  const session = await getCurrentSession();

  if (!session?.isLoggedIn || !hasAnyRole(session, ['admin', 'super-admin'])) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Change Password
          </CardTitle>
          <CardDescription className="text-center">
            Update your admin password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              For security reasons, you must change your temporary password
              before accessing the dashboard.
            </AlertDescription>
          </Alert>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
