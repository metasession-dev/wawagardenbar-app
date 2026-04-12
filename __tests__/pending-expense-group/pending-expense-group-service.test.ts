/**
 * @requirement REQ-026 - Pending expense group workflow
 *
 * Unit tests for pure logic functions extracted from PendingExpenseGroupService.
 * No database required — tests calculation, validation, and fan-out logic only.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateGroupTotal,
  normaliseLineItems,
  validateStatusTransition,
  buildExpenseRecordsFromGroup,
} from '@/services/pending-expense-group-service';
import {
  IExpenseLineItem,
  IPendingExpenseGroup,
} from '@/interfaces/pending-expense-group.interface';
import { ObjectId } from 'mongodb';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<IExpenseLineItem> = {}): IExpenseLineItem {
  return {
    description: 'Test item',
    quantity: 2,
    unit: 'kg',
    unitCost: 500,
    totalCost: 1000,
    ...overrides,
  };
}

function makeGroup(
  overrides: Partial<IPendingExpenseGroup> = {}
): IPendingExpenseGroup {
  const now = new Date();
  return {
    _id: new ObjectId(),
    date: now,
    expenseType: 'direct-cost',
    category: 'Meat/Protein',
    items: [makeItem()],
    totalAmount: 1000,
    status: 'pending',
    submittedBy: new ObjectId(),
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── calculateGroupTotal ────────────────────────────────────────────────────────

describe('REQ-026: calculateGroupTotal', () => {
  it('returns sum of all item totalCosts', () => {
    const items: IExpenseLineItem[] = [
      makeItem({ totalCost: 1000 }),
      makeItem({ totalCost: 2500 }),
      makeItem({ totalCost: 750 }),
    ];
    expect(calculateGroupTotal(items)).toBe(4250);
  });

  it('returns 0 for empty items array', () => {
    expect(calculateGroupTotal([])).toBe(0);
  });

  it('returns single item totalCost for one item', () => {
    expect(calculateGroupTotal([makeItem({ totalCost: 3000 })])).toBe(3000);
  });
});

// ── normaliseLineItems ─────────────────────────────────────────────────────────

describe('REQ-026: normaliseLineItems', () => {
  it('auto-calculates totalCost as quantity × unitCost when totalCost is 0', () => {
    const items = [makeItem({ quantity: 3, unitCost: 400, totalCost: 0 })];
    const result = normaliseLineItems(items);
    expect(result[0].totalCost).toBe(1200);
  });

  it('preserves manually entered totalCost when it is non-zero', () => {
    const items = [makeItem({ quantity: 3, unitCost: 400, totalCost: 999 })];
    const result = normaliseLineItems(items);
    expect(result[0].totalCost).toBe(999);
  });

  it('handles quantity 0 — totalCost stays 0', () => {
    const items = [makeItem({ quantity: 0, unitCost: 400, totalCost: 0 })];
    const result = normaliseLineItems(items);
    expect(result[0].totalCost).toBe(0);
  });
});

// ── validateStatusTransition ───────────────────────────────────────────────────

describe('REQ-026: validateStatusTransition', () => {
  it('allows pending → approved', () => {
    expect(() => validateStatusTransition('pending', 'approved')).not.toThrow();
  });

  it('allows approved → transferred', () => {
    expect(() =>
      validateStatusTransition('approved', 'transferred')
    ).not.toThrow();
  });

  it('throws when approving an already-approved group', () => {
    expect(() => validateStatusTransition('approved', 'approved')).toThrow();
  });

  it('throws when approving a transferred group', () => {
    expect(() => validateStatusTransition('transferred', 'approved')).toThrow();
  });

  it('throws when transferring a pending group (not yet approved)', () => {
    expect(() => validateStatusTransition('pending', 'transferred')).toThrow();
  });

  it('throws when transferring an already-transferred group', () => {
    expect(() =>
      validateStatusTransition('transferred', 'transferred')
    ).toThrow();
  });
});

// ── buildExpenseRecordsFromGroup ───────────────────────────────────────────────

describe('REQ-026: buildExpenseRecordsFromGroup', () => {
  it('creates one Expense record per line item', () => {
    const group = makeGroup({
      items: [makeItem({ totalCost: 1000 }), makeItem({ totalCost: 2000 })],
    });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-001',
      'user-id-abc'
    );
    expect(records).toHaveLength(2);
  });

  it('maps group date, expenseType, category to each record', () => {
    const date = new Date('2026-04-12');
    const group = makeGroup({
      date,
      expenseType: 'operating-expense',
      category: 'Rent',
    });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-002',
      'user-id-abc'
    );
    expect(records[0].date).toEqual(date);
    expect(records[0].expenseType).toBe('operating-expense');
    expect(records[0].category).toBe('Rent');
  });

  it('sets amount to item totalCost on each record', () => {
    const group = makeGroup({
      items: [makeItem({ totalCost: 1500 }), makeItem({ totalCost: 3000 })],
    });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-003',
      'user-id-abc'
    );
    expect(records[0].amount).toBe(1500);
    expect(records[1].amount).toBe(3000);
  });

  it('sets transferReference as receiptReference on each record', () => {
    const group = makeGroup({ items: [makeItem()] });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-REF-XYZ',
      'user-id-abc'
    );
    expect(records[0].receiptReference).toBe('TRF-REF-XYZ');
  });

  it('sets pendingGroupId to the group _id on each record', () => {
    const group = makeGroup({ items: [makeItem()] });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-004',
      'user-id-abc'
    );
    expect(records[0].pendingGroupId).toBe(group._id.toString());
  });

  it('sets createdBy to the transferredBy userId on each record', () => {
    const group = makeGroup({ items: [makeItem()] });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-005',
      'user-id-xyz'
    );
    expect(records[0].createdBy).toBe('user-id-xyz');
  });

  it('throws when transferReference is empty string', () => {
    const group = makeGroup({ items: [makeItem()] });
    expect(() =>
      buildExpenseRecordsFromGroup(group, '', 'user-id-abc')
    ).toThrow();
  });

  it('throws when group has no items', () => {
    const group = makeGroup({ items: [] });
    expect(() =>
      buildExpenseRecordsFromGroup(group, 'TRF-006', 'user-id-abc')
    ).toThrow();
  });

  it('live Expense records are not present before transfer (service does not auto-create)', () => {
    // This is a contract test — buildExpenseRecordsFromGroup is a pure function
    // that returns DTOs; it does NOT write to the DB. Caller is responsible for DB writes.
    const group = makeGroup({ items: [makeItem()] });
    const records = buildExpenseRecordsFromGroup(
      group,
      'TRF-007',
      'user-id-abc'
    );
    // Returns array of DTOs, not persisted documents
    expect(Array.isArray(records)).toBe(true);
    expect(records[0]).not.toHaveProperty('_id');
  });
});
