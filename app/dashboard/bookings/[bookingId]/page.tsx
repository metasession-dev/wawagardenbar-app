import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookingService } from '@/services/booking-service';
import { BookingControls } from '@/components/features/bookings/booking-controls';
import { BookingStatusBadge } from '@/components/features/bookings/booking-status-badge';
import { AcknowledgeOnOpen } from '@/components/features/admin/acknowledge-on-open';
import {
  formatTime12,
  formatWhen,
  guestsText,
} from '@/services/booking-notifier';
import { resolveMode } from '@/services/order-status-notifier';
import { UserModel } from '@/models';
import { connectDB } from '@/lib/mongodb';
import { BOOKING_ROLES } from '@/lib/dashboard-section-roles';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-BOOK-003 — Booking detail for staff (REQ-129, AC4)
 */
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await BookingService.getBookingById(bookingId);
  if (!booking) notFound();

  const replyMode = await resolveMode(booking.userId);

  await connectDB();
  const staffUsers = await UserModel.find({
    $or: [
      { role: { $in: [...BOOKING_ROLES] } },
      { roles: { $in: [...BOOKING_ROLES] } },
    ],
  })
    .select('firstName name email')
    .lean<
      { _id: unknown; firstName?: string; name?: string; email?: string }[]
    >();
  const staff = staffUsers.map((u) => ({
    id: String(u._id),
    label: u.firstName || u.name || u.email || String(u._id),
  }));
  const label = new Map(staff.map((s) => [s.id, s.label]));

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
      {/* REQ-122 — opening the booking acknowledges its staff alert */}
      <AcknowledgeOnOpen refId={bookingId} />
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/bookings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Bookings
        </Link>
      </Button>

      <Card data-testid="booking-detail">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-mono">{booking.bookingNumber}</CardTitle>
            <div className="flex gap-2">
              {booking.outsideBusinessHours && (
                <Badge variant="secondary" data-testid="outside-hours-flag">
                  Outside business hours
                </Badge>
              )}
              <BookingStatusBadge status={booking.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="capitalize">
            <span className="font-medium">Type:</span> {booking.type}
          </p>
          <p>
            <span className="font-medium">Name:</span> {booking.name}
          </p>
          <p>
            <span className="font-medium">Phone:</span> {booking.phone}
          </p>
          <p>
            <span className="font-medium">When:</span>{' '}
            {formatWhen(booking.date, booking.startTime)}
            {booking.endTime ? ` to ${formatTime12(booking.endTime)}` : ''}
          </p>
          <p>
            <span className="font-medium">Guests:</span>{' '}
            {guestsText(booking.guests)}
          </p>
          {booking.purpose && (
            <p>
              <span className="font-medium">Purpose:</span> {booking.purpose}
            </p>
          )}
          {booking.type === 'event' && booking.wantsDj !== null && (
            <p>
              <span className="font-medium">DJ:</span>{' '}
              {booking.wantsDj ? 'Yes' : 'No'}
            </p>
          )}
          {booking.requests && (
            <p className="sm:col-span-2">
              <span className="font-medium">Requests:</span> {booking.requests}
            </p>
          )}
          <p>
            <span className="font-medium">Assignee:</span>{' '}
            {booking.assignedTo
              ? (label.get(booking.assignedTo) ?? 'Unknown')
              : 'Unassigned'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Handle this request</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingControls
            bookingId={String(booking._id)}
            status={booking.status}
            assignedTo={booking.assignedTo}
            staff={staff}
            replyMode={replyMode}
          />
        </CardContent>
      </Card>

      {booking.internalNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
          </CardHeader>
          <CardContent
            className="space-y-2 text-sm"
            data-testid="booking-notes"
          >
            {booking.internalNotes.map((n) => (
              <p
                key={String(n._id ?? n.createdAt)}
                className="rounded border p-3"
              >
                {n.body}
                <span className="block text-xs text-muted-foreground">
                  {label.get(n.authorUserId) ?? 'Staff'} ·{' '}
                  {new Date(n.createdAt).toLocaleString('en-NG')}
                </span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {booking.replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Replies</CardTitle>
          </CardHeader>
          <CardContent
            className="space-y-2 text-sm"
            data-testid="booking-replies"
          >
            {booking.replies.map((r) => (
              <p
                key={String(r._id ?? r.createdAt)}
                className="rounded border p-3"
              >
                <span className="block text-xs font-medium capitalize">
                  {r.authorRole}
                </span>
                {r.body}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
