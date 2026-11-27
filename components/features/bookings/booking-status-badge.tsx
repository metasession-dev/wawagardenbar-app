import { Badge } from '@/components/ui/badge';
import { BOOKING_STATUS_LABELS } from '@/lib/booking-validation';
import type { BookingStatus } from '@/interfaces/booking.interface';

const VARIANTS: Record<
  BookingStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  new: 'destructive',
  contacted: 'secondary',
  confirmed: 'default',
  declined: 'outline',
  completed: 'outline',
  cancelled: 'outline',
};

/** @requirement REQ-BOOK-003 / REQ-BOOK-004 — one status look for staff and customer. */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={VARIANTS[status]} data-testid="booking-status">
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
