'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileX, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { writeOffTabAction } from '@/app/actions/tabs/tab-actions';

interface WriteOffTabDialogProps {
  tabId: string;
  tabNumber: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'written-off';
}

/**
 * REQ-098 — write off a dormant/uncollectible tab as bad debt. Additive
 * alongside `DeleteTabDialog` — not a replacement. A reason is required
 * (enforced both here and server-side in `writeOffTabAction`).
 */
export function WriteOffTabDialog({
  tabId,
  tabNumber,
  paymentStatus,
}: WriteOffTabDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const router = useRouter();

  const alreadyWrittenOff = paymentStatus === 'written-off';
  const confirmDisabled = isSubmitting || !reason.trim();

  async function handleWriteOff() {
    setIsSubmitting(true);

    try {
      const result = await writeOffTabAction(tabId, { reason });

      if (result.success) {
        toast({
          title: 'Tab written off',
          description: 'The tab has been written off as bad debt.',
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to write off tab',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (alreadyWrittenOff) {
    return (
      <Button variant="outline" disabled>
        <FileX className="mr-2 h-4 w-4" />
        Already Written Off
      </Button>
    );
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason('');
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <FileX className="mr-2 h-4 w-4" />
          Write Off
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Write Off Tab {tabNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This reclassifies the tab and all its linked orders as uncollectible
            bad debt (&quot;written-off&quot;). It is excluded from recognized
            revenue on financial reports, but the records are never deleted —
            this is a separate, additive action from Delete.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Alert>
          <AlertDescription>
            A reason is required and is permanently recorded in the audit log
            along with your identity and the write-off amount.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="write-off-reason">Reason</Label>
          <Textarea
            id="write-off-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Dormant since 2026-01-15, customer unreachable, uncollectible."
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleWriteOff();
            }}
            disabled={confirmDisabled}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Write Off Tab
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
