import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sessionOptions, SessionData } from '@/lib/session';
import { BookingService } from '@/services/booking-service';
import { BookingStatusBadge } from '@/components/features/bookings/booking-status-badge';
import {
  formatTime12,
  formatWhen,
  guestsText,
} from '@/services/booking-notifier';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-BOOK-004 — One booking, read-only (REQ-129, AC6)
 *
 * The target of the `booking_update` "View booking" button. The lookup is by
 * id and owner together, so another customer's id is "not found" and reveals
 * nothing about the booking.
 */
export default async function MyBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.userId || !session.isLoggedIn) {
    redirect(`/login?redirect=/profile/bookings/${bookingId}`);
  }

  const booking = await BookingService.getBookingForCustomer(
    bookingId,
    session.userId
  );
  if (!booking) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/profile/bookings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          My bookings
        </Link>
      </Button>

      <Card data-testid="my-booking-detail">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-mono">{booking.bookingNumber}</CardTitle>
            <BookingStatusBadge status={booking.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="capitalize">
            <span className="font-medium">Type:</span> {booking.type}
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
            <p>
              <span className="font-medium">Requests:</span> {booking.requests}
            </p>
          )}
        </CardContent>
      </Card>

      {booking.replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Messages from us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.replies
              .filter((r) => r.authorRole === 'staff')
              .map((r) => (
                <p
                  key={String(r._id ?? r.createdAt)}
                  className="rounded border p-3"
                >
                  {r.body}
                </p>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
