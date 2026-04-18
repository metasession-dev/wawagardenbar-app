/**
 * @requirement REQ-029 - Expand expense search to include receipt reference, notes, and amount
 *
 * Unit tests for pure helpers in lib/expense-search.ts. These are the single source
 * of truth for the searchable field list, regex escape rule, and numeric-term rule
 * that the server query builder and client-side filter both consume.
 */
import { describe, it, expect } from 'vitest';
import {
  SEARCHABLE_STRING_FIELDS,
  escapeRegex,
  parseNumericTerm,
  matchesExpenseSearch,
} from '@/lib/expense-search';

// ── SEARCHABLE_STRING_FIELDS ──────────────────────────────────────────────────

describe('REQ-029: SEARCHABLE_STRING_FIELDS', () => {
  it('covers the five fields agreed in the implementation plan', () => {
    expect(SEARCHABLE_STRING_FIELDS).toEqual([
      'description',
      'notes',
      'supplier',
      'receiptReference',
      'referenceNumber',
    ]);
  });
});

// ── escapeRegex ───────────────────────────────────────────────────────────────

describe('REQ-029: escapeRegex', () => {
  it('escapes the pipe character (the TRF driver case)', () => {
    expect(escapeRegex('TRF|2MPTfr482|2045529935434317824')).toBe(
      'TRF\\|2MPTfr482\\|2045529935434317824'
    );
    // and the result is a safe RegExp input
    expect(
      () => new RegExp(escapeRegex('TRF|2MPTfr482|2045529935434317824'))
    ).not.toThrow();
  });

  it('escapes dot, asterisk, plus, question mark, caret, dollar', () => {
    expect(escapeRegex('.')).toBe('\\.');
    expect(escapeRegex('*')).toBe('\\*');
    expect(escapeRegex('+')).toBe('\\+');
    expect(escapeRegex('?')).toBe('\\?');
    expect(escapeRegex('^')).toBe('\\^');
    expect(escapeRegex('$')).toBe('\\$');
  });

  it('escapes brackets, braces, parentheses, and backslash', () => {
    expect(escapeRegex('[')).toBe('\\[');
    expect(escapeRegex(']')).toBe('\\]');
    expect(escapeRegex('{')).toBe('\\{');
    expect(escapeRegex('}')).toBe('\\}');
    expect(escapeRegex('(')).toBe('\\(');
    expect(escapeRegex(')')).toBe('\\)');
    expect(escapeRegex('\\')).toBe('\\\\');
  });

  it('returns empty string unchanged', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('leaves plain alphanumerics untouched', () => {
    expect(escapeRegex('Beef 1kg')).toBe('Beef 1kg');
  });

  it('produces a regex that matches literal "a.b" but not "axb"', () => {
    const re = new RegExp(escapeRegex('a.b'), 'i');
    expect(re.test('a.b')).toBe(true);
    expect(re.test('axb')).toBe(false);
  });
});

// ── parseNumericTerm ──────────────────────────────────────────────────────────

describe('REQ-029: parseNumericTerm', () => {
  it('returns the number for an integer string', () => {
    expect(parseNumericTerm('150')).toBe(150);
  });

  it('returns the number for a decimal string', () => {
    expect(parseNumericTerm('12.5')).toBe(12.5);
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(parseNumericTerm('  42  ')).toBe(42);
  });

  it('returns null for a pure alpha string', () => {
    expect(parseNumericTerm('abc')).toBeNull();
  });

  it('returns null for a partial-numeric string like "12abc"', () => {
    expect(parseNumericTerm('12abc')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseNumericTerm('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseNumericTerm('   ')).toBeNull();
  });

  it('returns null for the string "Infinity" (must be finite)', () => {
    expect(parseNumericTerm('Infinity')).toBeNull();
  });

  it('returns null for the string "NaN"', () => {
    expect(parseNumericTerm('NaN')).toBeNull();
  });

  it('allows negative numbers (amounts are non-negative but parser stays general)', () => {
    expect(parseNumericTerm('-5')).toBe(-5);
  });
});

// ── matchesExpenseSearch ──────────────────────────────────────────────────────

type SearchableExpense = {
  description?: string;
  notes?: string;
  supplier?: string;
  receiptReference?: string;
  referenceNumber?: string;
  amount?: number;
};

function makeExpense(
  overrides: Partial<SearchableExpense> = {}
): SearchableExpense {
  return {
    description: 'Beef 1kg',
    notes: undefined,
    supplier: undefined,
    receiptReference: undefined,
    referenceNumber: undefined,
    amount: 1000,
    ...overrides,
  };
}

describe('REQ-029: matchesExpenseSearch', () => {
  it('matches on description substring, case-insensitive', () => {
    expect(
      matchesExpenseSearch(makeExpense({ description: 'Beef 1kg' }), 'beef')
    ).toBe(true);
  });

  it('matches on notes substring', () => {
    expect(
      matchesExpenseSearch(
        makeExpense({ notes: 'Urgent procurement from vendor A' }),
        'vendor'
      )
    ).toBe(true);
  });

  it('matches on supplier substring', () => {
    expect(
      matchesExpenseSearch(
        makeExpense({ supplier: 'Kano Fresh Foods' }),
        'kano'
      )
    ).toBe(true);
  });

  it('matches on receiptReference substring', () => {
    expect(
      matchesExpenseSearch(
        makeExpense({ receiptReference: 'TRF|2MPTfr482|2045529935434317824' }),
        '2MPTfr482'
      )
    ).toBe(true);
  });

  it('matches on referenceNumber substring', () => {
    expect(
      matchesExpenseSearch(
        makeExpense({ referenceNumber: 'INV-2026-00042' }),
        '2026-00042'
      )
    ).toBe(true);
  });

  it('matches the full TRF reference containing pipes (the driver case)', () => {
    const ref = 'TRF|2MPTfr482|2045529935434317824';
    expect(
      matchesExpenseSearch(makeExpense({ receiptReference: ref }), ref)
    ).toBe(true);
  });

  it('does not match when the substring is absent from every field', () => {
    expect(
      matchesExpenseSearch(
        makeExpense({ description: 'Beef', notes: 'urgent', supplier: 'Kano' }),
        'goat'
      )
    ).toBe(false);
  });

  it('matches when term equals amount exactly', () => {
    expect(matchesExpenseSearch(makeExpense({ amount: 15000 }), '15000')).toBe(
      true
    );
  });

  it('does not match on amount when term is a prefix like "12" of 120.50', () => {
    expect(matchesExpenseSearch(makeExpense({ amount: 120.5 }), '12')).toBe(
      false
    );
  });

  it('matches decimals exactly', () => {
    expect(matchesExpenseSearch(makeExpense({ amount: 12.5 }), '12.5')).toBe(
      true
    );
  });

  it('returns true for empty term (no filter applied)', () => {
    expect(matchesExpenseSearch(makeExpense(), '')).toBe(true);
  });

  it('returns true for whitespace-only term (no filter applied)', () => {
    expect(matchesExpenseSearch(makeExpense(), '   ')).toBe(true);
  });

  it('treats missing optional fields as non-matches, not errors', () => {
    expect(() =>
      matchesExpenseSearch(
        makeExpense({ notes: undefined, supplier: undefined }),
        'x'
      )
    ).not.toThrow();
    expect(
      matchesExpenseSearch(
        makeExpense({
          description: 'Beef',
          notes: undefined,
          supplier: undefined,
          receiptReference: undefined,
          referenceNumber: undefined,
        }),
        'xyz'
      )
    ).toBe(false);
  });

  it('respects regex-special characters literally (no implicit regex in term)', () => {
    // If the implementation naively built a RegExp from the term, "a.b" would
    // match "axb". It must not.
    expect(
      matchesExpenseSearch(makeExpense({ description: 'axb' }), 'a.b')
    ).toBe(false);
    expect(
      matchesExpenseSearch(makeExpense({ description: 'a.b' }), 'a.b')
    ).toBe(true);
  });
});
