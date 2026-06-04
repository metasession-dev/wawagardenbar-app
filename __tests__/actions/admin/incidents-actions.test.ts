/**
 * @requirement REQ-066 AC10 — retryInventoryDeductionAction is the
 * server action behind the "Retry now" button on /dashboard/incidents.
 *
 * Contract:
 *   - Requires the `incidentsAccess` permission (via requirePermission).
 *   - Refuses invalid order IDs.
 *   - Returns { success: true, message: 'Already deducted…' } when the
 *     order's flag is already true (idempotent no-op).
 *   - Returns { success: true, message: 'Inventory deducted.' } on
 *     success + flips the order's `inventoryDeducted` flag via
 *     OrderModel.updateOne.
 *   - Returns { success: true, warning: <error message> } when the
 *     underlying deductStockForOrder throws (matches the AC9 ActionResult
 *     shape so the UI's existing warning-toast pattern fires).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockRequirePermission = vi.fn();
vi.mock('@/lib/auth-middleware', () => ({
  requirePermission: (...a: unknown[]) => mockRequirePermission(...a),
}));

const mockFindById = vi.fn();
const mockUpdateOne = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: {
    findById: (...a: unknown[]) => ({
      select: (..._b: unknown[]) => mockFindById(...a),
    }),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
  },
}));

const mockDeductStock = vi.fn();
vi.mock('@/services/inventory-service', () => ({
  default: {
    deductStockForOrder: (...a: unknown[]) => mockDeductStock(...a),
  },
}));

const mockCreateLog = vi.fn();
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: (...a: unknown[]) => mockCreateLog(...a) },
}));

const VALID_ORDER_ID = '507f1f77bcf86cd799439011';
const SUPER_ADMIN_SESSION = {
  userId: '507f1f77bcf86cd799439099',
  email: 'admin@example.com',
  role: 'super-admin',
};

beforeEach(() => {
  mockRequirePermission.mockReset().mockResolvedValue(SUPER_ADMIN_SESSION);
  mockFindById.mockReset();
  mockUpdateOne.mockReset().mockResolvedValue({ acknowledged: true });
  mockDeductStock.mockReset();
  mockCreateLog.mockReset().mockResolvedValue(undefined);
});

describe('retryInventoryDeductionAction', () => {
  it('AC10 — invalid order ID returns error without touching the chokepoint', async () => {
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    const result = await retryInventoryDeductionAction('not-an-objectid');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid order id/i);
    expect(mockDeductStock).not.toHaveBeenCalled();
  });

  it('AC10 — order not found returns failure', async () => {
    mockFindById.mockResolvedValue(null);
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    const result = await retryInventoryDeductionAction(VALID_ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(mockDeductStock).not.toHaveBeenCalled();
  });

  it('AC10 — already-deducted: no-op success with "Already deducted" message', async () => {
    mockFindById.mockResolvedValue({
      inventoryDeducted: true,
      status: 'completed',
    });
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    const result = await retryInventoryDeductionAction(VALID_ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/already deducted/i);
    expect(mockDeductStock).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('AC10 — happy path: deducts, flips flag, returns success', async () => {
    mockFindById.mockResolvedValue({
      inventoryDeducted: false,
      status: 'completed',
    });
    mockDeductStock.mockResolvedValue(undefined);
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    const result = await retryInventoryDeductionAction(VALID_ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/inventory deducted/i);
    expect(mockDeductStock).toHaveBeenCalledWith(VALID_ORDER_ID);
    expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    const updateArgs = mockUpdateOne.mock.calls[0];
    expect(updateArgs[0]).toMatchObject({ inventoryDeducted: false });
    expect(updateArgs[1].$set.inventoryDeducted).toBe(true);
    // Audit log written
    expect(mockCreateLog).toHaveBeenCalled();
    expect(mockCreateLog.mock.calls[0][0].action).toBe(
      'incidents.retry_deduction_succeeded'
    );
  });

  it('AC10 — deduction throws: returns warning, no flag flip, no IncidentEvent (cron dedups)', async () => {
    mockFindById.mockResolvedValue({
      inventoryDeducted: false,
      status: 'completed',
    });
    mockDeductStock.mockRejectedValue(
      new Error(
        "Insufficient stock at defaultSalesLocation='chiller1': have 0, need 5."
      )
    );
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    const result = await retryInventoryDeductionAction(VALID_ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.warning).toMatch(/insufficient stock/i);
    expect(result.warning).toMatch(/chiller1/);
    expect(mockUpdateOne).not.toHaveBeenCalled();
    // Audit-log the retry attempt's failure for traceability
    expect(mockCreateLog).toHaveBeenCalled();
    expect(mockCreateLog.mock.calls[0][0].action).toBe(
      'incidents.retry_deduction_failed'
    );
  });

  it('AC10 — order not in completed status returns helpful error', async () => {
    mockFindById.mockResolvedValue({
      inventoryDeducted: false,
      status: 'preparing',
    });
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    const result = await retryInventoryDeductionAction(VALID_ORDER_ID);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not 'completed'/);
    expect(mockDeductStock).not.toHaveBeenCalled();
  });
});

describe('retryInventoryDeductionAction RBAC', () => {
  it('AC10 — requirePermission is called with incidentsAccess', async () => {
    mockFindById.mockResolvedValue({
      inventoryDeducted: true,
      status: 'completed',
    });
    const { retryInventoryDeductionAction } = await import(
      '@/app/actions/admin/incidents-actions'
    );

    await retryInventoryDeductionAction(VALID_ORDER_ID);

    expect(mockRequirePermission).toHaveBeenCalledWith('incidentsAccess');
  });
});

// Silence unused-import warning for Types
void Types;
