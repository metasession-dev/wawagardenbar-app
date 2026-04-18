# REQ-029 — Test Plan

**Issue:** #64
**Risk:** HIGH
**Branch:** `develop`

Maps each acceptance criterion in `test-scope.md` to concrete test files and cases. Unit tests are TDD and MUST be written before implementation. E2E tests are written against the working implementation.

## Testing approach

The existing project pattern (see `__tests__/services/system-settings-service.expense-categories.test.ts`, `__tests__/pending-expense-group/pending-expense-group-service.test.ts`) favours **pure unit tests of extracted helpers** with `@/lib/mongodb` and the model mocked. We will follow that pattern.

Therefore, before writing tests, the implementation plan is refined to extract a small shared module:

- **New file:** `lib/expense-search.ts` — exports:
  - `SEARCHABLE_STRING_FIELDS` — the ordered list of string field names (`description`, `notes`, `supplier`, `receiptReference`, `referenceNumber`)
  - `escapeRegex(term: string): string`
  - `parseNumericTerm(term: string): number | null` — returns the parsed number only when `term.trim()` is purely numeric
  - `matchesExpenseSearch(expense, term): boolean` — JS-side predicate used by the client

The server consumes `SEARCHABLE_STRING_FIELDS`, `escapeRegex`, and `parseNumericTerm` to build its Mongo query. The client consumes `matchesExpenseSearch` directly. This keeps the field list and numeric-match contract single-sourced without coupling the runtimes (D5 stands).

## Test files

| Status    | Path                                                | Purpose                                                                                                                                                                                                                |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NEW       | `__tests__/lib/expense-search.test.ts`              | Pure unit tests for helpers — AC2, AC3, AC4, AC5, AC7                                                                                                                                                                  |
| NEW       | `__tests__/services/expense-service.search.test.ts` | Mocked-model unit test for `getExpensesByDateRange` query shape — AC1 (server path), AC3 (server), AC4 (server), AC5 (server), AC6 (composition), AC8 (no-term), AC9 (regression of existing behaviour on this method) |
| NEW       | `e2e/expenses-search.spec.ts`                       | Playwright E2E — AC1 driver end-to-end, AC6 combined with a category filter                                                                                                                                            |
| UNCHANGED | all other existing unit and E2E spec files          | Regression — must remain green                                                                                                                                                                                         |

## Unit tests (Phase 1 — TDD, before implementation)

### `__tests__/lib/expense-search.test.ts`

```
describe('REQ-029: escapeRegex')
  it('escapes pipe character (the TRF driver)')                   // AC4
  it('escapes dot, asterisk, plus, question mark, caret, dollar') // AC4
  it('escapes brackets, braces, parentheses, backslash')          // AC4
  it('returns empty string unchanged')                            // AC5

describe('REQ-029: parseNumericTerm')
  it('returns the number for "150"')                              // AC3.1
  it('returns 12.5 for "12.5"')                                   // AC3.1
  it('returns null for "abc"')                                    // AC3.3
  it('returns null for "12abc"')                                  // AC3.3
  it('returns null for empty / whitespace')                       // AC3.3, AC5
  it('returns null for "Infinity" and "NaN" literals')            // AC3.3 (finite only)

describe('REQ-029: matchesExpenseSearch')
  it('matches on description substring, case-insensitive')        // AC2
  it('matches on notes substring')                                // AC2
  it('matches on supplier substring')                             // AC2
  it('matches on receiptReference substring')                     // AC2
  it('matches on referenceNumber substring')                      // AC2
  it('matches full TRF reference containing pipes')               // AC1 (client side)
  it('does not match when substring absent from any field')       // AC2
  it('matches when term equals amount exactly')                   // AC3.1
  it('does not match when term "12" is a prefix of amount 120.50') // AC3.2
  it('returns true for empty / whitespace term (no filter)')      // AC5
  it('returns true for whitespace-only term')                     // AC5
  it('treats missing optional fields (notes/supplier) as non-matches, not errors') // robustness
```

### `__tests__/services/expense-service.search.test.ts`

Mocks `@/lib/mongodb` and `@/models/expense-model` following the existing pattern. Uses a spy on `ExpenseModel.find` to capture the query object passed. Does not exercise real Mongo.

