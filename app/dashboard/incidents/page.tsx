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
import { IncidentEventService } from '@/services/incident-event-service';
import type { IncidentEventKind } from '@/models/incident-event-model';

export const dynamic = 'force-dynamic';

const KIND_LABELS: Record<IncidentEventKind, string> = {
  inventory_deduction_failed: 'Inventory deduction failed',
  stale_paid_order: 'Stale paid order',
};

const KIND_VARIANTS: Record<
  IncidentEventKind,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  inventory_deduction_failed: 'destructive',
  stale_paid_order: 'secondary',
};

function timeSince(when: Date): string {
  const ms = Date.now() - new Date(when).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/**
 * @requirement REQ-066 AC6 — Incidents queue
 *
 * Read-only list of IncidentEvent rows. Surfaces the silent failure
 * surfaces that REQ-066 moved off `console.error`. No actions in v1.
 */
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const kindFilter = (params.kind ?? 'all') as IncidentEventKind | 'all';

  const rows = await IncidentEventService.list({
    kind: kindFilter,
    limit: 200,
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Incidents</h1>
        <p className="text-muted-foreground">
          {rows.length} event{rows.length === 1 ? '' : 's'} — filter:{' '}
          <span className="font-medium">{kindFilter}</span>
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/dashboard/incidents?kind=all"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          All
        </Link>
        <Link
          href="/dashboard/incidents?kind=inventory_deduction_failed"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          Inventory deduction failed
        </Link>
        <Link
          href="/dashboard/incidents?kind=stale_paid_order"
          className="rounded-md border px-3 py-1 hover:bg-muted/50"
        >
          Stale paid orders
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No incidents matching this filter — good sign.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={String(r._id)}>
                    <TableCell>
                      <Badge variant={KIND_VARIANTS[r.kind]}>
                        {KIND_LABELS[r.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.entityId}
                    </TableCell>
                    <TableCell className="max-w-2xl text-sm">
                      {r.summary}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {timeSince(r.createdAt)}
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
