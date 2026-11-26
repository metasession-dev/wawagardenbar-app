/**
 * @requirement REQ-FIN-010 — Refunds report (REQ-128, AC6)
 *
 * Totals, by type, by status and by approver for a date range, computed from
 * the `Refund` ledger. Only processed refunds count as money returned;
 * pending and failed rows are shown separately.
 */
import { connectDB } from '@/lib/mongodb';
import RefundModel from '@/models/refund-model';
import UserModel from '@/models/user-model';
import type { RefundStatus, RefundType } from '@/interfaces/refund.interface';

export interface RefundReport {
  from: Date;
  to: Date;
  processedTotalKobo: number;
  processedCount: number;
  byType: Record<RefundType, { count: number; totalKobo: number }>;
  byStatus: Record<RefundStatus, { count: number; totalKobo: number }>;
  byApprover: Array<{
    approverId: string | null;
    approverName: string;
    count: number;
    totalKobo: number;
  }>;
}

export async function getRefundReport(
  from: Date,
  to: Date
): Promise<RefundReport> {
  await connectDB();
  const range = { createdAt: { $gte: from, $lte: to } };

  const [byTypeRows, byStatusRows, byApproverRows] = await Promise.all([
    RefundModel.aggregate<{ _id: RefundType; count: number; total: number }>([
      { $match: { ...range, status: 'processed' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$amountKobo' },
        },
      },
    ]),
    RefundModel.aggregate<{ _id: RefundStatus; count: number; total: number }>([
      { $match: range },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amountKobo' },
        },
      },
    ]),
    RefundModel.aggregate<{ _id: unknown; count: number; total: number }>([
      { $match: { ...range, status: 'processed' } },
      {
        $group: {
          _id: '$approvedBy',
          count: { $sum: 1 },
          total: { $sum: '$amountKobo' },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  const byType: RefundReport['byType'] = {
    full: { count: 0, totalKobo: 0 },
    partial: { count: 0, totalKobo: 0 },
  };
  for (const r of byTypeRows)
    byType[r._id] = { count: r.count, totalKobo: r.total };

  const byStatus: RefundReport['byStatus'] = {
    pending: { count: 0, totalKobo: 0 },
    processed: { count: 0, totalKobo: 0 },
    failed: { count: 0, totalKobo: 0 },
  };
  for (const r of byStatusRows)
    byStatus[r._id] = { count: r.count, totalKobo: r.total };

  const ids = byApproverRows.map((r) => r._id).filter(Boolean);
  const users = ids.length
    ? await UserModel.find({ _id: { $in: ids } })
        .select('name firstName lastName email')
        .lean<
          Array<{
            _id: { toString(): string };
            name?: string;
            firstName?: string;
            lastName?: string;
            email?: string;
          }>
        >()
    : [];
  const nameOf = new Map(
    users.map((u) => [
      u._id.toString(),
      u.name ||
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        u.email ||
        'Staff',
    ])
  );

  return {
    from,
    to,
    processedTotalKobo: byStatus.processed.totalKobo,
    processedCount: byStatus.processed.count,
    byType,
    byStatus,
    byApprover: byApproverRows.map((r) => {
      const id = r._id ? String(r._id) : null;
      return {
        approverId: id,
        approverName: id
          ? (nameOf.get(id) ?? 'Staff')
          : 'Automatic (customer cancel)',
        count: r.count,
        totalKobo: r.total,
      };
    }),
  };
}
