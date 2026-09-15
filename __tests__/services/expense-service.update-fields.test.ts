/**
 * @requirement REQ-105 - Expense edit dialog: full field visibility/editability
 *
 * Pins that `ExpenseService.updateExpense` persists `transactionFee`,
 * `receiptReference`, and `referenceNumber` — fields the DTO already
 * accepted but the edit dialog never surfaced before this REQ. The
 * REQ-034 inventory-link reversal/reapply path is covered separately by
 * the existing `expense-inventory-link.*.test.ts` suite and is untouched
 * by this REQ (no service code changed) — not re-tested here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models', () => ({
  ExpenseModel: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/user-model', () => ({
  default: {
    findById: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      lean: vi
        .fn()
        .mockResolvedValue({ email: 'admin@wgb.test', role: 'super-admin' }),
    })),
  },
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/services/expense-inventory-link-service', () => ({
  applyExpenseInventoryLink: vi.fn(),
  reverseExpenseInventoryLink: vi.fn(),
}));

import { ExpenseModel } from '@/models';
import { ExpenseService } from '@/services/expense-service';

function mockPrior(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'exp-1' },
    date: new Date('2026-01-01'),
    expenseType: 'operating-expense',
    category: 'Rent',
    description: 'Test expense',
    quantity: undefined,
    unit: undefined,
    amount: 1000,
    linkedInventoryId: undefined,
    linkVoidedAt: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('REQ-105: ExpenseService.updateExpense persists previously-unsurfaced fields', () => {
  it('includes transactionFee, receiptReference, and referenceNumber in the $set payload', async () => {
    (ExpenseModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPrior()
    );
    const updated = {
      ...mockPrior(),
      transactionFee: 25,
      receiptReference: 'RCPT-1',
      referenceNumber: 'REF-1',
    };
    (
      ExpenseModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      populate: () => ({ lean: () => Promise.resolve(updated) }),
    });

    await ExpenseService.updateExpense(
      'exp-1',
      {
        transactionFee: 25,
        receiptReference: 'RCPT-1',
        referenceNumber: 'REF-1',
      },
      'user-1'
    );

    expect(ExpenseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'exp-1',
      {
        $set: {
          transactionFee: 25,
          receiptReference: 'RCPT-1',
          referenceNumber: 'REF-1',
        },
      },
      { new: true, runValidators: true }
    );
  });

  it('omits fields the caller did not include from the $set payload', async () => {
    (ExpenseModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPrior()
    );
    (
      ExpenseModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      populate: () => ({ lean: () => Promise.resolve(mockPrior()) }),
    });

    await ExpenseService.updateExpense(
      'exp-1',
      { transactionFee: 10 },
      'user-1'
    );

    const [, updateOps] = (
      ExpenseModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(updateOps.$set).toEqual({ transactionFee: 10 });
    expect(updateOps.$set).not.toHaveProperty('receiptReference');
    expect(updateOps.$set).not.toHaveProperty('referenceNumber');
  });

  it('REQ-104: includes tagIds in the $set payload, including clearing all tags with an empty array', async () => {
    (ExpenseModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockPrior({ tagIds: ['tag-1', 'tag-2'] })
    );
    (
      ExpenseModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      populate: () => ({ lean: () => Promise.resolve(mockPrior()) }),
    });

    await ExpenseService.updateExpense('exp-1', { tagIds: [] }, 'user-1');

    const [, updateOps] = (
      ExpenseModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    // An empty array is not `undefined` — it must still reach $set so a
    // super-admin can remove every tag from an expense, not just add ones.
    expect(updateOps.$set).toEqual({ tagIds: [] });
  });
});
