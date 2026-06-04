/**
 * @requirement REQ-066 — InventoryService.reconcileMissedDeductions
 *
 * AC4: cron-side backstop. Finds orders with `status === 'completed' AND
 * inventoryDeducted === false`; retries `deductStockForOrder`; on success
 * flips the flag. On failure writes an `IncidentEvent` tagged
 * `inventory_deduction_failed`. Pure retry — never mutates order status.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockFind = vi.fn();
const mockUpdateOne = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    find: (...a: unknown[]) => mockFind(...a),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
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

function mockOrder(id: string) {
  return {
    _id: { toString: () => id },
    status: 'completed',
    inventoryDeducted: false,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  mockFind.mockReset();
  mockUpdateOne.mockReset().mockResolvedValue({ acknowledged: true });
  mockRecordIncident.mockReset().mockResolvedValue({});
  // Default: no recent duplicate — preserves existing AC4 test behavior
  // where the failure path writes a fresh IncidentEvent.
  mockDedupRecent.mockReset().mockResolvedValue(false);
});

describe('REQ-066 InventoryService.reconcileMissedDeductions', () => {
  it('AC4 — filters on status=completed AND inventoryDeducted=false', async () => {
    let captured: Record<string, unknown> | undefined;
    mockFind.mockImplementation((q) => {
      captured = q;
      return chainable([]);
    });

    const InventoryService = (await import('@/services/inventory-service'))
      .default;
    await InventoryService.reconcileMissedDeductions();

    expect(captured?.status).toBe('completed');
    expect(captured?.inventoryDeducted).toBe(false);
  });

  it('AC4 — success: deduct + flip inventoryDeducted + write update', async () => {
    const order = mockOrder('507f1f77bcf86cd799439011');
    mockFind.mockReturnValue(chainable([order]));
    const InventoryService = (await import('@/services/inventory-service'))
      .default;
    const deductSpy = vi
      .spyOn(InventoryService, 'deductStockForOrder')
      .mockResolvedValue(undefined as never);

    const result = await InventoryService.reconcileMissedDeductions();

    expect(deductSpy).toHaveBeenCalledTimes(1);
    expect(result.attempted).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    expect(mockRecordIncident).not.toHaveBeenCalled();
    deductSpy.mockRestore();
  });

  it('AC4 — failure: writes IncidentEvent, does not flip flag', async () => {
    const order = mockOrder('507f1f77bcf86cd799439011');
    mockFind.mockReturnValue(chainable([order]));
    const InventoryService = (await import('@/services/inventory-service'))
      .default;
    const deductSpy = vi
      .spyOn(InventoryService, 'deductStockForOrder')
      .mockRejectedValue(new Error('still throwing'));

    const result = await InventoryService.reconcileMissedDeductions();

    expect(result.failed).toBe(1);
    expect(mockRecordIncident).toHaveBeenCalledTimes(1);
    const incArg = mockRecordIncident.mock.calls[0][0];
    expect(incArg).toMatchObject({
      kind: 'inventory_deduction_failed',
      entityId: '507f1f77bcf86cd799439011',
    });
    expect(mockUpdateOne).not.toHaveBeenCalled();
    deductSpy.mockRestore();
  });

  it('AC10 — dedup: when dedupRecent returns true, no new IncidentEvent is written', async () => {
    const order = mockOrder('507f1f77bcf86cd799439011');
    mockFind.mockReturnValue(chainable([order]));
    mockDedupRecent.mockResolvedValueOnce(true); // simulate recent dup
    const InventoryService = (await import('@/services/inventory-service'))
      .default;
    const deductSpy = vi
      .spyOn(InventoryService, 'deductStockForOrder')
      .mockRejectedValue(new Error('still throwing'));

    const result = await InventoryService.reconcileMissedDeductions();

    expect(result.failed).toBe(1);
    expect(mockDedupRecent).toHaveBeenCalledTimes(1);
    expect(mockDedupRecent).toHaveBeenCalledWith({
      kind: 'inventory_deduction_failed',
      entityId: '507f1f77bcf86cd799439011',
      withinHours: 1,
    });
    expect(mockRecordIncident).not.toHaveBeenCalled();
    deductSpy.mockRestore();
  });

  it('AC10 — dedup: when dedupRecent returns false, a fresh IncidentEvent is written', async () => {
    const order = mockOrder('507f1f77bcf86cd799439011');
    mockFind.mockReturnValue(chainable([order]));
    mockDedupRecent.mockResolvedValueOnce(false); // no recent dup
    const InventoryService = (await import('@/services/inventory-service'))
      .default;
    const deductSpy = vi
      .spyOn(InventoryService, 'deductStockForOrder')
      .mockRejectedValue(new Error('still throwing'));

    await InventoryService.reconcileMissedDeductions();

    expect(mockDedupRecent).toHaveBeenCalledTimes(1);
    expect(mockRecordIncident).toHaveBeenCalledTimes(1);
    deductSpy.mockRestore();
  });
});
