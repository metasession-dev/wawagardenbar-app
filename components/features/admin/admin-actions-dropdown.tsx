'use client';

import { useState } from 'react';
import {
  resetAdminPasswordAction,
  updateAdminStatusAction,
  deleteAdminAction,
} from '@/app/actions/admin/admin-management-actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Key, UserX, UserCheck, Trash2, Copy, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AdminActionsDropdownProps {
  admin: any;
  onUpdate: () => void;
}

export function AdminActionsDropdown({
  admin,
  onUpdate,
}: AdminActionsDropdownProps) {
  const router = useRouter();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    try {
      setIsLoading(true);
      const result = await resetAdminPasswordAction(admin._id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setTempPassword(result.tempPassword!);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setIsLoading(true);
      const newStatus =
        admin.accountStatus === 'active' ? 'suspended' : 'active';

      const result = await updateAdminStatusAction({
        adminId: admin._id,
        status: newStatus,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update admin status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const result = await deleteAdminAction(admin._id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success('Admin deleted successfully');
      setShowDeleteDialog(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete admin');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {admin.role === 'admin' && (
            <DropdownMenuItem
              onClick={() => router.push(`/dashboard/settings/admins/${admin._id}/permissions`)}
            >
              <Shield className="mr-2 h-4 w-4" />
              Manage Permissions
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleToggleStatus}>
            {admin.accountStatus === 'active' ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Suspend Account
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate Account
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Admin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Admin Password</AlertDialogTitle>
            <AlertDialogDescription>
              {tempPassword ? (
                <div className="space-y-4">
                  <p>
                    Password has been reset successfully. Please share this
                    temporary password with the admin:
                  </p>
                  <div className="bg-muted p-4 rounded-md flex items-center justify-between">
                    <code className="text-lg font-mono font-bold">
                      {tempPassword}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(tempPassword)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The admin will be required to change this password on their
                    next login.
                  </p>
                </div>
              ) : (
                'This will generate a new temporary password for the admin. They will be required to change it on their next login.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {tempPassword ? (
              <AlertDialogAction
                onClick={() => {
                  setTempPassword(null);
                  setShowResetDialog(false);
                }}
              >
                Done
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{admin.username}</strong>?
              This action cannot be undone. The admin will no longer be able to
              access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
