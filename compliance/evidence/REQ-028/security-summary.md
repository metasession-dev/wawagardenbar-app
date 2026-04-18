# Security Summary — REQ-028

**Requirement:** REQ-028
**Issue:** #62
**Risk Level:** MEDIUM
**Date:** 2026-04-18

---

## Security Assessment

### Data Integrity

**No change to persisted expense records.** `IExpense.category` remains a plain string; no new subcategory or group field was added to `models/expense-model.ts` or the pending-expense-group model. Historical records, reports, and aggregates are untouched.

**Extended SystemSettings value only.** The existing `SystemSettings` document for `key: 'expense-categories'` gains two optional arrays (`directCostGroups`, `operatingExpenseGroups`). `value` is `Schema.Types.Mixed`, so no schema migration was required. Documents written before this change load with empty group arrays (`getExpenseCategories` normalises missing keys to `[]`) — covered by the backward-compat unit test.

**Change history preserved.** `updateExpenseCategories` continues to append the full saved value to `changeHistory` on every save, including the new group arrays, so audit trail is intact.

### Access Control (RBAC)

**Read categories (public-to-admin authenticated):** `getExpenseCategoriesAction` is an authenticated server action used by the Add/Edit Expense forms. Exposure matches the pre-change behaviour.

**Write categories (super-admin only):** `updateExpenseCategoriesAction` retains its existing `requireSuperAdmin()` guard. Non-super-admins cannot configure groups. No new endpoints introduced.

**Validation on both client and server.** Settings form uses Zod `superRefine` → `validateGroups` (client). `SystemSettingsService.updateExpenseCategories` calls the same `validateGroups` helper (server) before persistence. Validation checks: duplicate group names (case-insensitive), cross-group category membership, blank group names, categoryName referential integrity. Server-side check is the authoritative one — a crafted client payload that bypasses the form cannot corrupt the document.

### Input Validation

The extended `ExpenseCategoriesSettings` payload is type-checked at the server action boundary and re-validated in the service. Group names and category names are strings; no interpolation into regex, DB queries, or shell commands. All Mongoose writes use typed models.

### NoSQL Injection

No user-derived filters introduced. `findOneAndUpdate({ key: 'expense-categories' }, …)` filter is a static literal. Values in the `$set`/`$push` payload are already typed by the Zod schema.

### XSS / Output Encoding

Group names and category names are rendered via React text nodes (JSX interpolation), which automatically HTML-escapes. No `dangerouslySetInnerHTML` or string concatenation into innerHTML. The Shadcn `Badge` and `SelectLabel` components render strings as text content.

### Consistency

`expense-form.tsx` (Add Expense) and `edit-expense-dialog.tsx` (Edit Expense) share the same `buildDropdownSections` helper for rendering — no divergent behaviour. The Settings Groups editor uses the same `validateGroups` helper, preventing client/server drift.

---

## Static Analysis (Semgrep)

**Status:** PASS

Semgrep auto-config (202 rules) over the 7 touched files: **0 findings**. No new SAST issues introduced.

---

## Dependency Audit (npm audit)

**Status:** PASS

No new dependencies added. Baseline `xlsx` high-severity vulnerability is pre-existing and explicitly allowlisted in `.github/workflows/ci.yml` (`ACCEPTED="xlsx"`). A moderate `dompurify` finding is below the `high` threshold required by the gate.

---

## CI Gate Results

**CI Run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24600465349
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

- UAT Health check: PASS — `GET /` returns HTTP 200 (0.75s)
- UAT Smoke test: PASS — `/dashboard` returns 307 → `/login?redirect=%2Fdashboard` (auth gate intact); `/admin/login` returns HTTP 200
- Security headers present on redirect: CSP, HSTS (max-age=31536000, preload), X-Content-Type-Options, frame-ancestors 'none'
- Feature verification: PENDING — grouped dropdown requires authenticated super-admin session (manual verification). Functional contract covered by 21 unit tests + 4 passing E2E tests.
- UAT URL: https://wawagardenbar-app-uat.up.railway.app
