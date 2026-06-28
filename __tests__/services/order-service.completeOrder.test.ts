/**
 * @requirement REQ-066 — OrderService.completeOrder is the canonical
 * single chokepoint for marking an order completed + deducting inventory.
 * @requirement REQ-087 — now consumes IDeductionResult from deductStockForOrder
 *
 * AC1: flips status to 'completed', adds status-history, calls
 * deductStockForOrder under the `!inventoryDeducted` guard, writes
 * audit-log entry, saves. On deduction throw, writes IncidentEvent
 * tagged `inventory_deduction_failed` but DOES NOT block the status
 * flip — kitchen workflow must not stall.
 *
 * With REQ-087, deductStockForOrder returns a result object. Partial
 * failures (allSucceeded=false) write an IncidentEvent with per-item
 * breakdown. Only allSucceeded=true sets inventoryDeducted=true.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const mockDeductStock = vi.fn();
vi.mock('@/services/inventory-service', () => ({
  default: {
    deductStockForOrder: (...a: unknown[]) => mockDeductStock(...a),
  },
  InventoryService: {
    deductStockForOrder: (...a: unknown[]) => mockDeductStock(...a),
  },
}));

const mockRecordIncident = vi.fn();
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    recordIncident: (...a: unknown[]) => mockRecordIncident(...a),
  },
}));

const mockCreateAuditLog = vi.fn();
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...a: unknown[]) => mockCreateAuditLog(...a),
  },
}));

function mockOrder(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    status: 'ready',
    inventoryDeducted: false,
    inventoryDeductedAt: undefined,
    inventoryDeductedBy: undefined,
    statusHistory: [] as Array<Record<string, unknown>>,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const mockFindById = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
  },
}));

beforeEach(() => {
  mockDeductStock.mockReset();
  mockRecordIncident.mockReset().mockResolvedValue({});
  mockCreateAuditLog.mockReset().mockResolvedValue(undefined);
  mockFindById.mockReset();
});

describe('REQ-066 OrderService.completeOrder', () => {
  it('AC1 — happy path: flips status, deducts, sets flags, writes audit log', async () => {
    const order = mockOrder();
    mockFindById.mockResolvedValue(order);
    mockDeductStock.mockResolvedValue({
      allSucceeded: true,
      results: [
        {
          menuItemId: '507f1f77bcf86cd7994390aa',
          itemName: 'Item A',
          status: 'deducted',
          quantity: 2,
          linkedResults: [],
        },
      ],
    });

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });

    expect(result.success).toBe(true);
    expect(order.status).toBe('completed');
    expect(order.statusHistory as unknown[]).toHaveLength(1);
    expect(
      (order.statusHistory as Array<Record<string, unknown>>)[0]
    ).toMatchObject({ status: 'completed' });
    expect(mockDeductStock).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(order.inventoryDeducted).toBe(true);
    expect(order.inventoryDeductedAt).toBeInstanceOf(Date);
    expect(order.save).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalled();
    expect(mockRecordIncident).not.toHaveBeenCalled();
  });

  it('AC1 — idempotency: already-completed + already-deducted is a no-op', async () => {
    const order = mockOrder({ status: 'completed', inventoryDeducted: true });
    mockFindById.mockResolvedValue(order);

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });

    expect(result.success).toBe(true);
    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(order.save).not.toHaveBeenCalled();
  });

  it('AC1 — deduction throw: writes IncidentEvent + still flips status (workflow not blocked)', async () => {
    const order = mockOrder();
    mockFindById.mockResolvedValue(order);
    mockDeductStock.mockRejectedValue(new Error('inventory schema mismatch'));

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });

    expect(result.success).toBe(true);
    expect(order.status).toBe('completed');
    expect(order.inventoryDeducted).toBe(false);
    expect(order.save).toHaveBeenCalled();
    expect(mockRecordIncident).toHaveBeenCalledTimes(1);
    const incArg = mockRecordIncident.mock.calls[0][0];
    expect(incArg).toMatchObject({
      kind: 'inventory_deduction_failed',
      entityId: '507f1f77bcf86cd799439011',
    });
    expect(incArg.summary).toMatch(/deductStockForOrder/i);
  });

  it('AC9 — deduction throw: return value carries deductionFailed=true + the error message for UI surfacing', async () => {
    // The kitchen-display / orders-page click handler reads this to show
    // a yellow warning toast instead of a green "Success" toast — closes
    // the silent-failure UX gap operator surfaced on UAT 2026-06-04.
    const order = mockOrder();
    mockFindById.mockResolvedValue(order);
    mockDeductStock.mockRejectedValue(
      new Error(
        "Insufficient stock at defaultSalesLocation='chiller1': have 9, need 15. Move stock to the sale point before completing the order."
      )
    );

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });

    expect(result.success).toBe(true);
    expect(result.deductionFailed).toBe(true);
    expect(result.deductionError).toMatch(/insufficient stock/i);
    expect(result.deductionError).toMatch(/chiller1/);
    // The order itself still flips — only the deduction half failed.
    expect(order.status).toBe('completed');
    expect(order.inventoryDeducted).toBe(false);
  });

  it('AC9 — happy path: deductionFailed is undefined when the deduction succeeds', async () => {
    const order = mockOrder();
    mockFindById.mockResolvedValue(order);
    mockDeductStock.mockResolvedValue({
      allSucceeded: true,
      results: [],
    });

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });

    expect(result.success).toBe(true);
    expect(result.deductionFailed).toBeUndefined();
    expect(result.deductionError).toBeUndefined();
  });

  it('AC1 — order not found returns failure', async () => {
    mockFindById.mockResolvedValue(null);
    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439099',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('AC1 — cancelled order cannot be completed', async () => {
    const order = mockOrder({ status: 'cancelled' });
    mockFindById.mockResolvedValue(order);
    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });
    expect(result.success).toBe(false);
    expect(mockDeductStock).not.toHaveBeenCalled();
  });

  it('REQ-087 AC3 — partial failure: writes IncidentEvent with per-item breakdown', async () => {
    const order = mockOrder();
    mockFindById.mockResolvedValue(order);
    mockDeductStock.mockResolvedValue({
      allSucceeded: false,
      results: [
        {
          menuItemId: '507f1f77bcf86cd7994390aa',
          itemName: 'Item A',
          status: 'deducted',
          quantity: 2,
          linkedResults: [],
        },
        {
          menuItemId: '507f1f77bcf86cd7994390bb',
          itemName: 'Item B',
          status: 'failed',
          error: 'Insufficient stock at chiller1',
          quantity: 3,
          linkedResults: [],
        },
      ],
    });

    const { OrderService } = await import('@/services/order-service');
    const result = await OrderService.completeOrder({
      orderId: '507f1f77bcf86cd799439011',
      actorUserId: 'staff-1',
      actorRole: 'csr',
    });

    expect(result.success).toBe(true);
    expect(order.status).toBe('completed');
    expect(order.inventoryDeducted).toBe(false);
    expect(order.inventoryDeductionDetails).toHaveLength(2);
    expect(mockRecordIncident).toHaveBeenCalledTimes(1);
    const incArg = mockRecordIncident.mock.calls[0][0];
    expect(incArg.kind).toBe('inventory_deduction_failed');
    expect(incArg.errorDetails).toHaveProperty('deductedItems');
    expect(incArg.errorDetails).toHaveProperty('failedItems');
    expect(incArg.errorDetails).toHaveProperty('skippedItems');
    expect(incArg.errorDetails.failedItems).toHaveLength(1);
    expect(incArg.errorDetails.failedItems[0].error).toMatch(
      /insufficient stock/i
    );
  });
});
