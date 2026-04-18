/**
 * @requirement REQ-029 - Expand expense search to include receipt reference, notes, and amount
 *
 * Unit tests for ExpenseService.getExpensesByDateRange — specifically the Mongo
 * query object built when filters.searchTerm is (or isn't) provided. Mocks the
 * model chain entirely; no database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

// Capture every query object passed to ExpenseModel.find(). The chain
// .populate().sort().lean() must resolve to a predictable array.
const findCalls: Array<Record<string, unknown>> = [];
const mockLean = vi.fn();

function makeChain() {
  const chain: {
    populate: (...args: unknown[]) => typeof chain;
    sort: (...args: unknown[]) => typeof chain;
    lean: () => Promise<unknown>;
  } = {
    populate: () => chain,
    sort: () => chain,
    lean: () => mockLean(),
  };
  return chain;
}

vi.mock('@/models', () => ({
  ExpenseModel: {
    find: (query: Record<string, unknown>) => {
      findCalls.push(query);
      return makeChain();
    },
  },
  UserModel: {},
}));

vi.mock('@/models/user-model', () => ({
  default: {},
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: vi.fn(),
  },
}));

import { ExpenseService } from '@/services/expense-service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const START = new Date('2026-04-01T00:00:00.000Z');
const END = new Date('2026-04-30T23:59:59.999Z');

beforeEach(() => {
  findCalls.length = 0;
  mockLean.mockReset();
  mockLean.mockResolvedValue([]);
});

function lastQuery(): Record<string, any> {
  if (findCalls.length === 0) {
    throw new Error('ExpenseModel.find was not called');
  }
  return findCalls[findCalls.length - 1] as Record<string, any>;
}

function orBranches(query: Record<string, any>): Array<Record<string, any>> {
  return (query.$or ?? []) as Array<Record<string, any>>;
}

function regexBranchFor(
  query: Record<string, any>,
  field: string
): RegExp | undefined {
  const branch = orBranches(query).find((b) => field in b);
  return branch?.[field] as RegExp | undefined;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('REQ-029: getExpensesByDateRange — no search term', () => {
  it('includes only date range when searchTerm is absent', async () => {
    await ExpenseService.getExpensesByDateRange(START, END);
    const q = lastQuery();
    expect(q.date).toEqual({ $gte: START, $lte: END });
    expect(q.$or).toBeUndefined();
    expect(q.$text).toBeUndefined();
  });

  it('includes only date range when searchTerm is empty string', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, { searchTerm: '' });
    const q = lastQuery();
    expect(q.$or).toBeUndefined();
    expect(q.$text).toBeUndefined();
  });

  it('includes only date range when searchTerm is whitespace', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: '   ',
    });
    const q = lastQuery();
    expect(q.$or).toBeUndefined();
    expect(q.$text).toBeUndefined();
  });
});

describe('REQ-029: getExpensesByDateRange — regex $or construction', () => {
  it('builds a regex $or across the five string fields for a plain term', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'beef',
    });
    const q = lastQuery();
    const fields = orBranches(q).flatMap((b) => Object.keys(b));
    expect(fields).toEqual(
      expect.arrayContaining([
        'description',
        'notes',
        'supplier',
        'receiptReference',
        'referenceNumber',
      ])
    );
    // each string-field branch is a case-insensitive RegExp
    for (const f of [
      'description',
      'notes',
      'supplier',
      'receiptReference',
      'referenceNumber',
    ]) {
      const re = regexBranchFor(q, f);
      expect(re).toBeInstanceOf(RegExp);
      expect(re?.flags).toContain('i');
      expect(re?.test('BEEF 1kg')).toBe(true);
    }
  });

  it('escapes pipes so TRF|... matches the literal pipe, not alternation', async () => {
    const ref = 'TRF|2MPTfr482|2045529935434317824';
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: ref,
    });
    const re = regexBranchFor(lastQuery(), 'receiptReference');
    expect(re).toBeInstanceOf(RegExp);
    expect(re?.test(ref)).toBe(true);
    // the unescaped alternation would have made 'TRF' alone a match — it must not
    expect(re?.test('TRF')).toBe(false);
    expect(re?.test('2MPTfr482')).toBe(false);
  });

  it('escapes dot so "a.b" becomes the literal pattern', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'a.b',
    });
    const re = regexBranchFor(lastQuery(), 'description');
    expect(re?.test('a.b')).toBe(true);
    expect(re?.test('axb')).toBe(false);
  });
});

describe('REQ-029: getExpensesByDateRange — numeric amount branch', () => {
  it('adds { amount: n } branch when term parses as a finite number', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: '15000',
    });
    const q = lastQuery();
    const amountBranch = orBranches(q).find((b) => 'amount' in b);
    expect(amountBranch).toEqual({ amount: 15000 });
  });

  it('does NOT add amount branch when term is partial-numeric "12abc"', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: '12abc',
    });
    const q = lastQuery();
    const amountBranch = orBranches(q).find((b) => 'amount' in b);
    expect(amountBranch).toBeUndefined();
  });

  it('does NOT add amount branch when term is non-numeric', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'beef',
    });
    const q = lastQuery();
    const amountBranch = orBranches(q).find((b) => 'amount' in b);
    expect(amountBranch).toBeUndefined();
  });
});

describe('REQ-029: getExpensesByDateRange — filter composition', () => {
  it('composes search with expenseType filter (both present in query)', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'beef',
      expenseType: 'direct-cost',
    });
    const q = lastQuery();
    expect(q.expenseType).toBe('direct-cost');
    expect(q.$or).toBeDefined();
    expect(q.date).toEqual({ $gte: START, $lte: END });
  });

  it('composes search with category filter (both present in query)', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'beef',
      category: 'Meat/Protein',
    });
    const q = lastQuery();
    expect(q.category).toBe('Meat/Protein');
    expect(q.$or).toBeDefined();
  });

  it('preserves date range when search present', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'beef',
    });
    expect(lastQuery().date).toEqual({ $gte: START, $lte: END });
  });
});

describe('REQ-029: getExpensesByDateRange — regression', () => {
  it('does NOT use $text anywhere (D1 — text index path removed)', async () => {
    await ExpenseService.getExpensesByDateRange(START, END, {
      searchTerm: 'beef',
    });
    expect(lastQuery().$text).toBeUndefined();
  });

  it('returns the mocked result set through the populate.sort.lean chain', async () => {
    const seeded = [{ _id: 'x', description: 'Beef' }];
    mockLean.mockResolvedValue(seeded);
    const result = await ExpenseService.getExpensesByDateRange(START, END);
    expect(result).toEqual(seeded);
  });
});
