# REQ-029 — Implementation Plan

**Issue:** #64
**Risk:** HIGH (MEDIUM baseline — user-facing finance query — with AI-involvement +1 bump)
**Branch:** `develop`

## Problem

`app/dashboard/finance/expenses` exposes a search box that only matches `description`, `category`, and `supplier` on already-loaded rows (client-side filter at `components/features/finance/expense-list.tsx:90-103`). The server-side query (`services/expense-service.ts:103-105`) uses `$text: { $search }` against a Mongo text index that only covers `description` + `notes` (`models/expense-model.ts:81`).

Consequence: an expense cannot be found by its transfer reference (e.g. `TRF|2MPTfr482|2045529935434317824`), even though that value is stored on the document in `receiptReference`. The reference also contains `|`, which the MongoDB text tokenizer treats as a separator — so even if `receiptReference` were added to the text index, a full-reference paste would not match as a single token.

## Approach

Replace the server-side `$text` clause with a regex-based `$or` across a wider, explicit field set. Mirror the same fields on the client-side filter so results stay consistent whether the user searches after load or triggers a fresh fetch.

### Server-side (`services/expense-service.ts`)

Change `getExpensesByDateRange` so that when `filters.searchTerm` is provided:

1. Trim + short-circuit empty string (no search clause added).
2. Escape the term for safe use inside `RegExp` (handles `.`, `|`, `(`, etc. — `|` is the specific character in TRF references).
3. Build an `$or` covering:
   - `description` — case-insensitive regex
   - `notes` — case-insensitive regex
   - `supplier` — case-insensitive regex
   - `receiptReference` — case-insensitive regex
   - `referenceNumber` — case-insensitive regex
4. If the trimmed term parses as a finite number via `Number(term)` and `!Number.isNaN`, add `{ amount: <num> }` as an additional `$or` branch (exact match only — no range matching, to keep predictable behaviour).
5. Leave date-range, `expenseType`, `category` filters unchanged.

Implementation details:

- Add a small local helper `escapeRegex(s: string): string` at the top of `expense-service.ts` (return `s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`). No third-party dep.
- The existing text index (`description + notes`) is no longer used by this query path; leave it in the schema for now (removing it is a separate change and could affect unrelated code — grep shows no other `$text` usage on `ExpenseModel`, but a migration to drop the index is out of scope for this REQ).
- No new Mongo indexes added. All queries remain bounded by the `date` range (which IS indexed — `models/expense-model.ts:9,75`), so the regex clauses run against a small candidate set. Performance note will be captured in `security-summary.md`.

### Client-side (`components/features/finance/expense-list.tsx`)

Extend `matchesSearch` (lines 90-103) to the same field set. Pattern: one `toLowerCase().includes()` per string field + numeric-amount equality when the term parses to a number. The `Expense` interface at lines 52-68 already includes `receiptReference`; add `referenceNumber` and `notes` to that interface (they exist on `IExpense` but aren't passed through the current shape).

No visual changes to the search box itself. Optional (if straightforward): update the placeholder text from `"Search expenses..."` to `"Search description, supplier, reference..."` so the expanded scope is discoverable. Defer if it causes any i18n/string-catalogue churn.

### Files touched

| File                                                                          | Change                                                                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `services/expense-service.ts`                                                 | Replace `$text` clause with regex `$or`; add `escapeRegex` helper; add `@requirement REQ-029` JSDoc on `getExpensesByDateRange`  |
| `components/features/finance/expense-list.tsx`                                | Extend `matchesSearch`; extend local `Expense` interface to include `notes`, `referenceNumber`; add `@requirement REQ-029` JSDoc |
| `services/__tests__/expense-service.test.ts` (new or extend)                  | Unit tests for server search behaviour                                                                                           |
| `components/features/finance/__tests__/expense-list.test.tsx` (new or extend) | Unit tests for client filter parity                                                                                              |
| `e2e/expenses-search.spec.ts` (new)                                           | Playwright: paste TRF reference, expense appears                                                                                 |
| `compliance/RTM.md`                                                           | REQ-029 row already added (DRAFT → TESTED on push)                                                                               |

### Out of scope

- The "no results in this date range — try widening" UX hint from issue §3. Defer to a follow-up REQ; keeps this change tight and testable.
- Dropping the `description/notes` text index from the Expense schema. No other code uses it, but removing indexes is a schema migration that deserves its own change window.
- Adding an index on `receiptReference` or `referenceNumber`. Monitor query timing; add only if the `security-summary.md` flags it.

## Architecture decisions

**D1 — Regex `$or` over `$text`.** Chosen because the driver case (TRF reference containing `|`) cannot be handled by `$text` at all. Tradeoff: loses text-index stemming/language matching; gains predictable substring matching and reference lookup. Users pasting a reference expect literal substring behaviour, which `$text` never provided on this query path.

**D2 — Explicit field list, not "all string fields".** Avoids accidentally matching on internal fields (`createdBy` ObjectId serialised as string, `pendingGroupId`). Safer than a dynamic schema walk.

**D3 — Numeric amount match only on exact parse.** `Number("12.5") === 12.5` matches `amount: 12.5` exactly. No range semantics. Avoids confusing partial matches like `"12"` hitting `120.50`. Documented in test plan.

**D4 — Regex escape is mandatory.** Without it, a pasted TRF reference is a valid regex with alternations and would match wrong rows or throw. This is the single change that actually fixes the user-reported bug; the field expansion is the feature around it.

**D5 — Client filter mirrors server, but stays independent.** Client filter runs on the already-fetched page. Server filter is for fresh queries. Keeping them in sync is a discipline (unit-tested), not an abstraction — we deliberately do not extract a shared predicate because the runtimes (Mongo regex vs JS `includes`) have different semantics.

## Risks & mitigations

| Risk                                                        | Mitigation                                                                                                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regex injection / ReDoS via user input                      | `escapeRegex()` + anchor-free substring pattern; term length is bounded by the HTML input max.                                                                              |
| Performance regression on large ledgers                     | Queries remain date-bounded; regex runs over that candidate set only. Measurement captured in `security-summary.md`. Threshold for concern: >500ms on current prod dataset. |
| Behavioural surprise: results change for existing searchers | Document in release ticket; verify on UAT that default (no search) results are identical.                                                                                   |
| Client/server drift                                         | Unit tests cover parity explicitly for each field.                                                                                                                          |

## Acceptance criteria (detailed in `test-scope.md`)

AC1. Paste full TRF reference into search → expense returns (within its date range).
AC2. Partial `receiptReference`, `referenceNumber`, `supplier`, `notes` substring returns matches.
AC3. Numeric term equals `amount` value → expense returns; non-matching numeric term → no match on amount path.
AC4. Regex-special characters in search term do not throw and do not match unintended rows.
AC5. Empty / whitespace-only term behaves as "no search" (all rows for the date range).
AC6. Existing filters (`expenseType`, `category`, date range) compose correctly with the new search.
AC7. Client-side filter (in-page refine) returns the same rows as a server-side fetch with the same term, for the loaded page.

## AI involvement

Plan drafted by Claude (Opus 4.7). Implementation will be AI-authored; prompts logged in `compliance/evidence/REQ-029/ai-prompts.md`. Per HIGH-risk policy, requires a second human reviewer before merge to main.
