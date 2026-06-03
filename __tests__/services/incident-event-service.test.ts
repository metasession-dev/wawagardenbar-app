/**
 * @requirement REQ-066 — IncidentEventService
 *
 * AC3: recordIncident persists; list filters by kind; dedupRecent skips
 * a write when a same-kind/same-entityId row exists within the window.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockCreate = vi.fn();
const mockFind = vi.fn();
const mockFindOne = vi.fn();

vi.mock('@/models/incident-event-model', () => ({
  default: {
    create: (...a: unknown[]) => mockCreate(...a),
    find: (...a: unknown[]) => mockFind(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
  },
}));

beforeEach(() => {
  mockCreate.mockReset();
  mockFind.mockReset();
  mockFindOne.mockReset();
});

describe('REQ-066 IncidentEventService.recordIncident', () => {
  it('AC3 — persists the row with kind/entityId/summary/errorDetails', async () => {
    mockCreate.mockResolvedValue({ _id: 'ie-1' });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.recordIncident({
      kind: 'inventory_deduction_failed',
      entityId: 'order-1',
      summary: 'deductStockForOrder threw',
      errorDetails: { stack: 'Error: x' },
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg).toMatchObject({
      kind: 'inventory_deduction_failed',
      entityId: 'order-1',
      summary: 'deductStockForOrder threw',
    });
  });
});

describe('REQ-066 IncidentEventService.list', () => {
  it('AC6 — applies kind filter to the query', async () => {
    let captured: Record<string, unknown> | undefined;
    mockFind.mockImplementation((q) => {
      captured = q;
      return {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
    });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.list({ kind: 'stale_paid_order' });
    expect(captured?.kind).toBe('stale_paid_order');
  });

  it('AC6 — kind = "all" omits the kind clause', async () => {
    let captured: Record<string, unknown> | undefined;
    mockFind.mockImplementation((q) => {
      captured = q;
      return {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
    });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    await IncidentEventService.list({ kind: 'all' });
    expect(captured?.kind).toBeUndefined();
  });
});

describe('REQ-066 IncidentEventService.dedupRecent', () => {
  it('AC5 — returns true (already-logged) when a row exists within the window', async () => {
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'ie-1' }),
    });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    const exists = await IncidentEventService.dedupRecent({
      kind: 'stale_paid_order',
      entityId: 'order-1',
      withinHours: 24,
    });
    expect(exists).toBe(true);
  });

  it('AC5 — returns false when no recent row exists', async () => {
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    const exists = await IncidentEventService.dedupRecent({
      kind: 'stale_paid_order',
      entityId: 'order-1',
      withinHours: 24,
    });
    expect(exists).toBe(false);
  });
});