```
describe('REQ-029: getExpensesByDateRange search query shape')
  it('includes only date range when searchTerm is absent')                 // AC5, AC8
  it('includes only date range when searchTerm is empty string')           // AC5
  it('includes only date range when searchTerm is whitespace')             // AC5
  it('builds regex $or across the five string fields for a plain term')    // AC2
  it('escapes pipes so TRF|... matches literal pipe not alternation')      // AC1, AC4
  it('escapes dot so "a.b" becomes the literal /a\\.b/i pattern')          // AC4
  it('adds { amount: n } branch when term parses numeric')                 // AC3.1
  it('does NOT add amount branch when term is partial-numeric "12abc"')    // AC3.3
  it('composes search with expenseType filter (both present in query)')    // AC6.1
  it('composes search with category filter (both present in query)')       // AC6.2
  it('preserves date range when search present')                           // AC6.3
  it('does NOT call $text anywhere (text index path removed)')             // D1 / regression
  it('returns the mocked result set through .populate.sort.lean chain')    // AC9 (no chain break)
```

## E2E tests (Phase 3 — after implementation)

### `e2e/expenses-search.spec.ts`

Seeds the database with three expenses in the current month via API or direct service call (matching the seeding pattern in `e2e/pending-expenses.spec.ts`):

1. Expense A — `receiptReference: "TRF|2MPTfr482|2045529935434317824"`, `amount: 15000`, `category: "Meat/Protein"`.
2. Expense B — plain expense, no receipt reference, `category: "Drinks"`.
3. Expense C — different receipt reference, same category as A.

```
test.describe('REQ-029: Expenses search — extended fields')
  test('paste full TRF reference — only matching expense shown')   // AC1
  test('partial receipt reference substring narrows to matches')   // AC2
  test('numeric search term matches amount exactly')               // AC3.1
  test('typing a regex-special term does not break the page')      // AC4
  test('clearing search restores full date-range list')            // AC5
  test('search + category filter compose (AND)')                   // AC6.2
```

A single Playwright file, auth via the existing `auth.setup.ts`.

## Mapping AC → tests (traceability)

| AC    | Unit (lib)                              | Unit (service)                       | E2E                           |
| ----- | --------------------------------------- | ------------------------------------ | ----------------------------- |
| AC1   | matchesExpenseSearch TRF test           | escapes pipes test                   | paste full TRF reference      |
| AC2   | 5× field-specific `matches` tests       | regex $or across five fields test    | partial substring test        |
| AC3.1 | parseNumericTerm + amount match         | adds amount branch                   | numeric search term matches   |
| AC3.2 | "12" vs 120.50 test                     | (covered in service via parse path)  | —                             |
| AC3.3 | parseNumericTerm non-numeric / partial  | does NOT add amount branch           | —                             |
| AC4   | escapeRegex suite                       | escapes pipe/dot tests               | regex-special term test       |
| AC5   | empty/whitespace in both helpers        | 3× absent/empty/whitespace tests     | clearing search restores list |
| AC6   | —                                       | composes with expenseType + category | search + category compose     |
| AC7   | parity — the shared lib IS the contract | —                                    | —                             |
| AC8   | —                                       | includes only date range when absent | clearing search restores list |
| AC9   | —                                       | preserves populate.sort.lean chain   | full E2E regression           |

## Gates (Phase 4)

```
npx tsc --noEmit                    # 0 errors
semgrep scan --config auto src/     # 0 high/critical
npm audit --audit-level=high        # 0 vulnerabilities
npx vitest run                      # all pass (new + existing)
npx playwright test                 # all pass (new + existing)
```

Evidence captured per the SDLC workflow: vitest output, playwright report, semgrep JSON, audit JSON — uploaded to META-COMPLY. Markdown summary committed to `compliance/evidence/REQ-029/test-execution-summary.md` after CI green.

## Test authorship discipline

- Phase 1: the two unit test files above are written FIRST. They must initially fail against current `main` code (no `lib/expense-search.ts`, no regex `$or`). Commit them as `test: [REQ-029] ...` BEFORE any implementation commit.
- Phase 2: implementation is written until every unit test above is green.
- Phase 3: E2E file is written against the working implementation.
- Phase 4: all gates run locally, then push.

No implementation code is committed before the unit tests in Phase 1 exist.
