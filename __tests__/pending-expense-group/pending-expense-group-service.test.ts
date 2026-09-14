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
  assertBatchPaymentMethodHomogeneous,
} from '@/services/pending-expense-group-service';
import {
  IExpenseLineItem,
  IPendingExpenseGroup,
} from '@/interfaces/pending-expense-group.interface';
import { ObjectId } from 'mongodb';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<IExpenseLineItem> = {}): IExpenseLineItem {
  return {
    expenseType: 'direct-cost',
    category: 'Meat/Protein',
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

  it('maps group date and per-item expenseType/category to each record', () => {
    const date = new Date('2026-04-12');
    const group = makeGroup({
      date,
      items: [makeItem({ expenseType: 'operating-expense', category: 'Rent' })],
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
});

// ── REQ-104: tag propagation ─────────────────────────────────────────────────

describe('REQ-104: buildExpenseRecordsFromGroup propagates tagIds', () => {
  it('propagates a line item tagIds array onto its Expense record', () => {
    const group = makeGroup({
      items: [makeItem({ tagIds: ['tag-1', 'tag-2'] })],
    });
    const records = buildExpenseRecordsFromGroup(group, 'TRF-104-1', 'user-1');
    expect(records[0].tagIds).toEqual(['tag-1', 'tag-2']);
  });

  it('leaves tagIds undefined when the line item carries no tags', () => {
    const group = makeGroup({ items: [makeItem({ tagIds: undefined })] });
    const records = buildExpenseRecordsFromGroup(group, 'TRF-104-2', 'user-1');
    expect(records[0].tagIds).toBeUndefined();
  });

  it('propagates different tagIds independently per line item', () => {
    const group = makeGroup({
      items: [
        makeItem({ tagIds: ['tag-a'] }),
        makeItem({ tagIds: ['tag-b', 'tag-c'] }),
      ],
    });
    const records = buildExpenseRecordsFromGroup(group, 'TRF-104-3', 'user-1');
    expect(records[0].tagIds).toEqual(['tag-a']);
    expect(records[1].tagIds).toEqual(['tag-b', 'tag-c']);
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

// ── REQ-106: conditional transferReference requirement ──────────────────────

describe('REQ-106: buildExpenseRecordsFromGroup — payment-method-conditional reference', () => {
  it('requires a non-empty transferReference for a transfer-method group', () => {
    const group = makeGroup({ paymentMethod: 'transfer', items: [makeItem()] });
    expect(() => buildExpenseRecordsFromGroup(group, '', 'user-1')).toThrow(
      'Transfer reference is required'
    );
  });

  it('allows an empty transferReference for a cash-method group', () => {
    const group = makeGroup({ paymentMethod: 'cash', items: [makeItem()] });
    expect(() =>
      buildExpenseRecordsFromGroup(group, '', 'user-1')
    ).not.toThrow();
  });

  it('treats a group with no paymentMethod (pre-REQ-106) as requiring a reference', () => {
    const group = makeGroup({ paymentMethod: undefined, items: [makeItem()] });
    expect(() => buildExpenseRecordsFromGroup(group, '', 'user-1')).toThrow(
      'Transfer reference is required'
    );
  });

  it('propagates paymentMethod onto each Expense record', () => {
    const group = makeGroup({ paymentMethod: 'cash', items: [makeItem()] });
    const records = buildExpenseRecordsFromGroup(group, 'ref', 'user-1');
    expect(records[0].paymentMethod).toBe('cash');
  });
});

// ── REQ-106: batch payment-method homogeneity guard ──────────────────────────

describe('REQ-106: assertBatchPaymentMethodHomogeneous', () => {
  it('allows a batch where every group shares the same payment method', () => {
    expect(() =>
      assertBatchPaymentMethodHomogeneous([
        { paymentMethod: 'cash' },
        { paymentMethod: 'cash' },
      ])
    ).not.toThrow();
  });

  it('rejects a batch mixing cash and transfer groups', () => {
    expect(() =>
      assertBatchPaymentMethodHomogeneous([
        { paymentMethod: 'cash' },
        { paymentMethod: 'transfer' },
      ])
    ).toThrow(/different payment methods/);
  });

  it('treats groups with no paymentMethod as transfer for the homogeneity check', () => {
    expect(() =>
      assertBatchPaymentMethodHomogeneous([
        { paymentMethod: undefined },
        { paymentMethod: 'transfer' },
      ])
    ).not.toThrow();
    expect(() =>
      assertBatchPaymentMethodHomogeneous([
        { paymentMethod: undefined },
        { paymentMethod: 'cash' },
      ])
    ).toThrow(/different payment methods/);
  });

  it('allows a single-group batch trivially', () => {
    expect(() =>
      assertBatchPaymentMethodHomogeneous([{ paymentMethod: 'cash' }])
    ).not.toThrow();
  });
});
