/**
 * @requirement REQ-FIN-010 (REQ-128 AC6) — refunds report totals
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const aggregate = vi.hoisted(() => vi.fn());
const userFind = vi.hoisted(() => vi.fn());
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/refund-model', () => ({ default: { aggregate } }));
vi.mock('@/models/user-model', () => ({ default: { find: userFind } }));

import { getRefundReport } from '@/services/refund-report-service';

beforeEach(() => {
  vi.clearAllMocks();
  // byType, byStatus, byApprover (same order as the service)
  aggregate
    .mockResolvedValueOnce([
      { _id: 'full', count: 1, total: 500000 },
      { _id: 'partial', count: 2, total: 300000 },
    ])
    .mockResolvedValueOnce([
      { _id: 'processed', count: 3, total: 800000 },
      { _id: 'pending', count: 1, total: 100000 },
      { _id: 'failed', count: 1, total: 50000 },
    ])
    .mockResolvedValueOnce([
      { _id: 'm1', count: 2, total: 600000 },
      { _id: null, count: 1, total: 200000 },
    ]);
  userFind.mockReturnValue({
    select: () => ({
      lean: async () => [
        { _id: { toString: () => 'm1' }, name: 'Ada Manager' },
      ],
    }),
  });
});

describe('[AC6] getRefundReport', () => {
  it('totals, by type, by status and by approver add up', async () => {
    const r = await getRefundReport(
      new Date('2026-11-01'),
      new Date('2026-11-30')
    );
    expect(r.processedTotalKobo).toBe(800000);
    expect(r.processedCount).toBe(3);
    expect(r.byType.full).toEqual({ count: 1, totalKobo: 500000 });
    expect(r.byType.partial).toEqual({ count: 2, totalKobo: 300000 });
    expect(r.byType.full.totalKobo + r.byType.partial.totalKobo).toBe(
      r.processedTotalKobo
    );
    expect(r.byStatus.pending.totalKobo).toBe(100000);
    expect(r.byStatus.failed.count).toBe(1);
    expect(r.byApprover.map((a) => a.approverName)).toEqual([
      'Ada Manager',
      'Automatic (customer cancel)',
    ]);
    expect(r.byApprover.reduce((s, a) => s + a.totalKobo, 0)).toBe(
      r.processedTotalKobo
    );
  });

  it('only processed refunds count as money returned', async () => {
    await getRefundReport(new Date('2026-11-01'), new Date('2026-11-30'));
    expect(aggregate.mock.calls[0][0][0].$match.status).toBe('processed');
    expect(aggregate.mock.calls[2][0][0].$match.status).toBe('processed');
  });
});
