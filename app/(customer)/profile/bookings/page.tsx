import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { sessionOptions, SessionData } from '@/lib/session';
import { BookingService } from '@/services/booking-service';
import { BookingStatusBadge } from '@/components/features/bookings/booking-status-badge';
import { formatWhen, guestsText } from '@/services/booking-notifier';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-BOOK-004 — My bookings (REQ-129, AC6)
 *
 * Read-only. The query is scoped to the signed-in customer, so no other
 * customer's booking can appear.
 */
export default async function MyBookingsPage() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.userId || !session.isLoggedIn) {
    redirect('/login?redirect=/profile/bookings');
  }

  const bookings = await BookingService.listForCustomer(session.userId);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My bookings</h1>
          <p className="text-muted-foreground">
            Your table and event requests and where they stand.
          </p>
        </div>
        <Button asChild>
          <Link href="/book">New request</Link>
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent
            className="py-8 text-center text-muted-foreground"
            data-testid="my-bookings-empty"
          >
            You have no booking requests yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3" data-testid="my-bookings-list">
          {bookings.map((b) => (
            <li key={String(b._id)}>
              <Link
                href={`/profile/bookings/${String(b._id)}`}
                data-testid="my-booking-row"
                className="block rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{b.bookingNumber}</span>
                  <BookingStatusBadge status={b.status} />
                </div>
                <p className="mt-1 font-medium capitalize">
                  {b.type} for {guestsText(b.guests)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatWhen(b.date, b.startTime)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="ghost" size="sm">
        <Link href="/profile">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to profile
        </Link>
      </Button>
    </div>
  );
}
