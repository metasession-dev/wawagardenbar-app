/**
 * Service-level coverage of `PendingExpenseGroupService.updateGroup`:
 *
 * The Edit Pending Expense Group dialog now sends `linkedInventoryId` on
 * each line item. Verify the service end-to-end preserves the field on
 * round-trip:
 *   - kitchen-linked items retain their link
 *   - sellable-linked items retain their link
 *   - explicit unsetting (caller sends `linkedInventoryId: undefined`)
 *     clears the link
 *
 * Mongo collections are stubbed; the assertions inspect the payload
 * passed to `findByIdAndUpdate`.
 *
 * Ref: #93
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const findByIdMock = vi.fn();
const findByIdAndUpdateMock = vi.fn();

vi.mock('@/models/pending-expense-group-model', () => ({
  PendingExpenseGroupModel: {
    findById: (...args: unknown[]) => findByIdMock(...args),
    findByIdAndUpdate: (...args: unknown[]) => findByIdAndUpdateMock(...args),
  },
}));

vi.mock('@/services/expense-inventory-link-service', () => ({
  applyExpenseInventoryLink: vi.fn(),
}));

import { PendingExpenseGroupService } from '@/services/pending-expense-group-service';

function makeExistingGroup(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    submittedBy: new Types.ObjectId(),
    date: new Date('2026-05-01'),
    status: 'pending',
    items: [
      {
        expenseType: 'direct-cost' as const,
        category: 'Despirado',
        description: 'Original line',
        quantity: 1,
        unit: 'kg',
        unitCost: 1000,
        totalCost: 1000,
        linkedInventoryId: undefined as string | undefined,
      },
    ],
    totalAmount: 1000,
    notes: '',
    ...overrides,
  };
}

function mockFindByIdAndUpdateReturn(
  group: ReturnType<typeof makeExistingGroup>
) {
  findByIdAndUpdateMock.mockReturnValue({
    lean: vi.fn().mockResolvedValue(group),
  });
}

describe('PendingExpenseGroupService.updateGroup — linkedInventoryId preservation (#93)', () => {
  beforeEach(() => {
    findByIdMock.mockReset();
    findByIdAndUpdateMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('preserves a kitchen-ingredient linkedInventoryId on update', async () => {
    const existing = makeExistingGroup();
    findByIdMock.mockResolvedValue(existing);
    const kitchenLink = new Types.ObjectId().toString();
    const updatedItems = [
      {
        ...existing.items[0],
        description: 'Edited description (kitchen)',
        linkedInventoryId: kitchenLink,
      },
    ];
    mockFindByIdAndUpdateReturn({ ...existing, items: updatedItems });

    await PendingExpenseGroupService.updateGroup(existing._id.toString(), {
      items: updatedItems,
    });

    expect(findByIdAndUpdateMock).toHaveBeenCalledTimes(1);
    const updatePayload = findByIdAndUpdateMock.mock.calls[0][1] as {
      $set: { items: Array<{ linkedInventoryId?: string }> };
    };
    expect(updatePayload.$set.items[0].linkedInventoryId).toBe(kitchenLink);
  });

  it('preserves a sellable linkedInventoryId on update', async () => {
    const existing = makeExistingGroup();
    findByIdMock.mockResolvedValue(existing);
    const sellableLink = new Types.ObjectId().toString();
    const updatedItems = [
      {
        ...existing.items[0],
        description: 'Edited description (sellable)',
        unit: 'Bottles',
        linkedInventoryId: sellableLink,
      },
    ];
    mockFindByIdAndUpdateReturn({ ...existing, items: updatedItems });

    await PendingExpenseGroupService.updateGroup(existing._id.toString(), {
      items: updatedItems,
    });

    const updatePayload = findByIdAndUpdateMock.mock.calls[0][1] as {
      $set: { items: Array<{ linkedInventoryId?: string }> };
    };
    expect(updatePayload.$set.items[0].linkedInventoryId).toBe(sellableLink);
  });

  it('clears the link when caller sends linkedInventoryId: undefined', async () => {
    const existingLink = new Types.ObjectId().toString();
    const existing = makeExistingGroup({
      items: [
        {
          expenseType: 'direct-cost' as const,
          category: 'Despirado',
          description: 'Originally linked',
          quantity: 1,
          unit: 'kg',
          unitCost: 1000,
          totalCost: 1000,
          linkedInventoryId: existingLink,
        },
      ],
    });
    findByIdMock.mockResolvedValue(existing);
    const updatedItems = [
      {
        ...existing.items[0],
        linkedInventoryId: undefined,
      },
    ];
    mockFindByIdAndUpdateReturn({ ...existing, items: updatedItems });

    await PendingExpenseGroupService.updateGroup(existing._id.toString(), {
      items: updatedItems,
    });

    const updatePayload = findByIdAndUpdateMock.mock.calls[0][1] as {
      $set: { items: Array<{ linkedInventoryId?: string }> };
    };
    expect(updatePayload.$set.items[0].linkedInventoryId).toBeUndefined();
  });
});
