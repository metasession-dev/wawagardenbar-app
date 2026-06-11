import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IncidentEventService } from '@/services/incident-event-service';
import type { IncidentEventKind } from '@/models/incident-event-model';
import { IncidentRow } from '@/components/features/admin/incident-row';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-066 AC6 — Incidents queue
 * @requirement REQ-066 AC10 — per-row "Retry now" action for stuck
 *   `inventory_deduction_failed` events; row flips to ✓ Deducted once
 *   the underlying order's `inventoryDeducted` flag has been set.
 * @requirement REQ-077 — Expandable incidents (REQ-INV-014/015/016/017)
 *   each row is wrapped in `<IncidentRow>` so admins can expand inline
 *   to see `errorDetails`, linked Order snapshot, and (for
 *   stale_paid_order) the status-history trail. The server fetch
 *   migrates from `list()` + inline `OrderModel.find` join to the new
 *   `listWithLinkedOrders()` which projects the snapshot fields in one
 *   query.
 */
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const kindFilter = (params.kind ?? 'all') as IncidentEventKind | 'all';

  const rows = await IncidentEventService.listWithLinkedOrders({
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
                  <TableHead className="w-8" aria-label="Expand"></TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <IncidentRow
                    key={String(r._id)}
                    incident={r}
                    linkedOrder={r.linkedOrder}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
