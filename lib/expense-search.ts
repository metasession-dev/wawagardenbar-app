/**
 * @requirement REQ-029 - Expand expense search to include receipt reference,
 * notes, and amount
 *
 * Single source of truth for the expense-search contract:
 * - SEARCHABLE_STRING_FIELDS: the ordered list of string fields a search term
 *   is matched against (server regex $or + client includes()).
 * - escapeRegex / parseNumericTerm: term-processing rules shared by both
 *   runtimes.
 * - matchesExpenseSearch: the client-side predicate.
 *
 * The server query builder (services/expense-service.ts) uses the field list,
 * escapeRegex, and parseNumericTerm to construct a Mongo query. The client-side
 * list (components/features/finance/expense-list.tsx) calls matchesExpenseSearch
 * directly. Keeping the rules here means the two runtimes cannot drift silently.
 */

export const SEARCHABLE_STRING_FIELDS = [
  'description',
  'notes',
  'supplier',
  'receiptReference',
  'referenceNumber',
] as const;

export type SearchableStringField = (typeof SEARCHABLE_STRING_FIELDS)[number];

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(term: string): string {
  return term.replace(REGEX_SPECIAL_CHARS, '\\$&');
}

/**
 * Build a case-insensitive RegExp that matches the term as a literal
 * substring. Metacharacters are escaped first, so the resulting pattern has
 * no alternations, quantifiers, or groups — ReDoS is not possible.
 */
export function buildLiteralSearchRegex(term: string): RegExp {
  // escapeRegex() strips every regex metacharacter (., *, +, ?, ^, $, {, }, (,
  // ), |, [, ], \) — so the compiled pattern is a literal substring with no
  // alternations, quantifiers, or groups. ReDoS is not possible here.
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  return new RegExp(escapeRegex(term), 'i');
}

/**
 * Parse a search term as a finite number only when the trimmed term is a pure
 * numeric literal. Returns null otherwise — including "Infinity" and "NaN".
 */
export function parseNumericTerm(term: string): number | null {
  const trimmed = term.trim();
  if (trimmed === '') return null;
  // Number('') === 0, Number('12abc') === NaN, Number('Infinity') === Infinity.
  // Reject non-finite to rule out 'Infinity' / 'NaN' literals.
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  // Guard against Number() accepting things like leading-whitespace we'd already
  // trimmed, but also against empty-string-interpreted-as-0. Re-check:
  // If the numeric string loses information when round-tripped (e.g. "12abc"),
  // Number() returns NaN — already handled. But Number('  ') is 0, handled
  // above by the empty trim check.
  return n;
}

type SearchableExpense = {
  description?: string | null;
  notes?: string | null;
  supplier?: string | null;
  receiptReference?: string | null;
  referenceNumber?: string | null;
  amount?: number | null;
};

/**
 * JS predicate used by the client-side expense list. Returns true when the
 * term is empty/whitespace (no filter applied), or when the term is a literal
 * substring of any searchable string field (case-insensitive), or when the
 * term parses to a finite number that exactly equals the expense amount.
 */
export function matchesExpenseSearch(
  expense: SearchableExpense,
  term: string
): boolean {
  const trimmed = term.trim();
  if (trimmed === '') return true;

  const needle = trimmed.toLowerCase();
  for (const field of SEARCHABLE_STRING_FIELDS) {
    const value = expense[field];
    if (typeof value === 'string' && value.toLowerCase().includes(needle)) {
      return true;
    }
  }

  const numeric = parseNumericTerm(trimmed);
  if (
    numeric !== null &&
    typeof expense.amount === 'number' &&
    expense.amount === numeric
  ) {
    return true;
  }

  return false;
}
