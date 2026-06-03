/**
 * @requirement REQ-066 — OrderService.scanStalePaidOrders
 *
 * AC5: visibility-only. Finds orders with `paymentStatus === 'paid' AND
 * status NOT IN ('completed', 'cancelled') AND createdAt > N hours`. For
 * each, writes an `IncidentEvent` tagged `stale_paid_order` (deduped via
 * IncidentEventService.dedupRecent to avoid logging the same order on
 * every scan cycle). NEVER mutates order state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFind = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    find: (...a: unknown[]) => mockFind(...a),
  },
}));

const mockRecordIncident = vi.fn();
const mockDedupRecent = vi.fn();
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    recordIncident: (...a: unknown[]) => mockRecordIncident(...a),
    dedupRecent: (...a: unknown[]) => mockDedupRecent(...a),
  },
}));

function chainable(returnValue: unknown) {
  return {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(returnValue),
  };
}

beforeEach(() => {
  mockFind.mockReset();
  mockRecordIncident.mockReset().mockResolvedValue({});
  mockDedupRecent.mockReset().mockResolvedValue(false);
});

describe('REQ-066 OrderService.scanStalePaidOrders', () => {
  it('AC5 — query: paid + non-completed + non-cancelled + createdAt older than threshold', async () => {
    let captured: Record<string, unknown> | undefined;
    mockFind.mockImplementation((q) => {
      captured = q;
      return chainable([]);
    });

    const { OrderService } = await import('@/services/order-service');
    await OrderService.scanStalePaidOrders({ thresholdHours: 2 });

    expect(captured?.paymentStatus).toBe('paid');
    const statusFilter = captured?.status as { $nin?: string[] };
    expect(statusFilter?.$nin).toEqual(
      expect.arrayContaining(['completed', 'cancelled'])
    );
    const createdAtFilter = captured?.createdAt as { $lt?: Date };
    expect(createdAtFilter?.$lt).toBeInstanceOf(Date);
  });

  it('AC5 — writes IncidentEvent tagged stale_paid_order for each fresh hit', async () => {
    const order = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      orderNumber: 'WG24010001',
      status: 'preparing',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    };
    mockFind.mockReturnValue(chainable([order]));

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.scanStalePaidOrders({
      thresholdHours: 2,
    });

    expect(mockRecordIncident).toHaveBeenCalledTimes(1);
    const arg = mockRecordIncident.mock.calls[0][0];
    expect(arg).toMatchObject({
      kind: 'stale_paid_order',
      entityId: '507f1f77bcf86cd799439011',
    });
    expect(arg.summary).toMatch(/paid/i);
    expect(result.flagged).toBe(1);
  });

  it('AC5 — dedup: skips an order that already has a recent stale_paid_order row', async () => {
    const order = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      orderNumber: 'WG24010002',
      status: 'preparing',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    };
    mockFind.mockReturnValue(chainable([order]));
    mockDedupRecent.mockResolvedValue(true);

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.scanStalePaidOrders({
      thresholdHours: 2,
    });

    expect(mockRecordIncident).not.toHaveBeenCalled();
    expect(result.flagged).toBe(0);
    expect(result.skippedAsDup).toBe(1);
  });
});
