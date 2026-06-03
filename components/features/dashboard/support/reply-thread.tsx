'use client';

import { useState, useTransition } from 'react';
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
  addSupportReplyAction,
  updateSupportStatusAction,
} from '@/app/actions/dashboard/support-actions';
import type { SupportTicketStatus } from '@/models/support-ticket-model';

interface ReplyThreadProps {
  ticketId: string;
  currentStatus: SupportTicketStatus;
}

const STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'awaiting_customer', label: 'Awaiting customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

/**
 * @requirement REQ-064 — Reply + status-change client surface.
 *
 * Two distinct operations on one card so the staff member can change
 * status and reply in one round-trip if they want, but each action
 * commits independently — a failed notification on a reply doesn't
 * block the status update.
 */
export function ReplyThread({ ticketId, currentStatus }: ReplyThreadProps) {
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<SupportTicketStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const handleReply = () => {
    if (!body.trim()) {
      toast({
        title: 'Empty reply',
        description: 'Type a reply before sending.',
        variant: 'destructive',
      });
      return;
    }
    startTransition(async () => {
      const result = await addSupportReplyAction(ticketId, body);
      if (result.success) {
        setBody('');
        toast({
          title: 'Reply sent',
          description:
            'Persisted; customer notified via their preferred channel.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send reply',
          variant: 'destructive',
        });
      }
    });
  };

  const handleStatus = (next: SupportTicketStatus) => {
    setStatus(next);
    startTransition(async () => {
      const result = await updateSupportStatusAction(ticketId, next);
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update status',
          variant: 'destructive',
        });
        setStatus(currentStatus);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <Select
          value={status}
          onValueChange={(v) => handleStatus(v as SupportTicketStatus)}
          disabled={isPending}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        placeholder="Type your reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[120px]"
        disabled={isPending}
      />

      <div className="flex justify-end">
        <Button onClick={handleReply} disabled={isPending || !body.trim()}>
          {isPending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </div>
  );
}
