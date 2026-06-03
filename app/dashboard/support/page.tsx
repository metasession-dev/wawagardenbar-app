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
import { SupportTicketService } from '@/services/support-ticket-service';
import type {
  SupportTicketStatus,
  SupportTicketSource,
} from '@/models/support-ticket-model';

export const dynamic = 'force-dynamic';

const STATUS_VARIANTS: Record<
  SupportTicketStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  open: 'destructive',
  in_progress: 'default',
  awaiting_customer: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  awaiting_customer: 'Awaiting customer',
  resolved: 'Resolved',
  closed: 'Closed',
};

const SOURCE_LABELS: Record<SupportTicketSource, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
};

function timeSince(when: Date): string {
  const ms = Date.now() - new Date(when).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * @requirement REQ-064 — Support queue staff UI
 *
 * Default view: not-closed tickets, newest first. A future REQ can layer
 * filter chips on top — this page intentionally ships with the minimum
 * staff need to find work.
 */
export default async function SupportQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = (params.status ?? 'open') as SupportTicketStatus | 'all';
  const sourceFilter = (params.source ?? 'all') as SupportTicketSource | 'all';

  const { tickets, total } = await SupportTicketService.listTickets({
    status: statusFilter,
    source: sourceFilter,
    limit: 100,
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Queue</h1>
        <p className="text-muted-foreground">
          {total} ticket{total === 1 ? '' : 's'} — filter:{' '}
          <span className="font-medium">{statusFilter}</span> /{' '}
          <span className="font-medium">{sourceFilter}</span>
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/dashboard/support?status=open"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          Open
        </Link>
        <Link
          href="/dashboard/support?status=in_progress"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          In progress
        </Link>
        <Link
          href="/dashboard/support?status=awaiting_customer"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          Awaiting customer
        </Link>
        <Link
          href="/dashboard/support?status=all"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          All
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No tickets matching this filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={String(t._id)}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/dashboard/support/${String(t._id)}`}
                        className="hover:underline"
                      >
                        {t.ticketNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{SOURCE_LABELS[t.source]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{t.category}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {t.subject}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.customerEmail || t.customerPhone || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[t.status]}>
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeSince(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
