'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PermissionsEditor } from './permissions-editor';
import { updateAdminPermissionsAction } from '@/app/actions/admin/admin-management-actions';
import { IAdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from '@/interfaces';
import { Loader2, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Admin {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: IAdminPermissions | null;
  accountStatus: string;
}

interface PermissionsManagementClientProps {
  admin: Admin;
}

export function PermissionsManagementClient({ admin }: PermissionsManagementClientProps) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<IAdminPermissions>(
    admin.permissions || DEFAULT_ADMIN_PERMISSIONS
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const displayName = admin.firstName && admin.lastName
    ? `${admin.firstName} ${admin.lastName}`
    : admin.username;

  function handlePermissionsChange(newPermissions: IAdminPermissions) {
    setPermissions(newPermissions);
    setHasChanges(true);
    setError(null);
  }

  function handleReset() {
    setPermissions(admin.permissions || DEFAULT_ADMIN_PERMISSIONS);
    setHasChanges(false);
    setError(null);
  }

  async function handleSave() {
    try {
      setIsLoading(true);
      setError(null);

      const result = await updateAdminPermissionsAction(admin.id, permissions);

      if (!result.success) {
        setError(result.message);
        return;
      }

      toast.success('Permissions updated successfully. The admin user must log out and log back in for changes to take effect.');
      setHasChanges(false);
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Admin Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Information</CardTitle>
              <CardDescription>Current admin user details</CardDescription>
            </div>
            <Badge variant={admin.accountStatus === 'active' ? 'default' : 'secondary'}>
              {admin.accountStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Username</p>
              <p className="text-base">{admin.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{admin.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Display Name</p>
              <p className="text-base">{displayName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <Badge variant="outline">{admin.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}

      {/* Permissions Editor */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Configure Permissions</h2>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> After saving permission changes, the admin user must log out and log back in for the changes to take effect in their session.
          </AlertDescription>
        </Alert>
        <PermissionsEditor
          permissions={permissions}
          onChange={handlePermissionsChange}
          disabled={isLoading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/settings/admins')}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading || !hasChanges}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Changes
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
