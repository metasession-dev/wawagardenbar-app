/**
 * @requirement REQ-026 - Pending expense group workflow — RBAC tests
 *
 * Tests that server actions enforce the correct role restrictions.
 * Uses vitest mocks for session and service layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock iron-session ──────────────────────────────────────────────────────────

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('@/services/pending-expense-group-service', () => ({
  PendingExpenseGroupService: {
    createGroup: vi
      .fn()
      .mockResolvedValue({ _id: 'group-id-1', status: 'pending' }),
    updateGroup: vi
      .fn()
      .mockResolvedValue({ _id: 'group-id-1', status: 'pending' }),
    approveGroup: vi
      .fn()
      .mockResolvedValue({ _id: 'group-id-1', status: 'approved' }),
    assignBatch: vi.fn().mockResolvedValue(true),
    confirmTransfer: vi.fn().mockResolvedValue({ transferred: 2 }),
  },
}));

import { getIronSession } from 'iron-session';
import {
  createPendingExpenseGroupAction,
  updatePendingExpenseGroupAction,
  approvePendingExpenseGroupAction,
  confirmTransferAction,
} from '@/app/actions/finance/pending-expense-actions';

// ── Session helpers ────────────────────────────────────────────────────────────

function mockSession(role: 'admin' | 'super-admin' | 'customer') {
  vi.mocked(getIronSession).mockResolvedValue({
    isLoggedIn: true,
    userId: 'user-id-123',
    role,
  } as any);
}

const validGroupPayload = {
  date: new Date('2026-04-12'),
  expenseType: 'direct-cost' as const,
  category: 'Meat/Protein',
  items: [
    {
      description: 'Goat',
      quantity: 1,
      unit: 'piece',
      unitCost: 25000,
      totalCost: 25000,
    },
  ],
};

// ── createPendingExpenseGroupAction ───────────────────────────────────────────

describe('REQ-026: createPendingExpenseGroupAction RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('admin can create a pending expense group', async () => {
    mockSession('admin');
    const result = await createPendingExpenseGroupAction(validGroupPayload);
    expect(result.success).toBe(true);
  });

  it('super-admin can create a pending expense group', async () => {
    mockSession('super-admin');
    const result = await createPendingExpenseGroupAction(validGroupPayload);
    expect(result.success).toBe(true);
  });

  it('customer role is blocked from creating a pending expense group', async () => {
    mockSession('customer');
    const result = await createPendingExpenseGroupAction(validGroupPayload);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permission|unauthorized/i);
  });
});

// ── updatePendingExpenseGroupAction ───────────────────────────────────────────

describe('REQ-026: updatePendingExpenseGroupAction RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('admin can update a pending expense group', async () => {
    mockSession('admin');
    const result = await updatePendingExpenseGroupAction('group-id-1', {
      notes: 'updated',
    });
    expect(result.success).toBe(true);
  });

  it('super-admin can update a pending expense group', async () => {
    mockSession('super-admin');
    const result = await updatePendingExpenseGroupAction('group-id-1', {
      notes: 'updated',
    });
    expect(result.success).toBe(true);
  });

  it('customer role is blocked from updating', async () => {
    mockSession('customer');
    const result = await updatePendingExpenseGroupAction('group-id-1', {
      notes: 'updated',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permission|unauthorized/i);
  });
});

// ── approvePendingExpenseGroupAction ──────────────────────────────────────────

describe('REQ-026: approvePendingExpenseGroupAction RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('super-admin can approve a pending group', async () => {
    mockSession('super-admin');
    const result = await approvePendingExpenseGroupAction('group-id-1');
    expect(result.success).toBe(true);
  });

  it('admin is blocked from approving', async () => {
    mockSession('admin');
    const result = await approvePendingExpenseGroupAction('group-id-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permission|unauthorized/i);
  });
});

// ── confirmTransferAction ─────────────────────────────────────────────────────

describe('REQ-026: confirmTransferAction RBAC', () => {
  beforeEach(() => vi.clearAllMocks());

  it('super-admin can confirm transfer', async () => {
    mockSession('super-admin');
    const result = await confirmTransferAction(['group-id-1'], 'TRF-REF-001');
    expect(result.success).toBe(true);
  });

  it('admin is blocked from confirming transfer', async () => {
    mockSession('admin');
    const result = await confirmTransferAction(['group-id-1'], 'TRF-REF-001');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/permission|unauthorized/i);
  });

  it('super-admin blocked when transfer reference is empty', async () => {
    mockSession('super-admin');
    const result = await confirmTransferAction(['group-id-1'], '');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reference/i);
  });
});
