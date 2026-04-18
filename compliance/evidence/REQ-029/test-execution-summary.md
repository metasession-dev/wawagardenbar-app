# Test Execution Summary — REQ-029

**Date:** 2026-04-18
**Git SHA:** 192411e
**CI Run:** [24610513313](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24610513313)

## Gate Results

| Gate             | Result | Details                                                                                                                                                                                                                        |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript       | PASS   | 0 errors                                                                                                                                                                                                                       |
| SAST             | PASS   | 0 new findings. The single `detect-non-literal-regexp` pattern at `lib/expense-search.ts:buildLiteralSearchRegex` is suppressed inline with a ReDoS-safety justification (input is fully escape-stripped before `new RegExp`). |
| Dependency Audit | PASS   | 0 unaccepted high/critical (only pre-existing `xlsx` high, allowlisted in `ci.yml` via `ACCEPTED="xlsx"`)                                                                                                                      |
| E2E Tests        | PASS   | CI chromium suite passed                                                                                                                                                                                                       |
| Build            | PASS   | Production build succeeded                                                                                                                                                                                                     |

## Test Changes in This Release

**Added:**

- `lib/expense-search.ts` — pure helpers (`SEARCHABLE_STRING_FIELDS`, `escapeRegex`, `parseNumericTerm`, `matchesExpenseSearch`, `buildLiteralSearchRegex`) single-sourced across server query builder and client filter
- `__tests__/lib/expense-search.test.ts` — 31 unit tests over the four pure helpers
- `__tests__/services/expense-service.search.test.ts` — 14 unit tests asserting the Mongo query object shape produced by `getExpensesByDateRange` under all search-term conditions
- `e2e/expenses-search.spec.ts` — 5 Playwright E2E tests (placeholder visibility, regex-special-term safety, unique-nonsense empty state, clear-restores-list, numeric term)

**Updated:**

- `services/expense-service.ts` — `getExpensesByDateRange` replaces `$text: { $search }` clause with regex `$or` across `description`, `notes`, `supplier`, `receiptReference`, `referenceNumber`, plus exact-amount branch when the term is a finite number; adds `@requirement REQ-029` JSDoc
- `components/features/finance/expense-list.tsx` — `matchesSearch` now delegates to shared `matchesExpenseSearch` helper; local `Expense` interface extended with `notes` + `referenceNumber`; placeholder updated to `"Search description, supplier, reference, amount..."`
- `compliance/RTM.md` — REQ-029 row added (DRAFT → TESTED - PENDING SIGN-OFF)

**Removed:**

- No files removed. The Mongo text index on `description + notes` remains in `models/expense-model.ts` (unused by the new query path but kept — dropping it is a separate schema-migration concern, explicitly out of scope per `implementation-plan.md`)

## Test Plan Coverage

| Acceptance Criterion                                                                          | Status | Test                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — Literal TRF reference (with pipes) matches its expense                                  | PASS   | `expense-search.test.ts::matchesExpenseSearch > matches the full TRF reference containing pipes`; `expense-service.search.test.ts > escapes pipes so TRF\|... matches the literal pipe` |
| AC2 — Partial substring match on `receiptReference`                                           | PASS   | `expense-search.test.ts::matchesExpenseSearch > matches on receiptReference substring`                                                                                                  |
| AC2 — Partial substring match on `referenceNumber`                                            | PASS   | `expense-search.test.ts::matchesExpenseSearch > matches on referenceNumber substring`                                                                                                   |
| AC2 — Partial substring match on `notes`                                                      | PASS   | `expense-search.test.ts::matchesExpenseSearch > matches on notes substring`                                                                                                             |
| AC2 — Partial substring match on `supplier`                                                   | PASS   | `expense-search.test.ts::matchesExpenseSearch > matches on supplier substring`                                                                                                          |
| AC2 — Server `$or` covers the five string fields                                              | PASS   | `expense-service.search.test.ts > builds a regex $or across the five string fields`                                                                                                     |
| AC3.1 — Numeric term equal to `amount` matches                                                | PASS   | `expense-search.test.ts::matchesExpenseSearch > matches when term equals amount exactly`; `expense-service.search.test.ts > adds { amount: n } branch`                                  |
| AC3.2 — Numeric prefix "12" does NOT match amount 120.50 via amount path                      | PASS   | `expense-search.test.ts::matchesExpenseSearch > does not match on amount when term is a prefix like "12" of 120.50`                                                                     |
| AC3.3 — Non-numeric and partial-numeric terms do not add amount branch                        | PASS   | `expense-service.search.test.ts > does NOT add amount branch when term is partial-numeric "12abc"`; `> does NOT add amount branch when term is non-numeric`                             |
| AC4 — Regex-special characters escaped (pipe, dot, brackets, etc.)                            | PASS   | `expense-search.test.ts::escapeRegex` suite (6 tests); `expense-service.search.test.ts > escapes dot so "a.b" becomes the literal pattern`                                              |
| AC5 — Empty/whitespace term adds no search clause (server)                                    | PASS   | `expense-service.search.test.ts > includes only date range when searchTerm is absent/empty/whitespace` (3 tests)                                                                        |
| AC5 — Empty/whitespace term matches all expenses (client predicate)                           | PASS   | `expense-search.test.ts::matchesExpenseSearch > returns true for empty term`; `> returns true for whitespace-only term`                                                                 |
| AC6.1 — Search composes with `expenseType` filter                                             | PASS   | `expense-service.search.test.ts > composes search with expenseType filter`                                                                                                              |
| AC6.2 — Search composes with `category` filter                                                | PASS   | `expense-service.search.test.ts > composes search with category filter`                                                                                                                 |
| AC6.3 — Date range preserved when search present                                              | PASS   | `expense-service.search.test.ts > preserves date range when search present`                                                                                                             |
| AC7 — Client/server parity via single-sourced `SEARCHABLE_STRING_FIELDS` + `parseNumericTerm` | PASS   | Contract: same field list and numeric rule driving both runtimes; covered by all AC2/AC3 tests on both test files                                                                       |
| AC8 — No unintended behaviour change for default view                                         | PASS   | `expense-service.search.test.ts > includes only date range when searchTerm is absent`; E2E `clearing the search restores the full date-range list`                                      |
| AC9 — Regression: pre-existing 309 tests still pass                                           | PASS   | Full vitest run: 354 passed / 0 failed (was 309 before this REQ → 354 = 309 + 45 new)                                                                                                   |
| D1 — Regex `$or` replaces `$text` (text-index path removed)                                   | PASS   | `expense-service.search.test.ts > does NOT use $text anywhere`                                                                                                                          |

## Evidence Locations

| Evidence          | Location                                                               |
| ----------------- | ---------------------------------------------------------------------- |
| E2E results       | META-COMPLY: wawagardenbar-app/\_compliance-docs/e2e-results.json      |
| SAST results      | META-COMPLY: wawagardenbar-app/\_compliance-docs/sast-results.json     |
| Dependency audit  | META-COMPLY: wawagardenbar-app/\_compliance-docs/dependency-audit.json |
| Playwright report | CI artifact: playwright-report/                                        |

## Full Test-Suite Regression Check

Local vitest: **354 passed / 0 failed** across 26 files. The 45 new REQ-029 tests (31 lib + 14 service) added cleanly without touching pre-existing suites. `lib/expense-search.ts` is a new module — no risk of breaking unrelated consumers.

Local playwright not executed (requires dev server + auth fixtures); CI chromium suite green.

TypeScript: 0 errors. Semgrep (auto config, 202 rules): 0 findings on the three changed source files.
