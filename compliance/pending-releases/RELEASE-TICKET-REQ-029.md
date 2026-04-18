# Release Ticket: REQ-029 — Expand expense search to cover receipt reference, notes, and amount

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-18
**Requirement ID:** REQ-029
**Risk Level:** HIGH (MEDIUM baseline — user-facing finance query — with AI-involvement +1)
**Issue:** #64
**PR:** _to be created after UAT verification_

---

## Summary

The search box on `/dashboard/finance/expenses` now matches across `description`, `notes`, `supplier`, `receiptReference`, and `referenceNumber`, plus an exact-match branch when the term is a finite number (compared against `amount`). The driver was an inability to locate a transferred expense by its TRF reference (`TRF|2MPTfr482|2045529935434317824`): the prior server query used `$text: { $search }` against a text index covering only `description` + `notes`, and MongoDB's text tokenizer splits on `|` — so even pasting the full reference never matched as a unit.

The fix replaces the `$text` clause with a regex `$or` built from an escaped literal substring pattern, single-sourced through a new `lib/expense-search.ts` module that both the server query builder and the client list filter consume.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** Planning docs, implementation, unit tests, E2E spec, and compliance artefacts
- **Human Reviewer of AI Code:** ostendo-io (pending)
- **Components Regenerated:** None
- **Prompt log:** `compliance/evidence/REQ-029/ai-prompts.md`

HIGH risk — requires a second human reviewer per the Review Policy (Risk-Tiered) before merge to main.

---

## Implementation Details

**Files Modified:**

- `services/expense-service.ts` — `getExpensesByDateRange` replaces `$text` clause with regex `$or` and numeric `amount` branch; consumes shared helpers; adds `@requirement REQ-029` JSDoc
- `components/features/finance/expense-list.tsx` — search predicate delegates to `matchesExpenseSearch`; local `Expense` interface extended with `notes` + `referenceNumber`; placeholder updated to `"Search description, supplier, reference, amount..."`
- `compliance/RTM.md` — REQ-029 row added (DRAFT → TESTED - PENDING SIGN-OFF)

**Files Created:**

- `lib/expense-search.ts` — `SEARCHABLE_STRING_FIELDS`, `escapeRegex`, `parseNumericTerm`, `matchesExpenseSearch`, `buildLiteralSearchRegex`
- `__tests__/lib/expense-search.test.ts` — 31 unit tests
- `__tests__/services/expense-service.search.test.ts` — 14 unit tests (mocked `ExpenseModel.find` query-shape assertions)
- `e2e/expenses-search.spec.ts` — 5 Playwright E2E tests

**Dependencies Added/Changed:**

- No dependency changes

---

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                                                                                    |
| ---------------- | ----- | ------ | ------ | ---------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | 45    | 45     | 0      | Git: `__tests__/lib/expense-search.test.ts`, `__tests__/services/expense-service.search.test.ts`     |
| E2E (Playwright) | 5     | 5      | 0      | Git: `e2e/expenses-search.spec.ts`                                                                   |
| CI (full suite)  | All   | All    | 0      | [CI Run #24610513313](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24610513313) |

Full local vitest: 354 passed / 0 failed (was 309 before this REQ → 354 = 309 + 45 new). No regressions.

---

## Security Evidence

| Check            | Result                                     | Evidence Location                                      |
| ---------------- | ------------------------------------------ | ------------------------------------------------------ |
| SAST             | 0 new findings                             | Git: `compliance/evidence/REQ-029/security-summary.md` |
| Dependency Audit | 0 new findings                             | Git: `compliance/evidence/REQ-029/security-summary.md` |
| Access Control   | PASS (unchanged)                           | Git: `compliance/evidence/REQ-029/security-summary.md` |
| Input Validation | PASS (regex escape + numeric-literal gate) | Git: `compliance/evidence/REQ-029/security-summary.md` |
| ReDoS analysis   | PASS (pattern is literal after escape)     | Git: `compliance/evidence/REQ-029/security-summary.md` |

---

## Acceptance Criteria

- [x] AC1 — Literal TRF reference with pipes matches its expense (unit + E2E)
- [x] AC2 — Partial-substring match on `receiptReference`, `referenceNumber`, `notes`, `supplier` (5 unit tests)
- [x] AC3 — Numeric term equal to `amount` matches; non-numeric / prefix / Infinity / NaN rejected
- [x] AC4 — Regex-special characters escaped; term `"a.b"` matches literal `"a.b"` but not `"axb"`
- [x] AC5 — Empty / whitespace term adds no search clause (server) and returns all rows (client)
- [x] AC6 — Composes with `expenseType`, `category`, date range (AND semantics)
- [x] AC7 — Client/server parity via shared `lib/expense-search.ts`
- [x] AC8 — Default view (no search term) unchanged
- [x] AC9 — Regression: 309 pre-existing tests still green

---

## Post-Deploy Actions

None required. No data migration. No feature flag. No cache invalidation. The change is a read-side refinement.

---

## Rollback Plan

Revert the merge commit on `main`. No data changes to undo. Search behaviour reverts to `$text`-only (which was the source of the original bug).

---

## UAT Verification

_Pending — to be performed against the UAT environment after compliance commit; results will be appended to `compliance/evidence/REQ-029/security-summary.md`._

**Planned checks:**

1. UAT health check: `GET /` → 200
2. UAT smoke test: `/dashboard/finance/expenses` loads and renders the default month's rows
3. Feature verification: paste `TRF|2MPTfr482|2045529935434317824` into the search box with the date range covering the expense's `date` → confirm the row appears
4. Regression: clear search → full list restored

---

## Reviewers

- [ ] Human reviewer #1 (required for HIGH risk)
- [ ] UAT sign-off
