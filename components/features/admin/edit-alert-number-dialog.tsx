/**
 * @requirement REQ-122 - Admins set a staff member's alert number
 * @srs REQ-AUTHA-008
 *
 * Saves the number unverified. The member verifies it with a WhatsApp code on
 * their own account page, which is also when their consent is recorded.
 */
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { setStaffAlertPhoneAction } from '@/app/actions/staff-notifications/staff-notification-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditAlertNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string;
  username: string;
  currentPhone?: string;
  onUpdated?: () => void;
}

export function EditAlertNumberDialog({
  open,
  onOpenChange,
  adminId,
  username,
  currentPhone,
  onUpdated,
}: EditAlertNumberDialogProps) {
  const [phone, setPhone] = useState(currentPhone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const save = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await setStaffAlertPhoneAction(adminId, phone.trim());
      if (!res.success) {
        setError(res.message ?? 'Could not save the number.');
        return;
      }
      toast.success(res.message ?? 'Alert number saved');
      onOpenChange(false);
      onUpdated?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WhatsApp alert number</DialogTitle>
          <DialogDescription>
            For {username}. The number is saved unverified; {username} confirms
            it with a WhatsApp code on their account page before any alert is
            sent.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-alert-phone">WhatsApp number</Label>
          <Input
            id="edit-alert-phone"
            type="tel"
            placeholder="e.g. 0801 234 5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={isLoading || phone.trim().length < 10}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
