# REQ-029 — Test Scope

**Issue:** #64
**Risk:** HIGH
**Branch:** `develop`

Derived from `implementation-plan.md`. Defines WHAT must be verified. The concrete test files and cases are mapped in `test-plan.md`.

## In scope

- Server-side `ExpenseService.getExpensesByDateRange` query behaviour when `filters.searchTerm` is provided.
- Client-side `ExpenseList` `matchesSearch` predicate.
- Regex-escape safety for user-supplied search terms.
- Numeric `amount` exact-match branch (server and client).
- Composition of search with existing `expenseType`, `category`, and date-range filters.

## Out of scope

- The "widen date range" UX hint (deferred to a follow-up REQ).
- Dropping the `description + notes` text index (schema migration, separate change).
- Adding new indexes on `receiptReference` or `referenceNumber`.
- Any change to the shape of results returned by `/dashboard/finance/expenses` outside of which rows match.
- Authorisation / RBAC — unchanged by this REQ (still super-admin and manager only per existing action).

## Acceptance criteria

### AC1 — Transfer-reference lookup (the driver)

Given an expense exists with `receiptReference = "TRF|2MPTfr482|2045529935434317824"` and its `date` falls within the queried range, when the user pastes that exact string into the search box and submits, the result set includes that expense.

**Why it matters:** this is the specific user-reported failure. The pipe character in the reference is the reason `$text` never worked and is the reason regex escape is mandatory.

### AC2 — Partial-substring match across new fields

For each of `receiptReference`, `referenceNumber`, `supplier`, `notes`, a case-insensitive substring of the stored value returns the expense. Non-matching substrings return no match on that field path.

### AC3 — Numeric amount exact match

When the trimmed search term parses to a finite number via `Number()`:

- AC3.1: an expense whose `amount` equals that number is returned.
- AC3.2: an expense whose `amount` differs (including partial-digit cases like term `"12"` vs stored `120.50`) is NOT returned via the amount path.
- AC3.3: a non-numeric term does not add an `amount` clause to the query.

### AC4 — Regex-special-character safety

Given a search term containing any of `. * + ? ^ $ { } ( ) | [ ] \`:

- AC4.1: the query does not throw.
- AC4.2: matches are literal substring matches on the escaped term — e.g. term `"a.b"` matches stored `"a.b"` but NOT stored `"axb"`.

### AC5 — Empty / whitespace search term

A missing, empty-string, or whitespace-only `searchTerm`:

- AC5.1: does not add any search clause to the Mongo query.
- AC5.2: returns the same rows as a query with no `searchTerm` at all (full date-range result).

### AC6 — Composition with existing filters

Search combines correctly with:

- AC6.1: `expenseType` (AND semantics — row must satisfy type AND match search).
- AC6.2: `category` (AND semantics).
- AC6.3: date range (AND semantics — row must be in range AND match search).

### AC7 — Client / server parity

For a given loaded page of expenses and a given search term, the rows displayed by the client-side `matchesSearch` filter are the same rows that would be returned by a fresh `getExpensesByDateRange` call with that term (scoped to the same `_id` set).

**Why it matters:** users expect the in-page refine filter to behave identically to a fresh search. Drift here is the most likely regression.

### AC8 — No unintended behaviour change for default view

With no search term entered, the expenses page renders the same rows, in the same order (`date: -1, createdAt: -1`), as before the change. No filter composition, no sort change, no pagination change.

### AC9 — Regression: existing tests still pass

All pre-existing tests under `services/__tests__/` and `components/features/finance/__tests__/` remain green with no modifications unrelated to this REQ.

## Risk-specific verification

- **Injection / ReDoS:** AC4 covers functional safety; `semgrep scan --config auto` must report 0 high/critical on the changed files.
- **Performance:** measure wall-clock of `getExpensesByDateRange` against a realistic UAT dataset with term present vs absent; record in `security-summary.md`. Concern threshold: sustained >500ms.
- **Data exposure:** no new fields returned to the client. Search only changes which rows match, not what is rendered per row.

## Environments

- Unit tests: local + CI.
- E2E: local against dev server + CI Playwright job.
- Manual UAT: verify on META-ATS UAT deploy after CI green — paste a real TRF reference, confirm row appears.

## Exit criteria

All ACs pass, all four gates green (`tsc`, `semgrep`, `npm audit`, `vitest`, `playwright`), CI green on `develop`, and UAT verification recorded before any PR to `main`.
