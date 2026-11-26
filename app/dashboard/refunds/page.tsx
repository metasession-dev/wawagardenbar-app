/**
 * @requirement REQ-FIN-010 — Refunds report (REQ-128, AC6)
 * Manager, admin and super-admin. Lives outside `/dashboard/finance`, whose
 * layout is gated by the expenses permission that managers do not hold.
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, hasAnyRole } from '@/lib/session';
import { REFUND_ROLES } from '@/lib/refund-roles';
import { getRefundReport } from '@/services/refund-report-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Refunds | Wawa Garden Bar',
  description: 'Refund totals by type and approver',
};

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;

function parseDate(value: string | undefined, fallback: Date): Date {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : fallback;
}

export default async function RefundsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.isLoggedIn) redirect('/login');
  if (!hasAnyRole(session, [...REFUND_ROLES])) redirect('/dashboard');

  const sp = await searchParams;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const from = parseDate(sp.from, weekAgo);
  const to = parseDate(sp.to, now);
  if (sp.to) to.setHours(23, 59, 59, 999);

  const report = await getRefundReport(from, to);

  return (
    <div className="space-y-6" data-testid="refunds-report">
      <div>
        <h1 className="text-2xl font-bold">Refunds</h1>
        <form className="mt-3 flex flex-wrap items-end gap-3" method="get">
          <label className="text-sm">
            From
            <input
              type="date"
              name="from"
              defaultValue={from.toISOString().slice(0, 10)}
              className="ml-2 rounded border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            To
            <input
              type="date"
              name="to"
              defaultValue={to.toISOString().slice(0, 10)}
              className="ml-2 rounded border px-2 py-1"
            />
          </label>
          <button className="rounded border px-3 py-1 text-sm" type="submit">
            Apply
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Refunded (processed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="refunds-total">
              {naira(report.processedTotalKobo)}
            </div>
            <div className="text-xs text-muted-foreground">
              {report.processedCount} refunds
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {naira(report.byStatus.pending.totalKobo)}
            </div>
            <div className="text-xs text-muted-foreground">
              {report.byStatus.pending.count} waiting for Paystack
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {naira(report.byStatus.failed.totalKobo)}
            </div>
            <div className="text-xs text-muted-foreground">
              {report.byStatus.failed.count} need attention
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(['full', 'partial'] as const).map((t) => (
              <div
                key={t}
                className="flex justify-between"
                data-testid={`refunds-type-${t}`}
              >
                <span className="capitalize">{t}</span>
                <span>
                  {naira(report.byType[t].totalKobo)} ({report.byType[t].count})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By approver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {report.byApprover.length === 0 && (
              <div className="text-muted-foreground">No processed refunds.</div>
            )}
            {report.byApprover.map((a) => (
              <div
                key={a.approverId ?? 'auto'}
                className="flex justify-between"
                data-testid="refunds-approver"
              >
                <span>{a.approverName}</span>
                <span>
                  {naira(a.totalKobo)} ({a.count})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
