import { getCurrentSession } from '@/lib/auth-middleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Session Debugger | Wawa Garden Bar',
};

export default async function DebugSessionPage() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Session Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You are not logged in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const permissions = session.permissions || {};
  const permissionKeys = [
    'orderManagement',
    'menuManagement',
    'inventoryManagement',
    'rewardsAndLoyalty',
    'reportsAndAnalytics',
    'expensesManagement',
    'settingsAndConfiguration',
  ];

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Session Debugger</h1>
        <p className="text-muted-foreground">
          Inspect your current session data and permissions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
              <span className="font-semibold">User ID:</span>
              <span className="font-mono">{session.userId}</span>
              
              <span className="font-semibold">Name:</span>
              <span>{session.name}</span>
              
              <span className="font-semibold">Email:</span>
              <span>{session.email}</span>
              
              <span className="font-semibold">Role:</span>
              <Badge variant={session.role === 'super-admin' ? 'default' : 'secondary'}>
                {session.role}
              </Badge>
              
              <span className="font-semibold">Is Guest:</span>
              <span>{session.isGuest ? 'Yes' : 'No'}</span>
              
              <span className="font-semibold">Is Logged In:</span>
              <span>{session.isLoggedIn ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissionKeys.map((key) => {
                const hasPermission = (permissions as any)[key] === true;
                return (
                  <div key={key} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {hasPermission ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        <span className="text-sm font-bold">Granted</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-500">
                        <XCircle className="mr-2 h-4 w-4" />
                        <span className="text-sm">Denied</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 rounded-md bg-muted p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Raw Permissions Object:</p>
              <pre className="overflow-auto text-xs font-mono">
                {JSON.stringify(permissions, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
