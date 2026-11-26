import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SupportTicketService } from '@/services/support-ticket-service';
import { ReplyThread } from '@/components/features/dashboard/support/reply-thread';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData, hasAnyRole } from '@/lib/session';
import { REFUND_ROLES } from '@/lib/refund-roles';
import { RefundRequestPanel } from '@/components/features/dashboard/support/refund-request-panel';
import { OrderModel } from '@/models';
import { AcknowledgeOnOpen } from '@/components/features/admin/acknowledge-on-open';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-064 — Ticket detail surface for staff.
 */
export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ticket = await SupportTicketService.getTicketById(ticketId);
  if (!ticket) notFound();

  // REQ-118 (AC2) — the same server-side rule the reply uses decides the mode
  // shown in the reply box.
  const { mode: replyMode } = await SupportTicketService.getReplyMode(ticket);
  const firstName = (
    await SupportTicketService.customerFirstNames([ticket])
  ).get(String(ticket.userId));

  // REQ-128 — a refund request: manager, admin and super-admin decide it.
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  const canDecideRefund = hasAnyRole(session, [...REFUND_ROLES]);
  const refundRequest =
    ticket.category === 'refund' ? (ticket.refundRequest ?? null) : null;
  let refundOrderTotal = 0;
  if (refundRequest?.status === 'pending' && ticket.orderId) {
    const order = await OrderModel.findById(ticket.orderId)
      .select('total')
      .lean<{ total: number } | null>();
    refundOrderTotal = order?.total ?? 0;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
      {/* REQ-122 — opening the ticket acknowledges its staff alert */}
      <AcknowledgeOnOpen refId={ticketId} />
      <div className="flex items-center justify-between">
        <Link href="/dashboard/support">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to queue
          </Button>
        </Link>
        <div className="text-xs text-muted-foreground font-mono">
          {ticket.ticketNumber}
        </div>
      </div>

      {refundRequest?.status === 'pending' && canDecideRefund && (
        <RefundRequestPanel
          ticketId={ticketId}
          orderTotalNaira={refundOrderTotal}
        />
      )}
      {refundRequest?.status === 'pending' && !canDecideRefund && (
        <div className="rounded-md border p-3 text-sm text-muted-foreground">
          This refund request is waiting for a manager, admin or super-admin.
        </div>
      )}
      {refundRequest && refundRequest.status !== 'pending' && (
        <div className="rounded-md border p-3 text-sm">
          Refund request {refundRequest.status}
          {refundRequest.rejectionReason
            ? `: ${refundRequest.rejectionReason}`
            : ''}
          .
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">
                {ticket.source === 'whatsapp' ? 'WhatsApp' : 'Web'}
              </Badge>
              <Badge variant="secondary">{ticket.category}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <strong>From:</strong> {firstName ? `${firstName} · ` : ''}
            {ticket.customerEmail || ticket.customerPhone || '—'}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap text-sm">
            {ticket.message}
          </div>
          {ticket.orderId && (
            <div className="text-xs">
              <strong>Related order:</strong>{' '}
              <Link
                href={`/dashboard/orders/${ticket.orderId}`}
                className="text-primary hover:underline"
              >
                {ticket.orderId}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {ticket.replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Conversation (oldest first, {ticket.replies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticket.replies.map((r, idx) => (
              <div
                key={idx}
                className={`rounded-md border p-3 text-sm ${
                  r.authorRole === 'staff'
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide">
                    {r.authorRole}
                  </span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="whitespace-pre-wrap">{r.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reply</CardTitle>
        </CardHeader>
        <CardContent>
          <ReplyThread
            ticketId={String(ticket._id)}
            currentStatus={ticket.status}
            replyMode={replyMode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
