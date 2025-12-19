import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentSession } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Access Forbidden | Wawa Garden Bar',
  description: 'You do not have permission to access this section',
};

/**
 * Forbidden access page for dashboard sections
 * Shown when admin users try to access restricted sections
 */
export default async function ForbiddenPage() {
  const session = await getCurrentSession();
  const permissions = session?.permissions || {};

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Forbidden</CardTitle>
          <CardDescription className="text-base">
            You don&apos;t have permission to access this section
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">Why am I seeing this?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You don&apos;t have permission to access this feature</li>
              <li>Your administrator has not enabled this feature for your account</li>
            </ul>
          </div>

          {/* Debug Info */}
          <div className="rounded-lg border p-4 text-xs font-mono bg-slate-50 dark:bg-slate-950">
            <p className="font-bold mb-2 text-muted-foreground">Debug Information:</p>
            <p>Role: <span className="text-foreground">{session?.role || 'Unknown'}</span></p>
            <div className="mt-2">
              <p className="mb-1 text-muted-foreground">Permissions:</p>
              <pre className="overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(permissions, null, 2)}
              </pre>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Contact your super administrator if you need access to this section.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
