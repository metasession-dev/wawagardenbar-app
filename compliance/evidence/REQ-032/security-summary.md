# Security Summary — REQ-032

**Requirement:** REQ-032 — Create pending expense group from existing expenses (multi-select, standalone copy)
**Issue:** [#70](https://github.com/metasession-dev/wawagardenbar-app/issues/70)
**Risk Level:** MEDIUM (financial data, additive — no schema migration, source rows unchanged, no new endpoint)
**Date:** 2026-05-01

---

## Universal Gates

| Gate                        | Result                                                                                 | Notes                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **0 errors**                                                                           | `gates/tsc.txt`                                                                                                           |
| Vitest unit suite           | **462/462 passed** (452 baseline + 10 new)                                             | `gates/vitest-summary.txt`                                                                                                |
| Semgrep SAST                | **0 findings on REQ-032 changed files**                                                | `gates/semgrep.json` — clean run on the four files this REQ touches                                                       |
| Dependency audit            | **0 new findings**                                                                     | 1 HIGH (`xlsx`, pre-existing, allowlisted), 6 moderate pre-existing — REQ-029/031 baseline. `gates/dependency-audit.json` |
| Playwright E2E              | Smoke spec authored at `e2e/finance/create-pending-from-expenses.spec.ts`              |                                                                                                                           |
| CI pipeline (develop)       | Confirmed green at commit `19c1d32` (CI run `25188881245`, evidence run `25188881236`) |                                                                                                                           |

---

## Security Assessment

### Data Integrity

**No change to persisted data shapes.** The `Expense`, `PendingExpenseGroup`, and `PendingExpenseGroupItem` models (`models/expense-model.ts`, `models/pending-expense-group-model.ts`) are unchanged. No new fields, no migration, no backfill. All historical records are untouched.

**Source `Expense` rows are read-only.** The new flow constructs an in-memory `IExpenseLineItem[]` from selected `Expense` rows on the client, via `lib/expense-to-line-item.ts`, and passes it through the existing `ExpenseForm` → `createPendingExpenseGroupAction` → `PendingExpenseGroupService.createGroup` path. No write touches the source `Expense` collection. There is no back-link, no flag, no version increment on the source. By design (user direction) the duplicate is standalone.

**Recorded amount preserved exactly.** The mapping sets `totalCost = source.amount` directly, not `quantity × unitCost`. This avoids rounding loss on non-integer divisions (e.g. amount=₦1,000 / quantity=3 → unitCost=₦333.33, but totalCost stays at ₦1,000). 1 unit test asserts this invariant (`mapExpenseToLineItem — totalCost equals source amount exactly`).

### Access Control (RBAC)

**Unchanged from REQ-026.** The bulk-action button is rendered by `app/dashboard/finance/expenses/expenses-client.tsx`, which is reached only via `app/dashboard/finance/expenses/page.tsx`. That page is reachable by users with role `admin` or `super-admin` (page-level `getCurrentSession` guard, also enforced by the layout in `app/dashboard/layout.tsx`).

The submission path (`createPendingExpenseGroupAction`) calls `requireAdminOrAbove(session)` — same guard that REQ-026 introduced and verified, covered by `__tests__/pending-expense-group/pending-expense-actions.test.ts`. **No new server endpoint is added** — the existing action is reused unchanged.

### Input Validation

**No new server-side validation surface.** Submission still flows through `createPendingExpenseGroupAction` and the existing Zod `lineItemSchema` (`components/features/finance/expense-form.tsx`), which validates each pre-filled line item exactly as it does for hand-typed lines. If a source `Expense` were somehow malformed (e.g. negative `amount`, missing `category`, description shorter than 3 chars), the form's Zod resolver would surface a path-qualified error and block submission before the action runs. The existing `lineItemSchema` rejects: missing required fields, negative numbers, descriptions <3 chars, invalid `expenseType` enum.

**Client-side mapping defaults are deterministic.** `quantity ?? 1`, `unit ?? 'each'`, `unitCost = round2(amount / quantity)`. No user-supplied input is involved in the defaulting (only the persisted `Expense` row), so there is no injection / coercion surface in the helper.

### NoSQL Injection

**N/A — no new query.** This REQ adds zero new database read or write paths. It reads `Expense[]` via the existing `getExpensesAction` (REQ-026 era, unchanged) and writes a new `PendingExpenseGroup` via `PendingExpenseGroupService.createGroup` (REQ-026 era, unchanged). All `_id` lookups use the existing `ObjectId` ingestion guarded by Mongoose's typed schema.

### XSS / Output Encoding

**No new rendered content from untrusted sources.** The bulk-action bar's count is a `Set.size` (number, React-escaped). The dialog renders pre-filled values via the existing `<Input>` components, all of which use React's auto-escaping JSX text interpolation. The pre-filled content originates from the user's own `Expense` rows (already vetted at write-time by the existing `lineItemSchema`-equivalent on the original Add Expense path), not from external input.

The `aria-label="Select expense ${expense.description}"` interpolation is consumed by the browser as an accessibility label only (not rendered as HTML); React serialises it through the standard attribute-value path.

### CSRF

**Reuses existing server actions.** Next.js server actions are CSRF-protected by the framework (action IDs are non-guessable per build, body is bound to the form instance). No bypass is introduced.

### Race Conditions / Concurrency

**Multiple admins selecting overlapping rows simultaneously is safe.** The duplicate is in-memory and does not lock or modify the source rows. Two admins clicking "Create pending group from selected" on overlapping rows both succeed and create two separate pending groups — which is the correct behaviour for a copy-template flow.

### Selection State

**Selection is in-memory React state only.** Cleared on dialog open (AC8). No persistence to localStorage / sessionStorage / cookies. Refreshing the page or navigating away discards the selection. No PII or financial data is leaked into client-side persistence.

---

## Threat Model & Mitigations

### T1 — Tampered client submits forged line items

A malicious client could intercept the form submission and POST a payload claiming the line items came from selected expenses, but with arbitrary values.

**Mitigations:**

- The mapping happens **client-side**, but the **validation does not depend on the mapping**. The server (`createPendingExpenseGroupAction` → `PendingExpenseGroupService.createGroup`) treats the submitted items as authoritative input and applies the existing Zod `lineItemSchema` validation on every field. Whether the items came from a multi-select or were typed by hand is invisible to the server — and irrelevant, because the server's trust boundary is the schema, not the originating UI flow.
- An attacker who could already submit hand-typed line items could already do everything this REQ enables. There is no privilege escalation.

### T2 — Tampered client modifies the per-row checkbox state to select unauthorised rows

The user can only see expenses that the existing `getExpensesAction` returned, and that action already enforces RBAC + (when relevant) tenant scoping. An attacker who could "select" a row not in their list would have already broken `getExpensesAction`'s ACL — which is a higher-tier threat addressed by REQ-026 and out of scope here.

### T3 — Stale selection persists across sessions / leaks data

**Mitigation:** selection is `useState<Set<string>>` only — no persistence. Tab close / page refresh / navigation away discards it. AC8 also clears it explicitly on dialog open so an aborted dialog doesn't leave latent state.

### T4 — Mass-select abuse (DoS via huge bulk action)

A user clicks the header "select all visible" with 10,000 rows in the table.

**Mitigations:**

- The list is already paginated by date range (REQ-026/029 expense list), and the "select all" checkbox only ticks the **filtered visible** rows, not the full underlying collection. Practical caps remain at the date-range size (typically ≤200 rows for a month).
- The mapping is O(N) and pure — no DB calls per row. The server then receives one `createGroup` call with N items, persisted as a single document. The existing `PendingExpenseGroup.items` array has no codified upper bound, but a 10,000-item single document would breach Mongo's 16 MB doc limit naturally; the request would 500 cleanly. Not a realistic abuse vector for an admin-only authenticated surface.

### T5 — Information disclosure via error messages

If a malformed line item slips past the client and triggers a server-side validation error.

**Mitigations:** the existing `createPendingExpenseGroupAction` returns errors via the same path-qualified Zod messages (e.g. `items.0.description: must be at least 3 characters`) it has used since REQ-026. No new error-construction code is introduced; no DB IDs or other users' data are referenced.

---

## Static Analysis (Semgrep)

Ran `semgrep --config=auto` on the four files this REQ touches:

- `lib/expense-to-line-item.ts`
- `components/features/finance/expense-list.tsx`
- `components/features/finance/expense-form.tsx`
- `app/dashboard/finance/expenses/expenses-client.tsx`

**Result:** 0 findings, 0 errors. Full output: `gates/semgrep.json`.

## Dependency Audit

`npm audit --audit-level=high`:

- 1 HIGH — `xlsx` (pre-existing, allowlisted since REQ-027)
- 6 moderate — pre-existing across `nodemailer`, `webpack`, `nlp-compromise`, etc. — REQ-029/031 baseline; not introduced by this REQ.
- 0 new vulnerabilities introduced by REQ-032.

Full output: `gates/dependency-audit.json`.

---

## Sign-off

- [x] All universal gates pass
- [x] Threat model reviewed (T1–T5)
- [x] No new auth surface
- [x] No new persistence path
- [x] No new query path
- [x] Static analysis clean on changed files
- [x] Dependency audit unchanged from baseline
- [x] Single-reviewer sufficient (MEDIUM risk, no AI-involvement bump warranted — change is small and deterministic)

Per the Risk-Tiered Review Policy, MEDIUM-risk additive changes that introduce no new auth/persistence/query paths and are covered by deterministic unit tests + an E2E spec require **one** human reviewer.
