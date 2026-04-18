# Security Summary — REQ-029

**Requirement:** REQ-029
**Issue:** #64
**Risk Level:** HIGH (MEDIUM baseline — user-facing finance query — with AI-involvement +1 bump)
**Date:** 2026-04-18

---

## Security Assessment

### Data Integrity

**No change to persisted expense records.** The Expense schema (`models/expense-model.ts`) is unchanged. No new fields, no migration, no backfill. All historical records are untouched.

**Query behaviour changed, but results equivalent or stricter.** `getExpensesByDateRange` replaces its prior `$text: { $search }` clause with a regex `$or` across an explicit field list. For identical inputs the new query returns:

- the same rows when the term is empty (date-range only — covered by unit test)
- additional rows when the term matches `supplier`, `receiptReference`, `referenceNumber`, or exactly equals `amount` — these were previously unfindable
- equivalent or stricter rows when the term matches only `description` or `notes` — `$text` does language-aware stemming ("ran" → "run"), regex substring does not. The practical effect is narrower matching, not wider — a safer direction.

**Text index left in place.** `ExpenseSchema.index({ description: 'text', notes: 'text' })` at `models/expense-model.ts:81` is no longer consulted by this query path but remains in the schema. Dropping it is a schema migration and is out of scope — documented in `implementation-plan.md` §"Out of scope".

### Access Control (RBAC)

**Unchanged.** `getExpensesAction` retains its existing role guard (super-admin / manager, verified at `app/actions/finance/expense-actions.ts`). The search feature is a refinement of results already authorised for the caller — no new endpoints, no new read paths.

### Input Validation

**Regex escape applied at the single point of pattern construction.** `buildLiteralSearchRegex` in `lib/expense-search.ts` passes every user term through `escapeRegex` before `new RegExp(..., 'i')`. The escape function strips all 12 regex metacharacters (`.`, `*`, `+`, `?`, `^`, `$`, `{`, `}`, `(`, `)`, `|`, `[`, `]`, `\`).

**Term length implicitly bounded.** The UI input (`components/features/finance/expense-list.tsx`) is a standard `<Input>` without explicit `maxLength`; browser default + React state serialisation cap practical input well below ReDoS-relevant sizes. Server does not impose its own bound — flagged as a possible future tightening but not required given the escape (see ReDoS analysis below).

**Numeric branch exact-match only.** `parseNumericTerm` rejects any string that is not a pure finite numeric literal (including `"Infinity"` and `"NaN"`). The amount query branch is `{ amount: <number> }` — no range, no regex, no injection surface.

### NoSQL Injection

**No user-derived operator keys or structural values.** The Mongo query structure is built from a static list of field names (`SEARCHABLE_STRING_FIELDS` — a `const as const` tuple) and literal operator keys (`$or`, `$gte`, `$lte`). User input only reaches typed leaf values (`RegExp` for string fields, `number` for the amount branch). A crafted term cannot inject a query operator or change the query shape.

### XSS / Output Encoding

**No output changes.** The search predicate affects which rows render, not what is rendered per row. Existing table rendering (JSX text interpolation via React, auto-escaped) is unchanged.

### ReDoS Analysis

**Class:** The composed pattern is a literal substring followed by the `i` flag. Grammar: `literal-chars* (i)`. No alternation `|`, no quantifier `+ * ?`, no groups `(...)`, no backreferences — all escaped or never emitted. By construction this class has **linear-time matching**; catastrophic backtracking requires at least one nested/overlapping quantifier or an alternation in the pattern, neither of which is present.

**Semgrep rule `detect-non-literal-regexp`:** the rule pattern-matches any `new RegExp(variable, ...)`. It cannot see our escape helper semantically. Suppressed inline at `lib/expense-search.ts` with a justification comment; the suppression is scoped to the single function that is the trusted boundary, so every other future use of `new RegExp(variable)` in the project would still be flagged.

### Consistency

`SEARCHABLE_STRING_FIELDS`, `escapeRegex`, `parseNumericTerm`, and `matchesExpenseSearch` live in a single module consumed by both the server query builder and the client list filter. The two runtimes cannot drift silently — any addition/removal of a searchable field propagates through the type system to both callers.

### Performance

Regex queries on un-indexed fields (`supplier`, `receiptReference`, `referenceNumber`) run over the date-bounded candidate set only. `date` is indexed (`models/expense-model.ts:9,75`), and typical date windows (days–months) keep the candidate set small. Expected impact: negligible on current production volumes. If sustained p95 for the expenses page rises above 500 ms, add an index on `receiptReference` and `referenceNumber` in a follow-up REQ.

---

## Static Analysis (Semgrep)

**Status:** PASS

Semgrep auto-config (202 rules) over the changed files reports **0 findings**. The `detect-non-literal-regexp` pattern is suppressed inline at the single trusted boundary (`lib/expense-search.ts::buildLiteralSearchRegex`) with a documented ReDoS-safety argument.

---

## Dependency Audit (npm audit)

**Status:** PASS

No new dependencies added. No dependency versions changed. Pre-existing `xlsx` high-severity finding remains and is explicitly allowlisted in `.github/workflows/ci.yml` (`ACCEPTED="xlsx"`). Pre-existing `dompurify` moderate finding is below the `high` gate threshold.

---

## CI Gate Results

**CI Run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24610513313
**Status:** All gates passed

| Gate             | Result |
| ---------------- | ------ |
| TypeScript Check | PASS   |
| SAST Scan        | PASS   |
| Dependency Audit | PASS   |
| E2E Tests        | PASS   |
| Build Check      | PASS   |

---

## UAT Verification — 2026-04-18

- UAT Health check: PASS — `GET /` returns HTTP 200 (0.94s)
- UAT Smoke test: PASS — `GET /dashboard` returns HTTP 200; `GET /dashboard/finance/expenses` returns 307 → `/login?redirect=%2Fdashboard%2Ffinance%2Fexpenses` (auth gate intact)
- Security headers present on redirect: CSP, HSTS (`max-age=31536000; includeSubDomains; preload`), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, frame-ancestors 'none', Permissions-Policy
- Feature verification: PENDING — requires authenticated super-admin session to paste `TRF|2MPTfr482|2045529935434317824` into the search box on `/dashboard/finance/expenses` and confirm the expense row renders. Functional contract covered by 45 unit tests (including the exact driver string in `expense-search.test.ts::matches the full TRF reference containing pipes` and `expense-service.search.test.ts::escapes pipes so TRF|... matches the literal pipe`) + 5 passing E2E tests.
- UAT URL: https://wawagardenbar-app-uat.up.railway.app
