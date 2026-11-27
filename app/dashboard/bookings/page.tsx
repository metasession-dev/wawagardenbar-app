import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookingService } from '@/services/booking-service';
import { BookingStatusBadge } from '@/components/features/bookings/booking-status-badge';
import { formatWhen, guestsText } from '@/services/booking-notifier';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  type BookingStatus,
  type BookingType,
} from '@/interfaces/booking.interface';
import { BOOKING_STATUS_LABELS } from '@/lib/booking-validation';
import { UserModel } from '@/models';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

interface SearchParams {
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  view?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function href(current: SearchParams, patch: Partial<SearchParams>): string {
  const merged: Record<string, string | undefined> = { ...current, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) qs.set(k, v);
  }
  const text = qs.toString();
  return `/dashboard/bookings${text ? `?${text}` : ''}`;
}

/**
 * @requirement REQ-BOOK-003 — Bookings list and calendar (REQ-129, AC4)
 *
 * Filters: type, status, date range. Sorted by date. The calendar view groups
 * the same rows by day so staff can spot clashes. Events outside business
 * hours carry a badge.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = (BOOKING_TYPES as readonly string[]).includes(params.type ?? '')
    ? (params.type as BookingType)
    : 'all';
  const status = (BOOKING_STATUSES as readonly string[]).includes(
    params.status ?? ''
  )
    ? (params.status as BookingStatus)
    : 'all';
  const from = DATE_RE.test(params.from ?? '') ? params.from : undefined;
  const to = DATE_RE.test(params.to ?? '') ? params.to : undefined;
  const calendar = params.view === 'calendar';

  const bookings = await BookingService.listBookings({
    type,
    status,
    from,
    to,
  });

  await connectDB();
  const assigneeIds = Array.from(
    new Set(bookings.map((b) => b.assignedTo).filter(Boolean))
  ) as string[];
  const assignees = assigneeIds.length
    ? await UserModel.find({ _id: { $in: assigneeIds } })
        .select('firstName name email')
        .lean<
          { _id: unknown; firstName?: string; name?: string; email?: string }[]
        >()
    : [];
  const assigneeName = new Map(
    assignees.map((u) => [
      String(u._id),
      u.firstName || u.name || u.email || '—',
    ])
  );

  const byDate = new Map<string, typeof bookings>();
  for (const b of bookings) {
    byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bookings</h1>
        <p className="text-muted-foreground">
          {bookings.length} request{bookings.length === 1 ? '' : 's'} — table
          and event enquiries, soonest first.
        </p>
      </div>

      <form
        method="get"
        action="/dashboard/bookings"
        className="flex flex-wrap items-end gap-3 text-sm"
        data-testid="bookings-filters"
      >
        <input type="hidden" name="view" value={calendar ? 'calendar' : ''} />
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Type</span>
          <select
            name="type"
            defaultValue={type}
            className="rounded-md border bg-background px-2 py-1"
            data-testid="filter-type"
          >
            <option value="all">All</option>
            <option value="table">Table</option>
            <option value="event">Event</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border bg-background px-2 py-1"
            data-testid="filter-status"
          >
            <option value="all">All</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border bg-background px-2 py-1"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border bg-background px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          Apply
        </button>
        <div className="ml-auto flex gap-2">
          <Link
            href={href(params, { view: undefined })}
            className={`rounded-md border px-3 py-1 ${calendar ? '' : 'bg-muted'}`}
            data-testid="view-list"
          >
            List
          </Link>
          <Link
            href={href(params, { view: 'calendar' })}
            className={`rounded-md border px-3 py-1 ${calendar ? 'bg-muted' : ''}`}
            data-testid="view-calendar"
          >
            Calendar
          </Link>
        </div>
      </form>

      {bookings.length === 0 ? (
        <Card>
          <CardContent
            className="py-8 text-center text-sm text-muted-foreground"
            data-testid="bookings-empty"
          >
            No bookings match this filter.
          </CardContent>
        </Card>
      ) : calendar ? (
        <div className="space-y-4" data-testid="bookings-calendar">
          {Array.from(byDate.entries()).map(([date, rows]) => (
            <Card key={date} data-testid="calendar-day" data-date={date}>
              <CardHeader>
                <CardTitle className="text-base">
                  {formatWhen(date, '00:00').split(' at ')[0]}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({rows.length} request{rows.length === 1 ? '' : 's'}
                    {rows.length > 1 ? ' — check for clashes' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.map((b) => (
                  <Link
                    key={String(b._id)}
                    href={`/dashboard/bookings/${String(b._id)}`}
                    data-testid="booking-row"
                    className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-mono text-xs">{b.bookingNumber}</span>
                    <span className="capitalize">{b.type}</span>
                    <span>
                      {formatWhen(b.date, b.startTime).split(' at ')[1]}
                    </span>
                    <span>{b.name}</span>
                    <span className="text-muted-foreground">
                      {guestsText(b.guests)}
                    </span>
                    <BookingStatusBadge status={b.status} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table data-testid="bookings-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date and time</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow
                    key={String(b._id)}
                    data-testid="booking-row"
                    data-status={b.status}
                  >
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/dashboard/bookings/${String(b._id)}`}
                        className="hover:underline"
                      >
                        {b.bookingNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">
                      {b.type}
                      {b.outsideBusinessHours && (
                        <Badge variant="secondary" className="ml-2">
                          Outside hours
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{b.name}</TableCell>
                    <TableCell className="text-sm">
                      {formatWhen(b.date, b.startTime)}
                    </TableCell>
                    <TableCell>{b.guests}</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.assignedTo
                        ? (assigneeName.get(b.assignedTo) ?? '—')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
