'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateAdminRolesAction } from '@/app/actions/admin/admin-management-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StaffRole } from '@/interfaces/user.interface';
import { RoleCheckboxes } from './role-checkboxes';

interface EditRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  username: string;
  currentRoles: StaffRole[];
  canGrantPrivileged: boolean;
  onUpdated?: () => void;
}

/**
 * REQ-119 (AC3, AC5) — edit the roles of an existing staff member. The
 * server action enforces the rules; this dialog only mirrors them.
 */
export function EditRolesDialog({
  open,
  onOpenChange,
  adminId,
  username,
  currentRoles,
  canGrantPrivileged,
  onUpdated,
}: EditRolesDialogProps) {
  const [roles, setRoles] = useState<StaffRole[]>(currentRoles);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const save = async () => {
    if (roles.length === 0) {
      setError('Select at least one role.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await updateAdminRolesAction({ adminId, roles });
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success('Roles updated');
      onOpenChange(false);
      onUpdated?.();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit roles: {username}</DialogTitle>
          <DialogDescription>
            Access is the combination of every role ticked. A change takes
            effect at the member&apos;s next sign-in (up to 7 days); suspend the
            account to cut access immediately.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <RoleCheckboxes
          value={roles}
          onChange={setRoles}
          canGrantPrivileged={canGrantPrivileged}
          disabled={isLoading}
          idPrefix={`edit-role-${adminId}`}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save roles'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
