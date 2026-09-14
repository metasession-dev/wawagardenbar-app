/**
 * @requirement REQ-106 - Cash deposit workflow: pending | approved | transferred
 *
 * Pins CashDepositService's status machine (shared with
 * PendingExpenseGroupService via lib/status-transition.ts) and the
 * optional-reference confirmTransfer contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(),
}));

const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindByIdAndDelete = vi.fn();
const mockFind = vi.fn();

vi.mock('@/models/cash-deposit-model', () => ({
  CashDepositModel: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: unknown[]) => mockFindByIdAndDelete(...args),
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

import { CashDepositService } from '@/services/cash-deposit-service';

const USER_ID = '507f1f77bcf86cd799439011';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('REQ-106: CashDepositService.createDeposit', () => {
  it('creates a pending deposit', async () => {
    const created = { toObject: () => ({ status: 'pending', amount: 5000 }) };
    mockCreate.mockResolvedValue(created);
    const result = await CashDepositService.createDeposit({
      date: new Date(),
      amount: 5000,
      submittedBy: USER_ID,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', amount: 5000 })
    );
    expect(result).toEqual({ status: 'pending', amount: 5000 });
  });
});

describe('REQ-106: CashDepositService status machine', () => {
  it('approveDeposit rejects a non-pending deposit', async () => {
    mockFindById.mockResolvedValue({ status: 'approved' });
    await expect(
      CashDepositService.approveDeposit('dep-1', USER_ID)
    ).rejects.toThrow(/Invalid status transition/);
  });

  it('approveDeposit transitions pending -> approved', async () => {
    mockFindById.mockResolvedValue({ status: 'pending' });
    mockFindByIdAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ status: 'approved' }),
    });
    const result = await CashDepositService.approveDeposit('dep-1', USER_ID);
    expect(result).toEqual({ status: 'approved' });
  });

  it('confirmTransfer rejects a non-approved deposit', async () => {
    mockFindById.mockResolvedValue({ status: 'pending' });
    await expect(
      CashDepositService.confirmTransfer('dep-1', 'REF-1', USER_ID)
    ).rejects.toThrow(/Invalid status transition/);
  });

  it('confirmTransfer succeeds with NO reference (optional, unlike expenses)', async () => {
    mockFindById.mockResolvedValue({
      status: 'approved',
      reference: undefined,
    });
    mockFindByIdAndUpdate.mockReturnValue({
      lean: () => Promise.resolve({ status: 'transferred' }),
    });
    const result = await CashDepositService.confirmTransfer(
      'dep-1',
      undefined,
      USER_ID
    );
    expect(result).toEqual({ status: 'transferred' });
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      'dep-1',
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'transferred' }),
      }),
      expect.anything()
    );
  });
});

describe('REQ-106: CashDepositService edit/delete locks', () => {
  it('rejects updating a transferred deposit', async () => {
    mockFindById.mockResolvedValue({ status: 'transferred' });
    await expect(
      CashDepositService.updateDeposit('dep-1', { amount: 100 })
    ).rejects.toThrow('Cannot edit a transferred cash deposit');
  });

  it('rejects deleting a transferred deposit', async () => {
    mockFindById.mockResolvedValue({ status: 'transferred' });
    await expect(CashDepositService.deleteDeposit('dep-1')).rejects.toThrow(
      'Cannot delete a transferred cash deposit'
    );
  });
});
