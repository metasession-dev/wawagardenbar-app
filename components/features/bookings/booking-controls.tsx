'use client';

/**
 * @requirement REQ-BOOK-003 — Staff controls on a booking (REQ-129, AC4)
 *
 * Status, assignee, internal note and reply. Each action commits on its own
 * and the server re-checks the role, so a failed reply never blocks a status
 * change. Confirm and Decline tell the customer (`booking_update`).
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  addBookingNoteAction,
  assignBookingAction,
  replyToBookingAction,
  setBookingStatusAction,
} from '@/app/actions/booking/booking-actions';
import {
  BOOKING_STATUSES,
  type BookingStatus,
} from '@/interfaces/booking.interface';
import { BOOKING_STATUS_LABELS } from '@/lib/booking-validation';
import { REPLY_MODE_LABEL, type ReplyMode } from '@/lib/support-reply-mode';

interface Props {
  bookingId: string;
  status: BookingStatus;
  assignedTo: string | null;
  staff: { id: string; label: string }[];
  replyMode: ReplyMode;
}

const UNASSIGNED = '__none__';

export function BookingControls({
  bookingId,
  status,
  assignedTo,
  staff,
  replyMode,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    okTitle: string,
    after?: () => void
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast({ title: okTitle });
        after?.();
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'Something went wrong.',
          variant: 'destructive',
        });
      }
    });
  }

  const setStatus = (next: string, title: string) =>
    run(() => setBookingStatusAction({ id: bookingId, status: next }), title);

  return (
    <div className="space-y-6" data-testid="booking-controls">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          data-testid="booking-confirm"
          disabled={isPending || status === 'confirmed'}
          onClick={() => setStatus('confirmed', 'Booking confirmed')}
        >
          Confirm
        </Button>
        <Button
          variant="outline"
          data-testid="booking-decline"
          disabled={isPending || status === 'declined'}
          onClick={() => setStatus('declined', 'Booking declined')}
        >
          Decline
        </Button>
        <span className="text-sm font-medium ml-2">Status:</span>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v, 'Status updated')}
          disabled={isPending}
        >
          <SelectTrigger className="w-44" data-testid="booking-status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOOKING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Confirm and Decline send the customer a WhatsApp update.
      </p>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Assignee:</span>
        <Select
          value={assignedTo ?? UNASSIGNED}
          onValueChange={(v) =>
            run(
              () =>
                assignBookingAction({
                  id: bookingId,
                  assigneeId: v === UNASSIGNED ? null : v,
                }),
              'Assignee updated'
            )
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-56" data-testid="booking-assignee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Internal note</h3>
        <Textarea
          placeholder="Only staff see this…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-testid="booking-note-input"
          disabled={isPending}
        />
        <div className="flex justify-end">
          <Button
            variant="outline"
            data-testid="booking-note-save"
            disabled={isPending || !note.trim()}
            onClick={() =>
              run(
                () => addBookingNoteAction({ id: bookingId, body: note }),
                'Note saved',
                () => setNote('')
              )
            }
          >
            Add note
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Reply to customer</h3>
        <p
          className="text-xs text-muted-foreground"
          data-testid="reply-mode"
          data-mode={replyMode}
        >
          {REPLY_MODE_LABEL[replyMode]}
        </p>
        <Textarea
          placeholder="Type your reply…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="min-h-[100px]"
          data-testid="booking-reply-input"
          disabled={isPending}
        />
        <div className="flex justify-end">
          <Button
            data-testid="booking-reply-send"
            disabled={isPending || !reply.trim()}
            onClick={() =>
              run(
                () => replyToBookingAction({ id: bookingId, body: reply }),
                'Reply sent',
                () => setReply('')
              )
            }
          >
            {isPending ? 'Sending…' : 'Send reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
