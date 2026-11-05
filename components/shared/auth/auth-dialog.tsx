'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginForm } from './login-form';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

/**
 * REQ-117 — the customer sign-in dialog. WhatsApp PIN only; there is no guest
 * tab any more.
 */
export function AuthDialog({
  open,
  onOpenChange,
  redirectTo,
}: AuthDialogProps) {
  function handleSuccess() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Wawa Garden Bar</DialogTitle>
          <DialogDescription>
            Enter your phone number to sign in with a WhatsApp PIN
          </DialogDescription>
        </DialogHeader>
        <LoginForm redirectTo={redirectTo} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
